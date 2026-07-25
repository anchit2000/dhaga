import { useCallback, useRef, useState } from "react";
import type { SearchIndexResult } from "@dhaga/core";
import type { AiAnswerKind, SearchReceipt, SearchStreamEvent } from "@/lib/ai/search";

/** The live state of one Ask-Dhaga stream, accumulated from the NDJSON events. */
export interface AskStreamState {
  steps: string[];
  answer: string;
  receipts: SearchReceipt[];
  notice?: string;
  kind?: AiAnswerKind;
  /** Cap-fallback keyword matches carried on an `upgrade` notice. */
  hits?: SearchIndexResult[];
  pending: boolean;
}

export interface AskStream {
  state: AskStreamState;
  submit: (query: string) => void;
}

function emptyState(pending: boolean): AskStreamState {
  return { steps: [], answer: "", receipts: [], pending };
}

const ERROR_STATE: AskStreamState = {
  ...emptyState(false),
  kind: "error",
  notice: "The AI had trouble answering. Please retry.",
};

/**
 * Drives the streaming Ask-Dhaga endpoint: POSTs the question, reads the NDJSON
 * body line-by-line, and folds each event into `state` so steps tick in, the
 * answer accumulates, and receipts land beneath. A fresh submit aborts any
 * in-flight stream so a re-ask never interleaves with the previous one.
 */
export function useAskStream(): AskStream {
  const [state, setState] = useState<AskStreamState>(() => emptyState(false));
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState(emptyState(true));

    function apply(event: SearchStreamEvent): void {
      setState((prev) => {
        switch (event.type) {
          case "step":
            return { ...prev, steps: [...prev.steps, event.label] };
          case "answer":
            return { ...prev, answer: prev.answer + event.delta };
          case "receipts":
            return { ...prev, receipts: event.items };
          case "notice":
            return { ...prev, notice: event.message, kind: event.kind, hits: event.hits };
          case "done":
            return { ...prev, pending: false };
        }
      });
    }

    void (async () => {
      try {
        const response = await fetch("/api/search/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          setState(ERROR_STATE);
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) apply(JSON.parse(line) as SearchStreamEvent);
            newline = buffer.indexOf("\n");
          }
        }
      } catch {
        if (controller.signal.aborted) return; // superseded by a newer submit
        setState(ERROR_STATE);
      } finally {
        // Only the current stream clears pending — a superseded one must not
        // stomp the newer stream's state.
        if (abortRef.current === controller) {
          abortRef.current = null;
          setState((prev) => ({ ...prev, pending: false }));
        }
      }
    })();
  }, []);

  return { state, submit };
}
