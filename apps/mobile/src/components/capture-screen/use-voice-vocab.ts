import { useCallback, useEffect, useMemo } from "react";

import { DoubleMetaphoneDictionary } from "@dhaga/core/src/voice/teaching/phonetic";

import { vocabStore } from "@/lib/voice-vocab";

interface VoiceVocab {
  /** Rewrite a transcript's phonetic matches to their taught spelling. */
  correct: (text: string) => string;
  /** Re-read the store and rebuild the dictionary (call after teaching edits). */
  reload: () => Promise<void>;
}

/**
 * Loads the on-device vocabulary once and keeps a DoubleMetaphoneDictionary
 * (the shared, deterministic $0-token teaching brain from @dhaga/core) rebuilt
 * from it. `correct` reads the live dictionary instance, so a `reload()` is
 * picked up without re-rendering the caller.
 */
export function useVoiceVocab(): VoiceVocab {
  const dictionary = useMemo(() => new DoubleMetaphoneDictionary(), []);

  const reload = useCallback(async (): Promise<void> => {
    dictionary.rebuild(await vocabStore.load());
  }, [dictionary]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const correct = useCallback((text: string): string => dictionary.correct(text).text, [dictionary]);

  return { correct, reload };
}
