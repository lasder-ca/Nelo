# ADR 0006: Explicit deferred work and Node process tracking

- Status: Accepted
- Date: 2026-08-20

## Context

Nelo already separates handler and response-delivery ownership, but it had no implemented way to
transfer non-critical work beyond the HTTP response. Starting an ordinary Promise after the handler
returns would make ownership, shutdown, cancellation, and failure reporting implicit.

## Decision

Nelo adds `context.defer(name, operation)`. A deferred operation starts eagerly through a runtime
registrar, receives its own `AbortSignal`, is marked as transferred ownership, and does not delay
the HTTP response. Request diagnostics report deferred task counts, pending work, ancestry, and
failures. A runtime without a registrar rejects `defer()` with `NELO_DEFERRED_001` rather than
silently creating unowned background work. Deferred task failures are reported as
`NELO_DEFERRED_002`.

The Node adapter implements the registrar with an in-process `DeferredWorkRegistry` and advertises
`nodeCapabilities.deferredWork === "process_tracked"`. During shutdown Node first drains active HTTP
exchanges because those exchanges may still register deferred work. It then drains deferred work
within the remaining grace period. At grace expiry, remaining exchanges and deferred tasks receive a
`server_shutdown` cancellation reason. The existing hard deadline still bounds server shutdown.

Node process tracking is best-effort. It is not durable, persistent, retrying, exactly-once, or a
queue. A process crash loses deferred work, and JavaScript that ignores its abort signal cannot be
forcibly stopped.

## Compatibility

The change is additive to handlers that do not call `defer()`. `Nelo.fetch()` gains an optional
runtime context and Node supplies it automatically. Existing `FetchApplication` implementations may
ignore the optional second argument. Existing request, delivery, task, resource, and deadline APIs
retain their behavior.

`RequestDiagnostics` gains deferred-work fields. These semantics ship in Nelo `0.2.0` after being
validated through the `0.2.0-alpha.2` prerelease cycle.

## Testing

Portable tests cover non-blocking response completion, explicit unsupported-runtime failure, task
failure reporting, and diagnostics. Node loopback tests cover graceful waiting, shutdown
cancellation, failure observation, and the race where an in-flight request registers deferred work
after shutdown has already begun.
