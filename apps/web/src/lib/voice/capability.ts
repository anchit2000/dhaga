/**
 * WebGPU capability probe (client-only). Some browsers expose `navigator.gpu`
 * yet `requestAdapter()` resolves null (no usable adapter), so presence alone
 * isn't enough — we require an adapter to actually come back. SSR-guarded:
 * returns false on the server, where there is no `navigator`.
 *
 * Typed without the @webgpu/types lib (not a dependency): we probe
 * `navigator.gpu` structurally rather than add a global augmentation.
 */

/** The one method we call — enough to avoid `any` without @webgpu/types. */
interface AdapterRequester {
  requestAdapter(): Promise<unknown | null>;
}

export async function isWebGpuAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as unknown as { gpu?: AdapterRequester }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}
