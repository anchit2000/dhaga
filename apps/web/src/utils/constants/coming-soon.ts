/**
 * Copy for controls that exist in the UI but cannot do their job on this
 * instance yet — an unconfigured provider, or a feature whose other half is
 * still unbuilt. Dhaga is in beta; the product rule is that such a control is
 * greyed out and says "Coming soon", never rendered as a live control that
 * silently no-ops.
 *
 * This is deliberately NOT plan copy. Nothing here may read as an upsell or
 * point at pricing — see `components/app/ComingSoonNotice.tsx` for why the
 * affordance is a sibling of `PlanGateNotice` rather than a variant of it.
 *
 * Every one of these strings is shown behind a RUNTIME capability check, never
 * a hardcoded flag, so the control lights itself up the moment the missing
 * piece lands — with no code change here.
 */

/** Badge text every coming-soon pill leads with. */
export const COMING_SOON_LABEL = "Coming soon";

/**
 * Hover delay before a coming-soon tooltip opens. Same reasoning as
 * `PLAN_GATE_TOOLTIP_DELAY_MS` (plans.ts) — well under Base UI's 600ms default,
 * because this is an explanation someone is actively hunting for. Kept separate
 * so plan copy and beta copy can be tuned independently.
 */
export const COMING_SOON_TOOLTIP_DELAY_MS = 150;

/**
 * Gated on `hasSearch()` (@dhaga/core) — no web-search provider configured, so
 * the nightly signal-detection job returns `{ skipped: "no_search" }` and a
 * watched contact would never produce an alert.
 */
export const SIGNAL_WATCH_COMING_SOON =
  "Job-change and news alerts need a web-search provider, which isn't switched on yet. Watching a contact wouldn't find anything, so the toggle is off until it is.";

/**
 * Replaces the watch toggle's "opt in to get alerted…" line while the gate is
 * on. It describes what the control WOULD do without promising it does it —
 * the pill beside it carries the reason, so this must not repeat it.
 */
export const SIGNAL_WATCH_DISABLED_DESCRIPTION =
  "Would web-search this person periodically and flag a role change or notable public news.";

/**
 * The phone-number section fails twice over, so there are two strings and
 * `smsEnabled()` (lib/sms/send.ts) picks between them at runtime.
 *
 * This one is the both-halves case, shown when `smsEnabled()` is false: no
 * phone-number sign-in path is wired into auth (email, magic link, passkey and
 * social are the ways in — see lib/auth/config/plugins.ts and the login form),
 * AND no SMS provider is configured, so no code could even be sent.
 */
export const PHONE_SIGN_IN_COMING_SOON =
  "Signing in with a phone code isn't available yet — email, magic links, passkeys and social sign-in are the ways in today. SMS isn't configured on this instance either, so no code could be sent.";

/**
 * The other half, shown when `smsEnabled()` is TRUE. A code could be delivered,
 * but there is still nowhere to sign in with one, so verifying a number buys
 * the user nothing and the section stays gated. Kept separate rather than
 * reusing the string above, which would claim SMS is unconfigured when it isn't.
 */
export const PHONE_SIGN_IN_UNBUILT_COMING_SOON =
  "Signing in with a phone code isn't available yet — email, magic links, passkeys and social sign-in are the ways in today. Verifying a number here wouldn't unlock anything, so it's switched off until it does.";

/**
 * Gated on `embeddingsEnabled()` (lib/ai/embedder.ts) — with embeddings off,
 * semantic retrieval returns nothing and the slider only weights an empty set.
 */
export const SEMANTIC_SEARCH_COMING_SOON =
  "Semantic matching is switched off on this instance, so this slider has nothing to weight. Search is running on keywords for now.";

/**
 * Gated on the WebGPU probe (components/app/contact/dictation-gate.ts) — the
 * on-device speech model has no runnable backend without it (iOS Safari, most
 * mobile browsers). Not a provider we can switch on; a browser capability.
 */
export const DICTATION_NO_WEBGPU_COMING_SOON =
  "Voice notes run the speech model on your own device, which needs WebGPU — this browser doesn't have it. Chrome or Edge on desktop works today; type your note here instead.";
