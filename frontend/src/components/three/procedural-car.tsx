

/**
 * ProceduralCar — a fully parametric grand-tourer built from Three.js
 * primitives. The paint `color` prop is bound to the car's `color_hex`
 * column so every vehicle renders in its true factory finish.
 *
 * The body is an extruded side-profile silhouette (long hood, fastback
 * roofline) with clearcoat paint physics, an inset glass canopy, 10-spoke
 * forged wheels with brakes, aero details and emissive light bars.
 */
import { useMemo } from "react";
import * as THREE from "three";

function makeBodyGeometry(): THREE.ExtrudeGeometry {
  // Side silhouette: x = length axis, y = height. Length ≈ 4.7m.
  const s = new THREE.Shape();
  s.moveTo(-2.28, 0.58); // rear lower edge
  s.lineTo(-2.38, 0.74); // rear bumper
  s.lineTo(-2.32, 1.0); // rear deck lid
  s.lineTo(-1.95, 1.05);
  s.lineTo(-1.3, 1.09); // fastback begins
  s.lineTo(-0.72, 1.31); // rear glass slope
  s.lineTo(0.02, 1.33); // roof crown
  s.lineTo(0.62, 1.13); // windshield rake
  s.lineTo(1.32, 1.0); // hood
  s.lineTo(2.12, 0.86); // nose top
  s.lineTo(2.36, 0.68); // bumper top
  s.lineTo(2.38, 0.58); // bumper lip
  const geo = new THREE.ExtrudeGeometry(s, {
    steps: 1,
    depth: 1.52,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.13,
    bevelSegments: 4,
  });
  geo.translate(0, 0, -0.76);
  return geo;
}

function makeGlassGeometry(): THREE.ExtrudeGeometry {
  // Inset canopy: windshield → roof glass → fastback rear glass.
  const s = new THREE.Shape();
  s.moveTo(0.56, 1.14);
  s.lineTo(0.02, 1.335);
  s.lineTo(-0.76, 1.325);
  s.lineTo(-1.26, 1.105);
  const geo = new THREE.ExtrudeGeometry(s, {
    steps: 1,
    depth: 1.26,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.63);
  return geo;
}

function Spokes({ side }: { side: 1 | -1 }) {
  const angles = [0, 36, 72, 108, 144];
  return (
    <group position={[0, 0, side * 0.115]}>
      {angles.map((deg) => (
        <mesh key={deg} rotation={[0, 0, THREE.MathUtils.degToRad(deg)]} castShadow>
          <boxGeometry args={[0.34, 0.05, 0.035]} />
          <meshStandardMaterial color="#c9ccd4" metalness={0.95} roughness={0.25} />
        </mesh>
      ))}
      {/* centre cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 20]} />
        <meshStandardMaterial color="#d9b981" metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Wheel({ x, z, side }: { x: number; z: number; side: 1 | -1 }) {
  return (
    <group position={[x, 0.37, z]}>
      {/* tyre */}
      <mesh castShadow>
        <torusGeometry args={[0.26, 0.115, 14, 36]} />
        <meshStandardMaterial color="#0b0b0c" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* brake disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.2, 24]} />
        <meshStandardMaterial color="#585c63" metalness={0.9} roughness={0.35} />
      </mesh>
      {/* brake caliper — champagne accent */}
      <mesh position={[0.14, 0.02, side * 0.1]}>
        <boxGeometry args={[0.07, 0.14, 0.045]} />
        <meshStandardMaterial color="#d9b981" metalness={0.6} roughness={0.3} />
      </mesh>
      <Spokes side={side} />
    </group>
  );
}

export function ProceduralCar({ color }: { color: string }) {
  const bodyGeo = useMemo(makeBodyGeometry, []);
  const glassGeo = useMemo(makeGlassGeometry, []);

  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.42,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.15,
      }),
    [color],
  );
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0a0d12",
        metalness: 0.35,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.7,
      }),
    [],
  );
  const carbon = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#101013", roughness: 0.55, metalness: 0.45 }),
    [],
  );

  const archPositions: Array<[number, number]> = [
    [1.48, 0.9],
    [1.48, -0.9],
    [-1.45, 0.9],
    [-1.45, -0.9],
  ];

  return (
    <group>
      {/* main body shell */}
      <mesh geometry={bodyGeo} material={paint} castShadow receiveShadow />
      {/* glass canopy */}
      <mesh geometry={glassGeo} material={glass} castShadow />

      {/* wheel-arch flares */}
      {archPositions.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} material={paint} castShadow>
          <torusGeometry args={[0.46, 0.075, 10, 24, Math.PI]} />
        </mesh>
      ))}

      {/* wheels */}
      <Wheel x={1.48} z={0.84} side={1} />
      <Wheel x={1.48} z={-0.84} side={-1} />
      <Wheel x={-1.45} z={0.84} side={1} />
      <Wheel x={-1.45} z={-0.84} side={-1} />

      {/* side skirts */}
      <mesh position={[0.02, 0.335, 0]} material={carbon} castShadow>
        <boxGeometry args={[2.72, 0.16, 1.68]} />
      </mesh>
      {/* front splitter + rear diffuser */}
      <mesh position={[2.14, 0.3, 0]} material={carbon} castShadow>
        <boxGeometry args={[0.55, 0.05, 1.82]} />
      </mesh>
      <mesh position={[-2.16, 0.3, 0]} material={carbon} castShadow>
        <boxGeometry args={[0.48, 0.05, 1.74]} />
      </mesh>

      {/* active rear wing */}
      <mesh position={[-2.2, 1.14, 0]} material={carbon} castShadow>
        <boxGeometry args={[0.26, 0.035, 1.6]} />
      </mesh>
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[-2.14, 1.07, z]} material={carbon}>
          <boxGeometry args={[0.09, 0.12, 0.05]} />
        </mesh>
      ))}

      {/* side mirrors */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.52, 1.08, s * 0.92]}>
          <mesh material={paint} castShadow>
            <boxGeometry args={[0.07, 0.035, 0.1]} />
          </mesh>
          <mesh position={[0, 0.05, s * 0.06]} material={paint} castShadow>
            <boxGeometry args={[0.13, 0.07, 0.14]} />
          </mesh>
        </group>
      ))}

      {/* LED light bars */}
      <mesh position={[2.33, 0.78, 0]}>
        <boxGeometry args={[0.06, 0.05, 1.42]} />
        <meshBasicMaterial color="#cfe7ff" toneMapped={false} />
      </mesh>
      <mesh position={[-2.35, 0.95, 0]}>
        <boxGeometry args={[0.05, 0.045, 1.5]} />
        <meshBasicMaterial color="#ff2a1f" toneMapped={false} />
      </mesh>

      {/* front intake */}
      <mesh position={[2.355, 0.62, 0]} material={carbon}>
        <boxGeometry args={[0.04, 0.12, 1.1]} />
      </mesh>
    </group>
  );
}
