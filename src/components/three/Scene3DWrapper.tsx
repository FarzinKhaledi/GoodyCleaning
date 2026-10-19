"use client";

import { Suspense, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D").then((m) => m.Scene3D), {
  ssr: false,
  loading: () => <SceneFallback />,
});

const sceneMediaQuery = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

function subscribeToScenePreference(onChange: () => void) {
  const preference = window.matchMedia(sceneMediaQuery);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function getScenePreference() {
  return window.matchMedia(sceneMediaQuery).matches;
}

function getServerScenePreference() {
  return false;
}

function SceneFallback() {
  return (
    <div className="fixed inset-0 -z-10 bg-linear-to-b from-navy via-[#0f2847] to-navy">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-mint/10 via-transparent to-transparent" />
    </div>
  );
}

export function Scene3DWrapper() {
  const enabled = useSyncExternalStore(
    subscribeToScenePreference,
    getScenePreference,
    getServerScenePreference
  );

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
