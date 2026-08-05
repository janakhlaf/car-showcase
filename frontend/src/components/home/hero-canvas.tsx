/**
 * HeroCanvas — the interactive cinematic 3D stage behind the homepage hero.
 *
 * Camera behaviour (all damped for butter-smooth motion):
 *   · scroll progress  → cinematic dolly: wide opening shot → close-up
 *   · cursor position  → azimuth/elevation parallax around the turntable
 *   · "View 360°"      → continuous cinematic spin
 *   · touch devices    → gentle autoplay spin instead of cursor rig
 *
 * Lighting: procedural HDR-style environment (Lightformers rendered into a
 * local env map — zero network fetch), warm key + cool rim spotlights with
 * shadows, a reflective showroom floor (MeshReflectorMaterial), cinematic
 * fog falloff and emissive floor rings.
 *
 * Hotspots: pulsing HTML markers + generous invisible raycast hit zones at
 * the headlights, front wheel and cockpit; clicks bubble up to the hero UI.
 */
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";
import { Armchair, Circle, Lightbulb } from "lucide-react";
import type { CarWithBrand } from "@/db/schema";
import { ProceduralCar } from "@/components/three/procedural-car";
import { GltfModel, ModelErrorBoundary } from "@/components/three/gltf-model";
import { cn } from "@/lib/utils";

export type HotspotId = "headlights" | "wheels" | "interior";

interface Vec2 {
  x: number;
  y: number;
}

export interface HeroCanvasProps {
  car: CarWithBrand;
  /** Scroll progress 0..1, written by the DOM layer via useScroll. */
  progress: { current: number };
  /** Normalised cursor (-1..1), shared with the DOM parallax layer. */
  mouse: { current: Vec2 };
  spinning: boolean;
  /** Coarse pointer / small viewport — disables cursor rig, enables autospin. */
  coarse: boolean;
  reduced: boolean;
  activeHotspot: HotspotId | null;
  onHotspot: (id: HotspotId | null) => void;
  onCreated: () => void;
}

/* ── Camera rig ───────────────────────────────────────────────────────── */
function CameraRig({
  progress,
  mouse,
  spinning,
  coarse,
  reduced,
}: Pick<HeroCanvasProps, "progress" | "mouse" | "spinning" | "coarse" | "reduced">) {
  const spinOffset = useRef(0);
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const m = coarse || reduced ? { x: 0, y: 0 } : mouse.current;

    spinOffset.current += delta * (spinning ? 0.55 : coarse && !reduced ? 0.22 : 0);

    // Scroll-driven cinematic dolly: wide 3/4 front → intimate close-up.
    const radius = THREE.MathUtils.lerp(8.4, 4.0, eased);
    const height = THREE.MathUtils.lerp(2.7, 1.38, eased) + m.y * -0.3;
    const azimuth = THREE.MathUtils.lerp(-0.45, 0.92, eased) + m.x * 0.55 + spinOffset.current;

    target.current.set(Math.sin(azimuth) * radius, Math.max(0.55, height), Math.cos(azimuth) * radius);
    const k = 1 - Math.exp(-(reduced ? 9 : 3.4) * delta);
    state.camera.position.lerp(target.current, k);
    state.camera.lookAt(0, THREE.MathUtils.lerp(0.55, 0.95, eased), 0);
  });
  return null;
}

/* ── Subtle car idle motion (sway + cursor-following turn) ────────────── */
function CarMotion({
  mouse,
  reduced,
  children,
}: {
  mouse: { current: Vec2 };
  reduced: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    const m = reduced ? { x: 0, y: 0 } : mouse.current;
    const targetY = m.x * 0.22 + Math.sin(state.clock.elapsedTime * 0.35) * 0.03;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 3, delta);
    group.position.y = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.55) * 0.015;
  });
  return <group ref={ref}>{children}</group>;
}

/* ── Hotspot marker (DOM projected from 3D space) ─────────────────────── */
const HOTSPOTS: Array<{
  id: HotspotId;
  position: [number, number, number];
  boxPosition: [number, number, number];
  boxSize: [number, number, number];
  icon: typeof Lightbulb;
  label: string;
}> = [
  {
    id: "headlights",
    position: [2.28, 0.92, 0.62],
    boxPosition: [2.14, 0.8, 0],
    boxSize: [0.85, 0.55, 1.75],
    icon: Lightbulb,
    label: "Explore the headlights",
  },
  {
    id: "wheels",
    position: [1.48, 0.44, 1.12],
    boxPosition: [1.48, 0.4, 0.86],
    boxSize: [0.75, 0.9, 0.7],
    icon: Circle,
    label: "View wheel specifications",
  },
  {
    id: "interior",
    position: [-0.1, 1.52, 0.32],
    boxPosition: [-0.15, 1.18, 0],
    boxSize: [1.6, 0.5, 1.35],
    icon: Armchair,
    label: "Preview the interior",
  },
];

function Hotspot({
  def,
  active,
  onSelect,
}: {
  def: (typeof HOTSPOTS)[number];
  active: boolean;
  onSelect: (id: HotspotId | null) => void;
}) {
  const Icon = def.icon;
  return (
    <>
      {/* invisible raycast hit-zone on the car part itself */}
      <mesh
        position={def.boxPosition}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(active ? null : def.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={def.boxSize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* visible pulsing marker, projected into screen space */}
      <Html position={def.position} center zIndexRange={[20, 0]} style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          aria-label={def.label}
          aria-pressed={active}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(active ? null : def.id);
          }}
          className={cn(
            "group relative grid size-9 place-items-center rounded-full border backdrop-blur-md transition-all duration-300",
            active
              ? "scale-110 border-champagne-300 bg-champagne-400 text-obsidian-950 shadow-[0_0_28px_-4px_rgba(217,185,129,0.8)]"
              : "border-champagne-400/40 bg-obsidian-950/50 text-champagne-300 hover:scale-110 hover:bg-champagne-400/20",
          )}
        >
          {!active && (
            <span className="absolute inset-0 animate-ping rounded-full border border-champagne-400/40" aria-hidden />
          )}
          <Icon className="relative size-4" strokeWidth={1.75} />
          <span className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full border border-white/10 bg-obsidian-950/90 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap text-zinc-300 uppercase opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
            {def.id}
          </span>
        </button>
      </Html>
    </>
  );
}

/* ── Showroom lighting + floor ────────────────────────────────────────── */
function StudioEnvironment({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <fog attach="fog" args={["#050507", 13, 32]} />
      <ambientLight intensity={0.22} />
      <spotLight
        position={[6, 9, 4]}
        angle={0.45}
        penumbra={0.9}
        intensity={220}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[lowPower ? 512 : 1024, lowPower ? 512 : 1024]}
        shadow-bias={-0.0002}
      />
      <spotLight position={[-8, 6, -6]} angle={0.55} penumbra={1} intensity={90} color="#8fb0ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2.4} position={[-5, 2.4, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} color="#dfe8ff" />
        <Lightformer form="rect" intensity={2.4} position={[5, 2.4, 0]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} color="#ffe7c2" />
        <Lightformer form="circle" intensity={1.6} position={[0, 3.5, -6]} scale={[3, 3, 1]} color="#ffffff" />
      </Environment>

      {/* reflective showroom floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[280, 70]}
          resolution={lowPower ? 256 : 640}
          mixBlur={0.9}
          mixStrength={6}
          roughness={0.9}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#07070a"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      {/* emissive floor rings — turntable glow */}
      {[3.05, 3.7].map((r, i) => (
        <mesh key={r} position={[0, 0.012 + i * 0.002, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[r, 0.012, 8, 96]} />
          <meshBasicMaterial color="#d9b981" transparent opacity={i === 0 ? 0.9 : 0.22} toneMapped={false} />
        </mesh>
      ))}

      <ContactShadows position={[0, 0.02, 0]} opacity={0.85} scale={10} blur={2.2} far={3.5} resolution={512} color="#000000" />
    </>
  );
}

export default function HeroCanvas({
  car,
  progress,
  mouse,
  spinning,
  coarse,
  reduced,
  activeHotspot,
  onHotspot,
  onCreated,
}: HeroCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={coarse ? [1, 1.4] : [1, 1.6]}
      camera={{ position: [-3.66, 2.7, 7.57], fov: 34, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={onCreated}
      onPointerMissed={() => onHotspot(null)}
      aria-hidden
    >
      <StudioEnvironment lowPower={coarse} />
      <CameraRig progress={progress} mouse={mouse} spinning={spinning} coarse={coarse} reduced={reduced} />

      <Suspense fallback={null}>
        <CarMotion mouse={mouse} reduced={reduced}>
          {car.modelPath ? (
            <ModelErrorBoundary fallback={<ProceduralCar color={car.colorHex} />}>
              <GltfModel url={car.modelPath} />
            </ModelErrorBoundary>
          ) : (
            <ProceduralCar color={car.colorHex} />
          )}

          {HOTSPOTS.map((def) => (
            <Hotspot key={def.id} def={def} active={activeHotspot === def.id} onSelect={onHotspot} />
          ))}
        </CarMotion>
      </Suspense>
    </Canvas>
  );
}
