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
