"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D").then((m) => m.Scene3D), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div className="fixed inset-0 -z-10 bg-linear-to-b from-navy via-[#0f2847] to-navy">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-mint/10 via-transparent to-transparent" />
    </div>
  );
}

export function Scene3DWrapper() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.innerWidth < 768;
    setEnabled(!prefersReducedMotion && !isMobile);
  }, []);

  if (!enabled) {
    return <SceneFallback />;
  }

  return (
    <Suspense fallback={<SceneFallback />}>
      <Scene3D />
    </Suspense>
  );
}

export { SceneFallback };
