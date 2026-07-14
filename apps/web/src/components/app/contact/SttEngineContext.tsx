"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SttEngine } from "@/lib/repo/settings";
import { ensureModelLoaded } from "./whisper-model-loader";
import { getSpeechRecognitionCtor } from "./browser-speech";

const SttEngineContext = createContext<SttEngine>("browser");

/** Server-fetched once in the app layout, read by every useDictation() call
 *  site without threading a prop through unrelated component trees. Also
 *  the single trigger point for two on-login checks: prefetching the
 *  on-device Whisper model when it's already the active engine, and
 *  nudging Firefox users off the still-default "browser" engine (which has
 *  no SpeechRecognition there at all — a hard unsupported, not the
 *  Brave/Chromium silent-failure case useDictation's timeout handles).
 *  This re-renders with a fresh `engine` both on login (server-fetched per
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
  const router = useRouter();
  useEffect(() => {
    if (engine === "local" || engine === "realtime") {
      ensureModelLoaded();
      return;
    }
    if (!getSpeechRecognitionCtor()) {
      toast("We detected your browser is Firefox", {
        description: "Firefox doesn't support browser-based dictation — pick one of the on-device models to use voice notes here.",
        action: {
          label: "Open settings",
          onClick: () => router.push("/app/settings#voice-dictation"),
        },
      });
    }
  }, [engine, router]);
  return <SttEngineContext.Provider value={engine}>{children}</SttEngineContext.Provider>;
}

export function useSttEngine(): SttEngine {
  return useContext(SttEngineContext);
}
