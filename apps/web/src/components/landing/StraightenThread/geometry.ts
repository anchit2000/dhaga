const SAMPLES = 200;
const CENTER = 55;
const BAND = 0.09;
// Overshoot the [0, 1] scroll range by one band width on each side so the
// transition's soft midpoint (tangle = 0.5) never lands exactly on the
// visible top-of-page or bottom-of-page sample — otherwise those samples
// stay a fixed 50% tangled no matter how far you've scrolled.
export const START_PROGRESS = -BAND;
export const END_PROGRESS = 1 + BAND;

// Deterministic "tangle" shape: a handful of non-integer-ratio sine
// harmonics that never line up into a clean repeating wave, so the thread
// reads as a genuinely knotted cord rather than a smooth oscillation.
// Amplitudes and CENTER are percentages of the container width.
const HARMONICS = [
  { freq: 1.7, amp: 16, phase: 0.4 },
  { freq: 3.4, amp: 10, phase: 2.7 },
  { freq: 5.9, amp: 6, phase: 1.1 },
  { freq: 9.3, amp: 3, phase: 4.2 },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * The thread is a fixed tangle shape with a straightening front that sweeps
 * down the page as `progress` (tied to overall scroll) advances: points
 * below the front (not yet reached) stay fully knotted, points above it
 * (already scrolled past) are pulled flat, with a soft blend at the front
 * itself — like pulling a snagged cord taut hand over hand as you read
 * further down the page. Coordinates are real container pixels (not an
 * abstract viewBox) so the "dhaga" text riding the path via <textPath>
 * renders undistorted instead of being squashed by a non-uniform scale.
 */
export function buildPath(progress: number, width: number, height: number): string {
  let d = "";
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const y = t * height;

    const tangle = smoothstep(progress - BAND, progress + BAND, t);
    const offsetPercent = HARMONICS.reduce(
      (sum, h) => sum + h.amp * Math.sin(2 * Math.PI * h.freq * t + h.phase),
      0,
    );

    const x = (CENTER / 100) * width + (tangle * offsetPercent * width) / 100;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}
