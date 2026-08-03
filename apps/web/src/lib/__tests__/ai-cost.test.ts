import { describe, expect, it } from "vitest";
import { costOfAiAction, totalCostOfAiActions } from "@/lib/ai/cost";
import { MODEL_RATES_PER_MTOK } from "@/utils/constants/model-pricing";

/**
 * WHY THESE TESTS EXIST: this helper is the only thing standing between the
 * owner and a $8/month plan whose real inference bill nobody can see. Three
 * metered features cost 0 credits on purpose, so credits no longer bound spend
 * — the dollar ceiling does, and it is only as trustworthy as the arithmetic
 * below. Each case pins a property that, if it broke, would break silently:
 *
 *   - batch really is half price, so the nightly sweeps (the entire uncredited
 *     blind spot) are not billed at double their cost;
 *   - an UNKNOWN model never under-reports, because a ceiling computed from an
 *     under-reported cost is a ceiling that does not stop anything;
 *   - prompt caching is not modelled anywhere (docs/BRD.md §8.3 forbids it —
 *     every system prompt is below the minimum cacheable prefix).
 */

describe("cost is computed from recorded tokens at the published rates", () => {
  it("prices a Haiku call at $1/$5 per MTok", () => {
    // 1,000,000 in + 1,000,000 out = $1.00 + $5.00.
    expect(
      costOfAiAction({
        model: "claude-haiku-4-5",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        batch: false,
      }),
    ).toBeCloseTo(6.0, 10);
  });

  it("prices Sonnet and Opus off the same table", () => {
    expect(
      costOfAiAction({
        model: "claude-sonnet-5",
        inputTokens: 1_000_000,
        outputTokens: 0,
        batch: false,
      }),
    ).toBeCloseTo(3.0, 10);
    expect(
      costOfAiAction({
        model: "claude-opus-5",
        inputTokens: 0,
        outputTokens: 1_000_000,
        batch: false,
      }),
    ).toBeCloseTo(25.0, 10);
  });

  it("charges a batch call exactly half of the identical synchronous call", () => {
    // The nightly sweeps (signal_detection, person_classification,
    // goal_matching) are the whole reason the master gate exists, and they all
    // run through the Batch API. Pricing them at sync rates would double the
    // apparent cost of the one thing the owner is trying to measure.
    const usage = { model: "claude-haiku-4-5", inputTokens: 12_345, outputTokens: 678 };
    const sync = costOfAiAction({ ...usage, batch: false });
    const batch = costOfAiAction({ ...usage, batch: true });

    expect(batch).toBeCloseTo(sync / 2, 12);
    expect(batch).toBeLessThan(sync);
  });
});

describe("an unknown model fails toward over-reporting, never under", () => {
  it("prices it at the dearest known rate", () => {
    const dearest = Object.values(MODEL_RATES_PER_MTOK).reduce((max, rate) =>
      rate.input + rate.output > max.input + max.output ? rate : max,
    );
    const unknown = costOfAiAction({
      model: "some-byo-key-model-we-have-never-seen",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      batch: false,
    });

    expect(unknown).toBeCloseTo(dearest.input + dearest.output, 10);
    // The property that actually matters: no known model can cost MORE than an
    // unknown one, so a mystery model can never sneak under a dollar ceiling.
    for (const [model] of Object.entries(MODEL_RATES_PER_MTOK)) {
      expect(
        costOfAiAction({ model, inputTokens: 1_000_000, outputTokens: 1_000_000, batch: false }),
      ).toBeLessThanOrEqual(unknown + 1e-9);
    }
  });

  it("still recognises a dated snapshot of a known model", () => {
    // Providers hand back "claude-haiku-4-5-20251001"-shaped ids. Exact-match
    // pricing would silently bill every Haiku action at Opus rates and trip
    // every ceiling 5× early — visible, but wrong.
    expect(
      costOfAiAction({
        model: "claude-haiku-4-5-20251001",
        inputTokens: 1_000_000,
        outputTokens: 0,
        batch: false,
      }),
    ).toBeCloseTo(1.0, 10);
  });
});

describe("totals", () => {
  it("sums priced rows without rounding sub-cent actions away", () => {
    // A month of nightly batch actions is thousands of sub-cent rows; rounding
    // on the way in would show a $0 bill for real money spent.
    const rows = Array.from({ length: 1000 }, () => ({
      model: "claude-haiku-4-5",
      inputTokens: 800,
      outputTokens: 40,
      batch: true,
    }));

    // 1000 × ((800 × $1 + 40 × $5) / 1e6) × 0.5
    expect(totalCostOfAiActions(rows)).toBeCloseTo(0.5, 10);
    expect(totalCostOfAiActions([])).toBe(0);
  });
});
