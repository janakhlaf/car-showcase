/**
 * ModelViewer — exterior viewer + smooth fixed-seat interior tour.
 *
 * Interior behavior:
 * - Driver / Passenger / Dashboard / Rear viewpoints
 * - Smooth transition between viewpoints
 * - Camera remains at the selected viewpoint
 * - Drag to look left/right/up/down, including behind
 * - Scroll to zoom using FOV only
 * - Rotation continues working at every zoom level
 * - The GLB remains complete; no meshes are hidden here
 */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Armchair,
  Expand,
  Gauge,
  Loader2,
  Minimize2,
  Orbit,
  Pause,
  RotateCcw,
  Scan,
  Sofa,
  UserRound,
} from "lucide-react";

import {
  GltfModel,
  ModelErrorBoundary,
  type NormalizedModelData,
} from "./gltf-model";
import { ProceduralCar } from "./procedural-car";
import { cn, toSketchfabEmbed } from "@/lib/utils";

export interface ModelViewerProps {
  sketchfabUrl?: string | null;
  modelPath?: string | null;
  color: string;
  colorName?: string;
  className?: string;
  autoRotate?: boolean;
}

type ViewMode = "exterior" | "interior";
type InteriorView = "driver" | "passenger" | "dashboard" | "rear";

type CameraPreset = {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  fov: number;
};

/* ─────────────────────────────────────────────
   Lighting
───────────────────────────────────────────── */

function StudioLighting({ interior }: { interior: boolean }) {
  return (
    <>
      <ambientLight intensity={interior ? 0.38 : 0.35} />

      <spotLight
        position={[6, 8, 5]}
        angle={0.5}
        penumbra={0.9}
        intensity={interior ? 38 : 160}
        color="#fff2dd"
        castShadow={!interior}
      />

      <spotLight
        position={[-7, 5, -6]}
        angle={0.6}
        penumbra={1}
        intensity={interior ? 22 : 70}
        color="#9db8ff"
      />

      <pointLight
        position={[0, 1.25, 0.1]}
        intensity={interior ? 2.2 : 0}
        distance={3}
        decay={2}
        color="#fff4df"
      />

      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={interior ? 1.7 : 3.5}
          position={[0, 5, 0]}
          rotation-x={Math.PI / 2}
          scale={[9, 9, 1]}
          color="#ffffff"
        />

        <Lightformer
          form="rect"
          intensity={interior ? 1.35 : 2.2}
          position={[-5, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[7, 2, 1]}
          color="#dfe8ff"
        />

        <Lightformer
          form="rect"
          intensity={interior ? 1.35 : 2.2}
          position={[5, 2, 0]}
          rotation-y={-Math.PI / 2}
          scale={[7, 2, 1]}
          color="#ffe7c2"
        />
      </Environment>
    </>
  );
}

/* ─────────────────────────────────────────────
   Exterior showroom platform
───────────────────────────────────────────── */

function Turntable({
  children,
  interior,
}: {
  children: ReactNode;
  interior: boolean;
}) {
  return (
    <group>
      {children}

      {!interior && (
        <>
          <mesh position={[0, -0.045, 0]} receiveShadow>
            <cylinderGeometry args={[3.1, 3.1, 0.09, 64]} />
            <meshStandardMaterial
              color="#101014"
              roughness={0.35}
              metalness={0.6}
            />
          </mesh>

          <mesh position={[0, 0.012, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[3.02, 0.014, 8, 96]} />
            <meshBasicMaterial color="#d9b981" toneMapped={false} />
          </mesh>

          <ContactShadows
            position={[0, 0.02, 0]}
            opacity={0.8}
            scale={11}
            blur={2.6}
            far={3.4}
            resolution={512}
            color="#000000"
          />
        </>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────
   Interior viewpoints
───────────────────────────────────────────── */

function createInteriorPresets(
  data: NormalizedModelData,
): Record<InteriorView, CameraPreset> {
  const { size } = data;

  return {
    /*
     * This GLB is right-hand drive.
     * After the current normalisation, the steering-wheel side maps to -X.
     */
    driver: {
      position: new THREE.Vector3(
        -size.x * 0.25,
        size.y * 0.66,
        size.z * 0.13,
      ),
      yaw: Math.PI,
      pitch: -0.08,
      fov: 72,
    },

    passenger: {
      position: new THREE.Vector3(
        size.x * 0.25,
        size.y * 0.66,
        size.z * 0.13,
      ),
      yaw: Math.PI,
      pitch: -0.08,
      fov: 72,
    },

    dashboard: {
      position: new THREE.Vector3(
        0,
        size.y * 0.7,
        size.z * 0.03,
      ),
      yaw: Math.PI,
      pitch: -0.16,
      fov: 68,
    },

    rear: {
      // Preserves the rear viewpoint that looked best previously.
      position: new THREE.Vector3(
        0,
        size.y * 0.66,
        -size.z * 0.24,
      ),
      yaw: Math.PI,
      pitch: -0.06,
      fov: 70,
    },
  };
}

/* ─────────────────────────────────────────────
   Smooth fixed-seat interior camera
───────────────────────────────────────────── */

function InteriorSeatCamera({
  active,
  view,
  modelData,
}: {
  active: boolean;
  view: InteriorView;
  modelData: NormalizedModelData | null;
}) {
  const { camera, gl } = useThree();

  const presets = useMemo(
    () => (modelData ? createInteriorPresets(modelData) : null),
    [modelData],
  );

  const desiredPosition = useRef(new THREE.Vector3());
  const desiredYaw = useRef(Math.PI);
  const desiredPitch = useRef(0);
  const desiredFov = useRef(72);

  const currentYaw = useRef(Math.PI);
  const currentPitch = useRef(0);
  const currentFov = useRef(72);

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!active || !presets) return;

    const preset = presets[view];

    desiredPosition.current.copy(preset.position);
    desiredYaw.current = preset.yaw;
    desiredPitch.current = preset.pitch;
    desiredFov.current = preset.fov;

    /*
     * When entering the interior for the first time, start from the selected
     * seat immediately enough to avoid showing an outside frame, while the
     * following frame loop still gives a smooth seat-to-seat transition.
     */
    if (!Number.isFinite(camera.position.x)) {
      camera.position.copy(preset.position);
    }
  }, [active, view, presets, camera]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;

    const onPointerDown = (event: PointerEvent) => {
      dragging.current = true;
      lastPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };

      canvas.setPointerCapture?.(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;

      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;

      lastPointer.current = {
        x: event.clientX,
        y: event.clientY,
      };

      // Full horizontal rotation; natural limited vertical head movement.
      desiredYaw.current -= dx * 0.0028;
      desiredPitch.current = THREE.MathUtils.clamp(
        desiredPitch.current - dy * 0.0023,
        -0.95,
        0.85,
      );
    };

    const stopDragging = (event: PointerEvent) => {
      dragging.current = false;
      canvas.releasePointerCapture?.(event.pointerId);
      canvas.style.cursor = "grab";
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      /*
       * Optical zoom only:
       * lower FOV = zoom in
       * higher FOV = zoom out
       *
       * The camera position never leaves the selected seat.
       */
      desiredFov.current = THREE.MathUtils.clamp(
        desiredFov.current + event.deltaY * 0.028,
        42,
        98,
      );
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.style.cursor = "";
      canvas.style.touchAction = "";

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", stopDragging);
      canvas.removeEventListener("pointercancel", stopDragging);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [active, gl]);

  useFrame((_, delta) => {
    if (!active || !presets) return;

    const perspectiveCamera = camera as THREE.PerspectiveCamera;

    const positionSmoothing = 1 - Math.exp(-7 * delta);
    const rotationSmoothing = 1 - Math.exp(-9 * delta);
    const zoomSmoothing = 1 - Math.exp(-10 * delta);

    camera.position.lerp(
      desiredPosition.current,
      positionSmoothing,
    );

    currentYaw.current = THREE.MathUtils.lerp(
      currentYaw.current,
      desiredYaw.current,
      rotationSmoothing,
    );

    currentPitch.current = THREE.MathUtils.lerp(
      currentPitch.current,
      desiredPitch.current,
      rotationSmoothing,
    );

    currentFov.current = THREE.MathUtils.lerp(
      currentFov.current,
      desiredFov.current,
      zoomSmoothing,
    );

    camera.rotation.order = "YXZ";
    camera.rotation.y = currentYaw.current;
    camera.rotation.x = currentPitch.current;
    camera.rotation.z = 0;

    perspectiveCamera.fov = currentFov.current;
    perspectiveCamera.near = 0.01;
    perspectiveCamera.updateProjectionMatrix();
  });

  return null;
}

/* ─────────────────────────────────────────────
   Main viewer
───────────────────────────────────────────── */

export function ModelViewer({
  sketchfabUrl,
  modelPath,
  color,
  colorName,
  className,
  autoRotate = true,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [rotating, setRotating] = useState(autoRotate);
  const [resetKey, setResetKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("exterior");
  const [interiorView, setInteriorView] = useState<InteriorView>("driver");
  const [modelData, setModelData] = useState<NormalizedModelData | null>(null);

  const embedUrl = useMemo(
    () => (sketchfabUrl ? toSketchfabEmbed(sketchfabUrl) : null),
    [sketchfabUrl],
  );

  const mode: "sketchfab" | "gltf" | "procedural" = embedUrl
    ? "sketchfab"
    : modelPath
      ? "gltf"
      : "procedural";

  const isInterior = viewMode === "interior";

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onChange);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen unsupported.
    }
  };

  const switchToExterior = () => {
    setViewMode("exterior");
    setRotating(false);
    setResetKey((key) => key + 1);
  };

  const switchToInterior = () => {
    setRotating(false);
    setInteriorView("driver");
    setViewMode("interior");
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/viewer relative w-full overflow-hidden rounded-2xl border border-white/10",
        isInterior
          ? "bg-[#07080a]"
          : "bg-[radial-gradient(120%_90%_at_50%_20%,#17171d_0%,#0a0a0d_55%,#050507_100%)]",
        "[&:fullscreen]:rounded-none",
        className,
      )}
    >
      {mode === "gltf" && (
        <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={switchToExterior}
            className={cn(
              "glass flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold tracking-[0.12em] uppercase transition-colors",
              viewMode === "exterior"
                ? "border-champagne-400/60 text-champagne-300"
                : "border-white/10 text-zinc-300 hover:text-white",
            )}
          >
            <Scan className="size-4" />
            Exterior
          </button>

          <button
            type="button"
            onClick={switchToInterior}
            className={cn(
              "glass flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold tracking-[0.12em] uppercase transition-colors",
              isInterior
                ? "border-champagne-400/60 text-champagne-300"
                : "border-white/10 text-zinc-300 hover:text-white",
            )}
          >
            <Armchair className="size-4" />
            Interior
          </button>
        </div>
      )}

      {mode === "sketchfab" ? (
        <>
          {!frameLoaded && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <Loader2
                className="size-7 animate-spin text-champagne-400"
                aria-hidden
              />
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
        <Canvas
          key={resetKey}
          shadows={!isInterior}
          dpr={[1, 1.75]}
          camera={{
            position: [5.6, 2.1, 5.6],
            fov: isInterior ? 72 : 36,
            near: 0.01,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: true,
          }}
        >
          <color
            attach="background"
            args={[isInterior ? "#07080a" : "#050507"]}
          />

          <StudioLighting interior={isInterior} />

          <Suspense fallback={null}>
            <Turntable interior={isInterior}>
              {mode === "gltf" && modelPath ? (
                <ModelErrorBoundary fallback={<ProceduralCar color={color} />}>
                  <GltfModel
                    url={modelPath}
                    viewMode={viewMode}
                    onReady={setModelData}
                  />
                </ModelErrorBoundary>
              ) : (
                <ProceduralCar color={color} />
              )}
            </Turntable>
          </Suspense>

          {!isInterior && (
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
          )}

          <InteriorSeatCamera
            active={isInterior}
            view={interiorView}
            modelData={modelData}
          />
        </Canvas>
      )}

      {isInterior && mode === "gltf" && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/55 p-2 backdrop-blur-xl">
          {[
            { id: "driver" as const, label: "Driver", icon: UserRound },
            { id: "passenger" as const, label: "Passenger", icon: Armchair },
            { id: "dashboard" as const, label: "Dashboard", icon: Gauge },
            { id: "rear" as const, label: "Rear", icon: Sofa },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setInteriorView(id)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4",
                interiorView === id
                  ? "bg-white text-black"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="glass pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2.5 rounded-full px-4 py-2">
        <span
          className="size-3 rounded-full ring-2 ring-white/20"
          style={{ backgroundColor: color }}
          aria-hidden
        />

        <span className="text-[11px] font-semibold tracking-[0.18em] text-zinc-300 uppercase">
          {isInterior ? "Interior Tour" : "Interactive 3D"}
          {colorName ? ` · ${colorName}` : ""}
        </span>

        <span
          className="animate-pulse-slow size-1.5 rounded-full bg-champagne-400"
          aria-hidden
        />
      </div>

      <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden text-[11px] tracking-[0.14em] text-zinc-500 uppercase sm:block">
        {mode === "sketchfab"
          ? "Drag to rotate · Scroll to zoom"
          : isInterior
            ? "Choose a seat · Drag to look around · Scroll to zoom"
            : "Drag to rotate · Scroll to zoom"}
      </p>

      <div className="absolute right-4 bottom-4 z-30 flex items-center gap-2">
        {mode !== "sketchfab" && !isInterior && (
          <>
            <button
              type="button"
              onClick={() => setRotating((current) => !current)}
              title={rotating ? "Pause rotation" : "Auto-rotate"}
              aria-label={
                rotating ? "Pause rotation" : "Enable auto-rotation"
              }
              className={cn(
                "glass grid size-10 place-items-center rounded-full transition-colors hover:border-champagne-400/50 hover:text-champagne-300",
                rotating ? "text-champagne-300" : "text-zinc-300",
              )}
            >
              {rotating ? (
                <Pause className="size-4" />
              ) : (
                <Orbit className="size-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setRotating(false);
                setResetKey((key) => key + 1);
              }}
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
          aria-label={
            isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
          }
          className="glass grid size-10 place-items-center rounded-full text-zinc-300 transition-colors hover:border-champagne-400/50 hover:text-champagne-300"
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Expand className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}