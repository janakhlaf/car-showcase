

import type { ReactNode } from "react";
import { Toaster } from "sonner";

/** Client-side providers: toast notifications + future context. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(14,14,18,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            color: "#f4f4f5",
          },
        }}
      />
    </>
  );
}
