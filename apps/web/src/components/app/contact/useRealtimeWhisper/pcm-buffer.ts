function concatPcm(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Accumulates decoded PCM across epochs — cheap to keep and trim (plain
 *  samples), unlike the raw encoded chunks each epoch decodes from. */
export class PcmBuffer {
  private chunks: Float32Array[] = [];

  reset(): void {
    this.chunks = [];
  }

  push(samples: Float32Array): void {
    this.chunks.push(samples);
  }

  /** The full session so far — used for the final pass on stop(). */
  all(): Float32Array {
    return concatPcm(this.chunks);
  }

  /** The tail end only, for the rolling live-preview pass. */
  preview(maxSamples: number): Float32Array {
    const combined = this.all();
    return combined.length > maxSamples ? combined.slice(-maxSamples) : combined;
  }
}
