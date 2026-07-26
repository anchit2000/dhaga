import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture. Every spec imports { test, expect } from here rather than
 * from @playwright/test directly, so cross-cutting concerns live in one place.
 *
 * The one concern today: the /app shell can lazy-load the on-device voice model
 * (Moonshine / ONNX via transformers.js from a CDN). That download can hang a
 * headless run for a long time and is irrelevant to every flow we test, so we
 * abort those requests up front.
 *
 * (The fixture-provider arg is named `runTest`, not the Playwright-conventional
 * `use`, so the react-hooks lint rule doesn't mistake it for a React Hook.)
 */
const VOICE_MODEL_REQUEST = /huggingface\.co|cdn\.jsdelivr\.net\/.*transformers|\.onnx(\?|$)|ort-wasm/i;

export const test = base.extend({
  page: async ({ page }, runTest) => {
    await page.route(VOICE_MODEL_REQUEST, (route) => route.abort());
    await runTest(page);
  },
});

export { expect };
