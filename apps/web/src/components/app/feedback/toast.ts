import { toast } from "sonner";

/**
 * The ONE error toast for fire-and-forget / optimistic failures, so every
 * transient save failure reads identically app-wide. Mirrors the inline
 * <FormError>: an error toast with an optional one-tap Retry. Use it from
 * onClick / useTransition handlers (and it's the same shape the optimistic
 * hooks already emit); use <FormError> for useActionState forms.
 */
export function toastError(message: string, onRetry?: () => void): void {
  toast.error(
    message,
    onRetry ? { action: { label: "Retry", onClick: onRetry } } : undefined,
  );
}

/**
 * A transient, non-blocking notice — most often "we started something in the
 * background". Deliberately a toast and not an inline line of text: a notice
 * rendered from form state has no lifetime and hangs around describing work that
 * finished minutes ago. Auto-dismisses (sonner's default); never a dialog, never
 * click-to-clear.
 */
export function toastNotice(message: string): void {
  toast(message);
}

/** Something the user kicked off has landed. Same non-blocking, auto-dismissing
 *  shape as toastNotice, with the success check. */
export function toastSuccess(message: string): void {
  toast.success(message);
}
