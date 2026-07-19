export type CancellationReason =
  | { readonly type: "client_disconnect" }
  | { readonly type: "deadline"; readonly deadline: number }
  | { readonly type: "handler_failure"; readonly error: unknown }
  | { readonly type: "server_shutdown" }
  | { readonly type: "manual"; readonly reason?: unknown };

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
