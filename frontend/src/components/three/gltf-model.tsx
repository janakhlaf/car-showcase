

/**
 * Shared GLB/GLTF loading primitives used by both the ModelViewer stage
 * and the interactive hero. Models are cloned once, auto-normalised to a
 * consistent stage footprint (4.4m long edge, grounded at y=0), and given
 * shadow flags.
 */
import { Component, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export function GltfModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z, size.y) || 1;
    const s = 4.4 / maxDim;
    return { scale: s, offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s) };
  }, [cloned]);

  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [cloned]);

  return <primitive object={cloned} scale={scale} position={offset} />;
}

type BoundaryProps = { fallback: ReactNode; children: ReactNode };

/** Falls back gracefully when a remote/local GLB fails to parse or load. */
export class ModelErrorBoundary extends Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
