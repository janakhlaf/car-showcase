/**
 * React Three Fiber v9 no longer augments the global JSX namespace
 * automatically — extend it once here for the whole project.
 */
import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

export {};
