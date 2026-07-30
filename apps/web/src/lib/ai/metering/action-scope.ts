import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { AiActionFeature } from "@dhaga/core";

/**
 * The AI action currently in flight. `recorded` flips the first time a model
 * round-trip inside this action is metered — that is what lets the second and
 * later calls of one action skip the monthly cap check (the action was already
 * admitted; re-checking would fail a user who is one credit below the cap
 * halfway through an action they already started).
 */
interface AiActionScope {
  id: string;
  feature: AiActionFeature;
  recorded: boolean;
}

const storage = new AsyncLocalStorage<AiActionScope>();

/**
 * Run `fn` as ONE user-visible AI action, however many model calls it makes.
 *
 * Metering is per action, not per LLM call: a card scan is one action even
 * though it is a field extraction plus a background transcription, and
 * processing a note is one action even when it grows a second call later. Every
 * `recordAiAction` inside this scope folds into a single `ai_actions` row whose
 * token counts are the SUM across the calls — the count becomes meaningful
 * without the cost becoming a lie.
 *
 * Nested calls JOIN the open action instead of starting a new one, which is
 * what makes a new AI call site correct by default: enrichment wraps a web
 * search plus a note extraction, and the extraction's own `withAiAction` is
 * absorbed rather than double-counted.
 *
 * Pass `{ feature, id }` to continue an action across request boundaries — the
 * card scan hands its action id to the save so the deferred transcription bills
 * against the same scan (see scanCardImages / scheduleCardTranscription).
 */
export function withAiAction<T>(
  action: AiActionFeature | { feature: AiActionFeature; id: string },
  fn: () => Promise<T>,
): Promise<T> {
  const open = storage.getStore();
  if (open) return fn();
  const scope: AiActionScope =
    typeof action === "string"
      ? { id: randomUUID(), feature: action, recorded: false }
      : { id: action.id, feature: action.feature, recorded: false };
  return storage.run(scope, fn);
}

/**
 * An action handle to open explicitly, for callers `withAiAction` can't simply
 * wrap. Async generators are the case that forces this: AsyncLocalStorage does
 * not survive a `yield`, so a streaming pipeline mints one handle and passes it
 * to `withAiAction` at each awaited step to rejoin the same action.
 */
export function newAiAction(feature: AiActionFeature): { feature: AiActionFeature; id: string } {
  return { feature, id: randomUUID() };
}

/** The open action's id, or null outside any action. Callers that continue an
 *  action in a later request (card scan → transcription) hand this on. */
export function currentAiActionId(): string | null {
  return storage.getStore()?.id ?? null;
}

/** The open action, for the metering internals only. */
export function currentAiActionScope(): AiActionScope | null {
  return storage.getStore() ?? null;
}
