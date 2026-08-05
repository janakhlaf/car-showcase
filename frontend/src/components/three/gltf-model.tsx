/**
 * GLB/GLTF loader with automatic normalisation and interior-only visibility.
 */
import {
  Component,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export type ModelViewMode = "exterior" | "interior";

export interface NormalizedModelData {
  scale: number;
  offset: THREE.Vector3;
  size: THREE.Vector3;
  center: THREE.Vector3;
}

interface GltfModelProps {
  url: string;
  viewMode?: ModelViewMode;
  onReady?: (data: NormalizedModelData) => void;
}

const EXTERIOR_NAME_PARTS = [
  "mk_body",
  "mk_exterior_meshes_agg",
  "mk_tires",
  "mk_glass_red",
];

function isExteriorObject(object: THREE.Object3D): boolean {
  const objectName = object.name.toLowerCase();

  if (EXTERIOR_NAME_PARTS.some((part) => objectName.includes(part))) {
    return true;
  }

  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    return materials.some((material) => {
      const materialName = material?.name?.toLowerCase() ?? "";
      return EXTERIOR_NAME_PARTS.some((part) =>
        materialName.includes(part),
      );
    });
  }

  return false;
}

export function GltfModel({
  url,
  viewMode = "exterior",
  onReady,
}: GltfModelProps) {
  const gltf = useGLTF(url);

  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);

  const normalizedData = useMemo<NormalizedModelData>(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const originalSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(
      originalSize.x,
      originalSize.y,
      originalSize.z,
    ) || 1;

    const scale = 4.4 / maxDim;

    const offset = new THREE.Vector3(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    );

    const size = originalSize.clone().multiplyScalar(scale);

    return {
      scale,
      offset,
      size,
      center: new THREE.Vector3(0, size.y / 2, 0),
    };
  }, [cloned]);

  useEffect(() => {
  cloned.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;

    // لا نخفي أي جزء من السيارة
    child.visible = true;

    child.castShadow = viewMode === "exterior";
    child.receiveShadow = viewMode === "exterior";
  });
}, [cloned, viewMode]);

  useEffect(() => {
    onReady?.(normalizedData);
  }, [normalizedData, onReady]);

  return (
    <primitive
      object={cloned}
      scale={normalizedData.scale}
      position={normalizedData.offset}
    />
  );
}

type BoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export class ModelErrorBoundary extends Component<
  BoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError
      ? this.props.fallback
      : this.props.children;
  }
}