"use client";

import { createContext, useContext, useEffect } from "react";
import type { SttEngine } from "@/lib/repo/settings";
import { ensureModelLoaded } from "./whisper-model-loader";

const SttEngineContext = createContext<SttEngine>("browser");

/** Server-fetched once in the app layout, read by every useDictation() call
 *  site without threading a prop through unrelated component trees. Also
 *  the single trigger point for prefetching the on-device Whisper model:
 *  this re-renders with a fresh `engine` both on login (server-fetched per
 *  request — layout is force-dynamic) and right after a Settings change
 *  (the server action's revalidatePath refreshes it in place), so one
 *  effect here covers both without a separate call site in Settings. */
export function SttEngineProvider({
  engine,
  children,
}: {
  engine: SttEngine;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (engine === "local" || engine === "realtime") ensureModelLoaded();
  }, [engine]);
  return <SttEngineContext.Provider value={engine}>{children}</SttEngineContext.Provider>;
}

export function useSttEngine(): SttEngine {
  return useContext(SttEngineContext);
}
