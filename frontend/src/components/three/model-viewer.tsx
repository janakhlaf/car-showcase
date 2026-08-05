

/**
 * ModelViewer — the universal 3D stage used across the site.
 *
 * Rendering priority:
 *   1. Sketchfab URL        → privacy-enhanced iframe embed (Embed API)
 *   2. Local GLB/GLTF path  → loaded with useGLTF, auto-normalised to stage
 *   3. Procedural fallback  → parametric GT rendered in the car's true paint
 *
 * Controls: drag to rotate · scroll/pinch to zoom · auto-rotate toggle ·
 * camera reset · native fullscreen. Fully responsive via ResizeObserver.
 */
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Expand, Loader2, Minimize2, Orbit, Pause, RotateCcw } from "lucide-react";
import { GltfModel, ModelErrorBoundary } from "./gltf-model";
import { ProceduralCar } from "./procedural-car";
import { cn, toSketchfabEmbed } from "@/lib/utils";

export interface ModelViewerProps {
  /** Sketchfab model page or embed URL (highest priority). */
  sketchfabUrl?: string | null;
  /** Root-relative GLB/GLTF path served from /public (e.g. /uploads/x.glb). */
  modelPath?: string | null;
  /** Paint hex used by the procedural model. */
  color: string;
  /** Human readable paint name, shown in the viewer chrome. */
  colorName?: string;
  className?: string;
  autoRotate?: boolean;
}

/* ── Local lighting rig (no network HDRIs — renders 100% offline) ─────── */
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight position={[6, 8, 5]} angle={0.5} penumbra={0.9} intensity={160} color="#fff2dd" castShadow />
      <spotLight position={[-7, 5, -6]} angle={0.6} penumbra={1} intensity={70} color="#9db8ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.5} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 9, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2.2} position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[7, 2, 1]} color="#dfe8ff" />
        <Lightformer form="rect" intensity={2.2} position={[5, 2, 0]} rotation-y={-Math.PI / 2} scale={[7, 2, 1]} color="#ffe7c2" />
        <Lightformer form="circle" intensity={1.4} position={[0, 3, -6]} scale={[3, 3, 1]} color="#ffffff" />
      </Environment>
    </>
  );
}

function Turntable({ children }: { children: ReactNode }) {
  return (
    <group>
      {children}
      {/* showroom plinth */}
      <mesh position={[0, -0.045, 0]} receiveShadow>
        <cylinderGeometry args={[3.1, 3.1, 0.09, 64]} />
        <meshStandardMaterial color="#101014" roughness={0.35} metalness={0.6} />
      </mesh>
      {/* champagne halo ring */}
      <mesh position={[0, 0.012, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[3.02, 0.014, 8, 96]} />
        <meshBasicMaterial color="#d9b981" toneMapped={false} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.8} scale={11} blur={2.6} far={3.4} resolution={512} color="#000000" />
    </group>
  );
}

export function ModelViewer({ sketchfabUrl, modelPath, color, colorName, className, autoRotate = true }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotating, setRotating] = useState(autoRotate);
  const [resetKey, setResetKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const embedUrl = useMemo(() => (sketchfabUrl ? toSketchfabEmbed(sketchfabUrl) : null), [sketchfabUrl]);
  const mode: "sketchfab" | "gltf" | "procedural" = embedUrl
    ? "sketchfab"
    : modelPath
      ? "gltf"
      : "procedural";

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch {
      /* fullscreen unsupported — ignore */
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/viewer relative w-full overflow-hidden rounded-2xl border border-white/10",
        "bg-[radial-gradient(120%_90%_at_50%_20%,#17171d_0%,#0a0a0d_55%,#050507_100%)]",
        "[&:fullscreen]:rounded-none",
        className,
      )}
    >
      {mode === "sketchfab" ? (
        <>
          {!frameLoaded && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <Loader2 className="size-7 animate-spin text-champagne-400" aria-hidden />
            </div>
          )}
          <iframe
            key={embedUrl!}
            title="Sketchfab 3D model"
            src={embedUrl!}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            onLoad={() => setFrameLoaded(true)}
          />
        </>
      ) : (
        <Canvas key={resetKey} shadows dpr={[1, 1.75]} camera={{ position: [5.6, 2.1, 5.6], fov: 36 }} gl={{ antialias: true, alpha: true }}>
          <StudioLighting />
          <Suspense fallback={null}>
            <Turntable>
              {mode === "gltf" && modelPath ? (
                <ModelErrorBoundary fallback={<ProceduralCar color={color} />}>
                  <GltfModel url={modelPath} />
                </ModelErrorBoundary>
              ) : (
                <ProceduralCar color={color} />
              )}
            </Turntable>
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            autoRotate={rotating}
            autoRotateSpeed={0.9}
            minDistance={3.4}
            maxDistance={10}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI - 0.05}
            target={[0, 0.55, 0]}
            enableDamping
            dampingFactor={0.06}
          />
        </Canvas>
      )}

      {/* top-left badge */}
      <div className="glass pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2.5 rounded-full px-4 py-2">
        <span className="size-3 rounded-full ring-2 ring-white/20" style={{ backgroundColor: color }} aria-hidden />
        <span className="text-[11px] font-semibold tracking-[0.18em] text-zinc-300 uppercase">
          Interactive 3D{colorName ? ` · ${colorName}` : ""}
        </span>
        <span className="animate-pulse-slow size-1.5 rounded-full bg-champagne-400" aria-hidden />
      </div>

      {/* bottom-left hint */}
      <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden text-[11px] tracking-[0.14em] text-zinc-500 uppercase sm:block">
        Drag to rotate · Scroll to zoom
      </p>

      {/* controls */}
      <div className="absolute right-4 bottom-4 z-10 flex items-center gap-2">
        {mode !== "sketchfab" && (
          <>
            <button
              type="button"
              onClick={() => setRotating((v) => !v)}
              title={rotating ? "Pause rotation" : "Auto-rotate"}
              aria-label={rotating ? "Pause rotation" : "Enable auto-rotation"}
              className={cn(
                "glass grid size-10 place-items-center rounded-full transition-colors hover:border-champagne-400/50 hover:text-champagne-300",
                rotating ? "text-champagne-300" : "text-zinc-300",
              )}
            >
              {rotating ? <Pause className="size-4" /> : <Orbit className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setResetKey((k) => k + 1)}
              title="Reset camera"
              aria-label="Reset camera"
              className="glass grid size-10 place-items-center rounded-full text-zinc-300 transition-colors hover:border-champagne-400/50 hover:text-champagne-300"
            >
              <RotateCcw className="size-4" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="glass grid size-10 place-items-center rounded-full text-zinc-300 transition-colors hover:border-champagne-400/50 hover:text-champagne-300"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
        </button>
      </div>
    </div>
  );
}
