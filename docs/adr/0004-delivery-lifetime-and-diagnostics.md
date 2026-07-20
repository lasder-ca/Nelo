# ADR 0004: Delivery lifetime and request diagnostics

- Status: Accepted
- Date: 2026-07-20

## Context

A handler returning a `Response` ends handler execution but does not finish sending its body.
Closing every `c.use()` resource after delivery would retain ordinary handler state too long.
Closing all resources when the handler returns breaks streams that still need a database, file, or
producer.

## Decision

One request lifetime has two explicit ownership scopes. Handler Scope owns routing, middleware, the
route handler, `c.fork()`, and `c.use()`. It closes when the handler returns or fails. Delivery
Scope owns the returned `Response.body`, `c.delivery.fork()`, and `c.delivery.use()`. It begins
after Handler Scope closes and ends after body close or completion, reader cancellation, producer
error, client disconnect, request abort, server shutdown, Node response/socket failure, write
failure, or a disconnect while waiting for backpressure.

Both scopes follow the request's shared abort signal, but each has its own task and resource stack.
The first `NeloAbortReason` wins and is passed to `AbortController.abort(reason)` exactly once. The
portable reasons distinguish client disconnect, server shutdown, request error, and delivery error;
existing deadline, handler failure, and manual reasons remain compatible. Portable code contains no
Node types.

`c.use()` remains handler-owned. `c.delivery.use()` is intentionally separate so ownership and
cleanup timing are visible at registration. Both stacks clean up exactly once in reverse
registration order. Cleanup continues after failures; multiple failures become an `AggregateError`,
while diagnostics retain phase-tagged `CleanupFailure` records.

The portable core wraps the response stream. Normal close completes Delivery Scope; `cancel()` and
errors abort and close it. A null body closes it immediately. Strings, JSON, `Uint8Array`, immediate
streams, and long-running streams therefore use the same Web `ReadableStream` boundary.

Read-only `RequestDiagnostics` snapshots are emitted through an optional callback. They contain the
state (`handling`, `delivering`, `completed`, `aborted`, or `failed`), handler/delivery task and
resource counts, pending task counts, first abort reason, cleanup failures, and whether bounded
termination left a task pending. This is a snapshot mechanism, not logging, metrics, tracing, or a
general event bus. The Node adapter adds transport results; portable ownership stays in core.

At scope close Nelo requests cancellation and normally waits for owned tasks to settle. Request
execution uses a bounded settlement wait so a promise that ignores its signal cannot hang cleanup
forever. Such a promise cannot be forcibly stopped; diagnostics report it as pending and forced
termination. Resource cleanup may therefore occur while non-cooperative code still exists, so owned
operations must observe their signal.

During graceful shutdown, existing delivery may finish within the grace period. At grace expiry the
shared signal receives `server_shutdown`; at the hard deadline Node destroys remaining sockets.
Disconnect and error paths cancel the body reader, then close Delivery Scope exactly once.

Node's `finish` means bytes were handed to the local operating system. Neither Nelo nor Node can
confirm that a remote client application received or processed them.

## Alternatives considered

Keeping `c.use()` alive through delivery was rejected because it silently broadens existing resource
lifetimes. Requiring every stream to implement its own `cancel()` cleanup was rejected because it
duplicates ownership logic and misses adapter failures. Putting all ownership in the Node adapter
was rejected because the semantics are portable. A general observability framework and OpenTelemetry
dependency were rejected as disproportionate. Automatically detaching or claiming to terminate
arbitrary promises was rejected because JavaScript cancellation is cooperative.

## Compatibility impact

This is additive. Existing `c.use()`, `c.fork()`, handlers, middleware, and `app.fetch()` signatures
remain valid. Streaming applications can opt into `c.delivery.use()` and `c.delivery.fork()`.
`NeloAbortReason` is preferred; `CancellationReason` remains as a type alias. The package version
remains `0.2.0-alpha.1`.
