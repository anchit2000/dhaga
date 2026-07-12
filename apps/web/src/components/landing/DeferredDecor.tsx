"use client";

import dynamic from "next/dynamic";

// Both are purely decorative (WebGL cursor trail / scroll-tied background
// thread) and client-only, so they're excluded from SSR and the initial
// bundle rather than shipping on every first load.
const SplashCursor = dynamic(
  () => import("./SplashCursor").then((mod) => mod.SplashCursor),
  { ssr: false },
);
const StraightenThread = dynamic(
  () => import("./StraightenThread").then((mod) => mod.StraightenThread),
  { ssr: false },
);

export function DeferredDecor() {
  return (
    <>
      <StraightenThread />
      <SplashCursor />
    </>
  );
}
