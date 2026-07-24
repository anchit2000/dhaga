/**
 * Source for the AudioWorklet downsampler, kept as a string so it can be
 * registered from an inline Blob URL (no separately served .js file — this is
 * what keeps it COEP: credentialless-safe). The code below runs inside the
 * AudioWorkletGlobalScope, NOT in this module — it is never type-checked by tsc
 * and must stay plain, self-contained ES that a worklet can parse.
 *
 * What it does: the render graph feeds it 128-sample blocks at the context rate
 * (usually 48 kHz, sometimes 44.1 kHz — read live from the `sampleRate` global).
 * It linear-resamples that stream to 16 kHz mono and posts Float32 frames of
 * `frameSize` samples to the main thread. Resampler carry (fractional read
 * position + leftover input tail) persists across process() calls so there are
 * no seams between blocks. The trailing sub-frame remainder (< frameSize) at the
 * end of a push-to-talk press is dropped — bounded, and typically release
 * silence — since the node is torn down on stop().
 */
export const PROCESSOR_NAME = "pcm-downsampler";

export const WORKLET_SOURCE = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this._targetRate = opts.targetSampleRate || 16000;
    this._frameSize = opts.frameSize || 1024;
    this._ratio = sampleRate / this._targetRate;
    this._tail = new Float32Array(0);
    this._pos = 0;
    this._out = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || !input[0] || input[0].length === 0) {
      return true;
    }
    const chan = input[0];

    const merged = new Float32Array(this._tail.length + chan.length);
    merged.set(this._tail, 0);
    merged.set(chan, this._tail.length);

    const ratio = this._ratio;
    const out = this._out;
    let pos = this._pos;
    while (pos + 1 < merged.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      out.push(merged[i] * (1 - frac) + merged[i + 1] * frac);
      pos += ratio;
    }

    const consumed = Math.min(Math.floor(pos), merged.length);
    this._tail = merged.slice(consumed);
    this._pos = pos - consumed;

    while (out.length >= this._frameSize) {
      const frame = new Float32Array(out.splice(0, this._frameSize));
      this.port.postMessage(frame, [frame.buffer]);
    }
    return true;
  }
}

registerProcessor(${JSON.stringify(PROCESSOR_NAME)}, PcmDownsampler);
`;
