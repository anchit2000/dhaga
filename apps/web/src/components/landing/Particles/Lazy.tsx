"use client";

import dynamic from "next/dynamic";
import type { ParticlesProps } from "./index";

// `ogl` (WebGL) is only pulled in when this decorative field renders. Loading it
// through a Client Component wrapper (ssr:false, required by next/dynamic) keeps
// the whole ogl runtime out of the landing page's initial bundle.
const Particles = dynamic(
  () => import("./index").then((mod) => mod.Particles),
  { ssr: false },
);

export function ParticlesLazy(props: ParticlesProps): React.ReactElement {
  return <Particles {...props} />;
}
