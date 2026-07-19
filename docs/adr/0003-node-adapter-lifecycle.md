# ADR 0003: Node adapter lifecycle and delivery ownership

- Status: Accepted
- Date: 2026-07-20

## Context

Phase 2 returns a Web Standard `Response` after closing its Request Scope. Node.js still has to
stream that body, observe abnormal connection closure, respect backpressure, and coordinate active
connections during shutdown. Treating handler return as delivery completion would lose this work;
keeping every request resource alive until delivery ends would instead broaden resource lifetimes
incorrectly.

## Decision

The Node adapter is available only from `nelo/node`. It creates one `AbortController` per HTTP
exchange and passes its signal into the Web Standard `Request`. The first typed reason wins.

Client disconnect is requested when Node reports an aborted or errored request, an incomplete
request closes, the socket closes before response completion, or `ServerResponse` closes before
`writableFinished`. A normal `IncomingMessage` `close` event is insufficient by itself because it
also occurs after valid requests; Nelo checks `request.complete`. A normal response `close` after
`writableFinished` does not cancel the Request Scope.

The Request Scope owns middleware, handler tasks, and `c.use()` resources. Those resources close
when `app.fetch()` settles. After that ownership boundary, the adapter owns only the returned
`Response.body` reader as delivery work. It reads one chunk at a time, waits for Node's `drain`
event when `ServerResponse.write()` returns `false`, and cancels the reader on disconnect or
shutdown. Delivery-specific resources belong to the stream producer and must be released by its
close, error, or `cancel()` path.

Delivery uses these states:

- `pending` before writing starts;
- `finished` after Node emits `finish`;
- `client_disconnected` when the client connection closes early;
- `failed` for producer, conversion, or shutdown delivery failures.

Node's `finish` means response bytes were handed to the operating system. It is not proof that the
remote client consumed every byte, so the capability is `body_close_only`, not `full`.

`NeloNodeServer.close()` marks the server as shutting down and stops accepting connections. It lets
active exchanges settle during `gracePeriod`, aborts remaining controllers with
`{ type: "server_shutdown" }` when grace expires, and destroys remaining sockets at `forceAfter`.
Timers are cleared, repeated close calls share one promise, and no process signal handlers or
`process.exit()` calls are installed.

## Consequences and limits

- Request and response bodies remain streaming; the adapter does not buffer arbitrary payloads.
- `Host` and origin-form request targets are validated. `X-Forwarded-*` is preserved as an ordinary
  header but is not trusted for URL construction.
- Graceful cancellation is cooperative. A task that ignores its signal can outlive socket closure.
- Deferred Work remains unavailable and is reported as such by `nodeCapabilities`.
- TLS termination, HTTP/2, upgrade/WebSocket handling, trailers, and remote receipt confirmation are
  outside this Phase 3 adapter.
