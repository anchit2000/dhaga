"use client";

import { createContext, useContext } from "react";
import type { SttEngine } from "@/lib/repo/settings";

const SttEngineContext = createContext<SttEngine>("browser");

/** Server-fetched once in the app layout, read by every useDictation() call
 *  site without threading a prop through unrelated component trees. */
export function SttEngineProvider({
  engine,
  children,
}: {
  engine: SttEngine;
  children: React.ReactNode;
}) {
  return <SttEngineContext.Provider value={engine}>{children}</SttEngineContext.Provider>;
}

export function useSttEngine(): SttEngine {
  return useContext(SttEngineContext);
}
