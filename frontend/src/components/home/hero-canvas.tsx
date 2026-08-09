/**
 * HeroCanvas — the interactive cinematic 3D stage behind the homepage hero.
 *
 * Real model:
 * BYD Atto 2 Beige
 *
 * Camera behaviour:
 * - Scroll progress → cinematic zoom
 * - Cursor position → camera parallax
 * - View 360° → continuous spin
 * - Touch devices → gentle autoplay
 */

import {
  Suspense,
  useRef,
  type ReactNode,
} from "react";

import * as THREE from "three";

import {
  Canvas,
  useFrame,
} from "@react-three/fiber";

import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";

import {
  Armchair,
  Circle,
  Lightbulb,
} from "lucide-react";

import type { CarWithBrand } from "@/db/schema";

import {
  GltfModel,
  ModelErrorBoundary,
} from "@/components/three/gltf-model";

import { cn } from "@/lib/utils";


/* =========================================================
   HERO MODEL
========================================================= */

/**
 * Real BYD Atto 2 Beige model
 *
 * Physical file:
 * C:\xampp\htdocs\car-storage\models\car beige1.glb
 *
 * Browser URL:
 * http://localhost/car-storage/models/car%20beige1.glb
 */

const HERO_MODEL_URL =
  "http://localhost/car-storage/models/car%20beige1.glb";


/* =========================================================
   TYPES
========================================================= */

export type HotspotId =
  | "headlights"
  | "wheels"
  | "interior";


interface Vec2 {
  x: number;
  y: number;
}


export interface HeroCanvasProps {
  car: CarWithBrand;

  /**
   * Scroll progress:
   * 0 = beginning
   * 1 = end
   */
  progress: {
    current: number;
  };

  /**
   * Mouse position:
   * x = -1 → 1
   * y = -1 → 1
   */
  mouse: {
    current: Vec2;
  };

  spinning: boolean;

  coarse: boolean;

  reduced: boolean;

  activeHotspot:
    | HotspotId
    | null;

  onHotspot: (
    id: HotspotId | null,
  ) => void;

  onCreated: () => void;
}


/* =========================================================
   CAMERA RIG
========================================================= */

function CameraRig({
  progress,
  mouse,
  spinning,
  coarse,
  reduced,
}: Pick<
  HeroCanvasProps,
  | "progress"
  | "mouse"
  | "spinning"
  | "coarse"
  | "reduced"
>) {
  const spinOffset =
    useRef(0);

  const target =
    useRef(
      new THREE.Vector3(),
    );


  useFrame(
    (state, delta) => {
      /* -----------------------------------------
         Scroll progress
      ----------------------------------------- */

      const p =
        THREE.MathUtils.clamp(
          progress.current,
          0,
          1,
        );


      /* Smooth cubic easing */

      const eased =
        p < 0.5
          ? 4 * p * p * p
          : 1 -
            Math.pow(
              -2 * p + 2,
              3,
            ) /
              2;


      /* -----------------------------------------
         Mouse movement
      ----------------------------------------- */

      const m =
        coarse || reduced
          ? {
              x: 0,
              y: 0,
            }
          : mouse.current;


      /* -----------------------------------------
         360 spin
      ----------------------------------------- */

      spinOffset.current +=
        delta *
        (
          spinning
            ? 0.55
            : coarse &&
                !reduced
              ? 0.22
              : 0
        );


      /* -----------------------------------------
         Cinematic camera distance
      ----------------------------------------- */

      const radius =
        THREE.MathUtils.lerp(
          8.4,
          4.0,
          eased,
        );


      /* -----------------------------------------
         Camera height
      ----------------------------------------- */

      const height =
        THREE.MathUtils.lerp(
          2.7,
          1.38,
          eased,
        ) +
        m.y * -0.3;


      /* -----------------------------------------
         Horizontal orbit
      ----------------------------------------- */

      const azimuth =
        THREE.MathUtils.lerp(
          -0.45,
          0.92,
          eased,
        ) +
        m.x * 0.55 +
        spinOffset.current;


      /* -----------------------------------------
         Desired camera position
      ----------------------------------------- */

      target.current.set(
        Math.sin(
          azimuth,
        ) * radius,

        Math.max(
          0.55,
          height,
        ),

        Math.cos(
          azimuth,
        ) * radius,
      );


      /* -----------------------------------------
         Smooth movement
      ----------------------------------------- */

      const k =
        1 -
        Math.exp(
          -(
            reduced
              ? 9
              : 3.4
          ) * delta,
        );


      state.camera.position.lerp(
        target.current,
        k,
      );


      /* -----------------------------------------
         Camera looks towards car
      ----------------------------------------- */

      state.camera.lookAt(
        0,

        THREE.MathUtils.lerp(
          0.55,
          0.95,
          eased,
        ),

        0,
      );
    },
  );


  return null;
}


/* =========================================================
   CAR MOTION
========================================================= */

function CarMotion({
  mouse,
  reduced,
  children,
}: {
  mouse: {
    current: Vec2;
  };

  reduced: boolean;

  children: ReactNode;
}) {
  const ref =
    useRef<THREE.Group>(
      null,
    );


  useFrame(
    (state, delta) => {
      const group =
        ref.current;


      if (!group) {
        return;
      }


      const m =
        reduced
          ? {
              x: 0,
              y: 0,
            }
          : mouse.current;


      /* -----------------------------------------
         Small rotation following cursor
      ----------------------------------------- */

      const targetY =
        m.x * 0.22 +
        Math.sin(
          state.clock
            .elapsedTime *
            0.35,
        ) *
          0.03;


      group.rotation.y =
        THREE.MathUtils.damp(
          group.rotation.y,
          targetY,
          3,
          delta,
        );


      /* -----------------------------------------
         Very subtle floating motion
      ----------------------------------------- */

      group.position.y =
        reduced
          ? 0
          : Math.sin(
              state.clock
                .elapsedTime *
                0.55,
            ) *
            0.015;
    },
  );


  return (
    <group ref={ref}>
      {children}
    </group>
  );
}


/* =========================================================
   HOTSPOTS
========================================================= */

const HOTSPOTS: Array<{
  id: HotspotId;

  position: [
    number,
    number,
    number,
  ];

  boxPosition: [
    number,
    number,
    number,
  ];

  boxSize: [
    number,
    number,
    number,
  ];

  icon:
    typeof Lightbulb;

  label: string;
}> = [
  {
    id: "headlights",

    position: [
      2.28,
      0.92,
      0.62,
    ],

    boxPosition: [
      2.14,
      0.8,
      0,
    ],

    boxSize: [
      0.85,
      0.55,
      1.75,
    ],

    icon:
      Lightbulb,

    label:
      "Explore the headlights",
  },

  {
    id: "wheels",

    position: [
      1.48,
      0.44,
      1.12,
    ],

    boxPosition: [
      1.48,
      0.4,
      0.86,
    ],

    boxSize: [
      0.75,
      0.9,
      0.7,
    ],

    icon:
      Circle,

    label:
      "View wheel specifications",
  },

  {
    id: "interior",

    position: [
      -0.1,
      1.52,
      0.32,
    ],

    boxPosition: [
      -0.15,
      1.18,
      0,
    ],

    boxSize: [
      1.6,
      0.5,
      1.35,
    ],

    icon:
      Armchair,

    label:
      "Preview the interior",
  },
];


/* =========================================================
   HOTSPOT COMPONENT
========================================================= */

function Hotspot({
  def,
  active,
  onSelect,
}: {
  def:
    (typeof HOTSPOTS)[number];

  active: boolean;

  onSelect: (
    id:
      | HotspotId
      | null,
  ) => void;
}) {
  const Icon =
    def.icon;


  return (
    <>
      {/* -----------------------------------------
          Invisible click area
      ----------------------------------------- */}

      <mesh
        position={
          def.boxPosition
        }

        onClick={(
          event,
        ) => {
          event.stopPropagation();

          onSelect(
            active
              ? null
              : def.id,
          );
        }}

        onPointerOver={(
          event,
        ) => {
          event.stopPropagation();

          document.body.style.cursor =
            "pointer";
        }}

        onPointerOut={() => {
          document.body.style.cursor =
            "auto";
        }}
      >
        <boxGeometry
          args={
            def.boxSize
          }
        />

        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={
            false
          }
        />
      </mesh>


      {/* -----------------------------------------
          Visible hotspot icon
      ----------------------------------------- */}

      <Html
        position={
          def.position
        }

        center

        zIndexRange={[
          20,
          0,
        ]}

        style={{
          pointerEvents:
            "auto",
        }}
      >
        <button
          type="button"

          aria-label={
            def.label
          }

          aria-pressed={
            active
          }

          onClick={(
            event,
          ) => {
            event.stopPropagation();

            onSelect(
              active
                ? null
                : def.id,
            );
          }}

          className={cn(
            "group relative grid size-9 place-items-center rounded-full border backdrop-blur-md transition-all duration-300",

            active
              ? "scale-110 border-champagne-300 bg-champagne-400 text-obsidian-950 shadow-[0_0_28px_-4px_rgba(217,185,129,0.8)]"
              : "border-champagne-400/40 bg-obsidian-950/50 text-champagne-300 hover:scale-110 hover:bg-champagne-400/20",
          )}
        >
          {!active && (
            <span
              className="absolute inset-0 animate-ping rounded-full border border-champagne-400/40"

              aria-hidden
            />
          )}


          <Icon
            className="relative size-4"

            strokeWidth={
              1.75
            }
          />


          <span
            className="pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full border border-white/10 bg-obsidian-950/90 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap text-zinc-300 uppercase opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100"
          >
            {def.id}
          </span>
        </button>
      </Html>
    </>
  );
}


/* =========================================================
   STUDIO ENVIRONMENT
========================================================= */

function StudioEnvironment({
  lowPower,
}: {
  lowPower: boolean;
}) {
  return (
    <>
      {/* -----------------------------------------
          Fog
      ----------------------------------------- */}

      <fog
        attach="fog"

        args={[
          "#050507",
          13,
          32,
        ]}
      />


      {/* -----------------------------------------
          Ambient light
      ----------------------------------------- */}

      <ambientLight
        intensity={
          0.22
        }
      />


      {/* -----------------------------------------
          Main warm studio light
      ----------------------------------------- */}

      <spotLight
        position={[
          6,
          9,
          4,
        ]}

        angle={
          0.45
        }

        penumbra={
          0.9
        }

        intensity={
          220
        }

        color="#fff1dc"

        castShadow

        shadow-mapSize={[
          lowPower
            ? 512
            : 1024,

          lowPower
            ? 512
            : 1024,
        ]}

        shadow-bias={
          -0.0002
        }
      />


      {/* -----------------------------------------
          Cool rim light
      ----------------------------------------- */}

      <spotLight
        position={[
          -8,
          6,
          -6,
        ]}

        angle={
          0.55
        }

        penumbra={
          1
        }

        intensity={
          90
        }

        color="#8fb0ff"
      />


      {/* -----------------------------------------
          Reflection environment
      ----------------------------------------- */}

      <Environment
        resolution={
          256
        }

        frames={
          1
        }
      >
        {/* Top light */}

        <Lightformer
          form="rect"

          intensity={
            4
          }

          position={[
            0,
            5,
            0,
          ]}

          rotation-x={
            Math.PI /
            2
          }

          scale={[
            10,
            10,
            1,
          ]}

          color="#ffffff"
        />


        {/* Left light */}

        <Lightformer
          form="rect"

          intensity={
            2.4
          }

          position={[
            -5,
            2.4,
            0,
          ]}

          rotation-y={
            Math.PI /
            2
          }

          scale={[
            8,
            2,
            1,
          ]}

          color="#dfe8ff"
        />


        {/* Right warm light */}

        <Lightformer
          form="rect"

          intensity={
            2.4
          }

          position={[
            5,
            2.4,
            0,
          ]}

          rotation-y={
            -Math.PI /
            2
          }

          scale={[
            8,
            2,
            1,
          ]}

          color="#ffe7c2"
        />


        {/* Rear circular light */}

        <Lightformer
          form="circle"

          intensity={
            1.6
          }

          position={[
            0,
            3.5,
            -6,
          ]}

          scale={[
            3,
            3,
            1,
          ]}

          color="#ffffff"
        />
      </Environment>


      {/* =================================================
          REFLECTIVE FLOOR
      ================================================= */}

      <mesh
        rotation-x={
          -Math.PI /
          2
        }

        receiveShadow
      >
        <planeGeometry
          args={[
            40,
            40,
          ]}
        />

        <MeshReflectorMaterial
          blur={[
            280,
            70,
          ]}

          resolution={
            lowPower
              ? 256
              : 640
          }

          mixBlur={
            0.9
          }

          mixStrength={
            6
          }

          roughness={
            0.9
          }

          depthScale={
            1.1
          }

          minDepthThreshold={
            0.4
          }

          maxDepthThreshold={
            1.4
          }

          color="#07070a"

          metalness={
            0.5
          }

          mirror={
            0.5
          }
        />
      </mesh>


      {/* =================================================
          GOLD TURNTABLE RINGS
      ================================================= */}

      {[
        3.05,
        3.7,
      ].map(
        (
          radius,
          index,
        ) => (
          <mesh
            key={
              radius
            }

            position={[
              0,

              0.012 +
                index *
                  0.002,

              0,
            ]}

            rotation-x={
              Math.PI /
              2
            }
          >
            <torusGeometry
              args={[
                radius,
                0.012,
                8,
                96,
              ]}
            />

            <meshBasicMaterial
              color="#d9b981"

              transparent

              opacity={
                index === 0
                  ? 0.9
                  : 0.22
              }

              toneMapped={
                false
              }
            />
          </mesh>
        ),
      )}


      {/* =================================================
          CAR SHADOW
      ================================================= */}

      <ContactShadows
        position={[
          0,
          0.02,
          0,
        ]}

        opacity={
          0.85
        }

        scale={
          10
        }

        blur={
          2.2
        }

        far={
          3.5
        }

        resolution={
          512
        }

        color="#000000"
      />
    </>
  );
}


/* =========================================================
   HERO CANVAS
========================================================= */

export default function HeroCanvas({
  car: _car,

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

      dpr={
        coarse
          ? [
              1,
              1.4,
            ]
          : [
              1,
              1.6,
            ]
      }

      camera={{
        position: [
          -3.66,
          2.7,
          7.57,
        ],

        fov: 34,

        near: 0.1,

        far: 80,
      }}

      gl={{
        antialias:
          true,

        alpha:
          true,

        powerPreference:
          "high-performance",
      }}

      onCreated={
        onCreated
      }

      onPointerMissed={() =>
        onHotspot(
          null,
        )
      }

      aria-hidden
    >
      {/* =================================================
          STUDIO
      ================================================= */}

      <StudioEnvironment
        lowPower={
          coarse
        }
      />


      {/* =================================================
          CAMERA
      ================================================= */}

      <CameraRig
        progress={
          progress
        }

        mouse={
          mouse
        }

        spinning={
          spinning
        }

        coarse={
          coarse
        }

        reduced={
          reduced
        }
      />


      {/* =================================================
          REAL BYD ATTO 2 BEIGE
      ================================================= */}

      <Suspense
        fallback={
          null
        }
      >
        <CarMotion
          mouse={
            mouse
          }

          reduced={
            reduced
          }
        >
          {/*
            No ProceduralCar here anymore.

            This loads:
            C:\xampp\htdocs\car-storage\models\car beige1.glb
          */}

          <ModelErrorBoundary
            fallback={
              null
            }
          >
            <GltfModel
              url={
                HERO_MODEL_URL
              }

              viewMode="exterior"
            />
          </ModelErrorBoundary>


          {/* =================================================
              HOTSPOTS
          ================================================= */}

          {HOTSPOTS.map(
            (
              def,
            ) => (
              <Hotspot
                key={
                  def.id
                }

                def={
                  def
                }

                active={
                  activeHotspot ===
                  def.id
                }

                onSelect={
                  onHotspot
                }
              />
            ),
          )}
        </CarMotion>
      </Suspense>
    </Canvas>
  );
}