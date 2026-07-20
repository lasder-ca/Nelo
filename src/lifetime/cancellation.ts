export type NeloAbortReason =
  | { readonly type: "client_disconnect" }
  | { readonly type: "deadline"; readonly deadline: number }
  | { readonly type: "handler_failure"; readonly error: unknown }
  | { readonly type: "request_error"; readonly error: unknown }
  | { readonly type: "delivery_error"; readonly error: unknown }
  | { readonly type: "server_shutdown" }
  | { readonly type: "manual"; readonly reason?: unknown };

/** @deprecated Use NeloAbortReason. */
export type CancellationReason = NeloAbortReason;

export function isCancellationReason(value: unknown): value is CancellationReason {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  return value.type === "client_disconnect" || value.type === "deadline" ||
    value.type === "handler_failure" || value.type === "request_error" ||
    value.type === "delivery_error" || value.type === "server_shutdown" ||
    value.type === "manual";
}

export function cancellationReasonFromSignal(
  signal: AbortSignal,
  fallback: CancellationReason,
): CancellationReason {
  return isCancellationReason(signal.reason) ? signal.reason : fallback;
}

export class LifetimeCancelledError extends Error {
  override readonly name = "LifetimeCancelledError";
  readonly code = "NELO_SCOPE_002";

  constructor(readonly reason: CancellationReason) {
    super(`NELO_SCOPE_002: lifetime scope was cancelled: ${reason.type}`);
  }
}

export function isCancellationAcknowledgement(
  error: unknown,
  signal: AbortSignal,
): boolean {
  return error === signal.reason ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof LifetimeCancelledError && error.reason === signal.reason);
}
