export const WHISPER_SAMPLE_RATE = 16_000;

/** Decodes a recorded Blob to mono Float32 samples at Whisper's expected rate. */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new OfflineAudioContext(1, 1, WHISPER_SAMPLE_RATE);
  const decoded = await context.decodeAudioData(arrayBuffer);
  return decoded.getChannelData(0);
}
