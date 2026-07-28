"use client";

import { useEffect, useState } from "react";
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
  // The cursor trail means nothing until the pointer actually moves, so hold
  // its full WebGL fluid-sim init back until first interaction. Keeps that work
  // off the hydration/INP critical path — and off it entirely for the many
  // landing visitors who read and leave without ever moving the pointer.
  const [pointerActive, setPointerActive] = useState(false);

  useEffect(() => {
    const activate = (): void => setPointerActive(true);
    window.addEventListener("pointermove", activate, { once: true });
    window.addEventListener("pointerdown", activate, { once: true });
    return () => {
      window.removeEventListener("pointermove", activate);
      window.removeEventListener("pointerdown", activate);
    };
  }, []);

  return (
    <>
      <StraightenThread />
      {pointerActive ? <SplashCursor /> : null}
    </>
  );
}
