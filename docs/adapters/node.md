# Node.js adapter

Import the adapter from `nelo/node`; the portable `nelo` root does not export Node types.

```ts
import { Nelo } from "nelo";
import { serve } from "nelo/node";

const app = new Nelo();
app.get("/", (context) => context.text("Hello from Nelo"));

const server = serve(app, { hostname: "127.0.0.1", port: 3000 });
const address = await server.listen();
console.log(`Listening on http://${address.hostname}:${address.port}`);
```

`port: 0` asks the operating system for an ephemeral port. Calling `listen()` again while listening
returns the same address. Calling `close()` more than once returns the same shutdown promise.
Closing before listening succeeds and permanently closes that handle.

## Request conversion

The adapter requires exactly one valid `Host` header and accepts origin-form request targets. It
defaults the Web URL to `http:` unless `protocol: "https"` is explicitly configured. The `protocol`
option only declares the public URL scheme used by the generated Fetch `Request`; `serve()` still
creates a Node HTTP server and does not terminate TLS. Use `protocol: "https"` only behind a trusted
TLS terminator that already guarantees the connection's public scheme.

The converter does not trust `X-Forwarded-Host` or `X-Forwarded-Proto`. GET and HEAD requests have
no Web body; other request bodies use Node's stream bridge with `duplex: "half"`. Malformed Host,
request-target, method, or Web-header conversion failures are returned as controlled HTTP 400
responses.

Request bodies remain streaming. Nelo does not guess an application-wide upload limit; endpoints
that accept untrusted bodies should enforce their own byte and time budgets.

## Delivery and diagnostics

Response bodies are read incrementally. The adapter waits for `drain` after Node signals
backpressure, preserves separate `Set-Cookie` values, and suppresses bodies for HEAD, 204, and 304.

Handler resources registered with `context.use()` close before `app.fetch()` returns. Resources used
by a response producer must be delivery-owned:

```ts
app.get("/export", async (context) => {
  const database = await openDatabase();
  context.delivery.use(() => database.close());
  return new Response(createStreamFromDatabase(database));
});
```

Delivery cleanup runs exactly once in LIFO order after normal body completion, cancellation,
producer failure, client disconnect, or shutdown. `context.delivery.fork()` receives the delivery
signal. Cancellation is cooperative; a promise that ignores that signal cannot be forcibly stopped.

Optional diagnostics report immutable delivery results and failures:

```ts
const server = serve(app, {
  diagnostics: {
    onDelivery(result) {
      console.log(result.state);
    },
    onError(error) {
      console.error(error);
    },
    onRequestDiagnostics(snapshot) {
      console.log(snapshot.state, snapshot.deliveryResources);
    },
  },
});
```

Delivery result `finished` is Node's local `finish`, not remote-client receipt confirmation. Request
diagnostics report state, task and resource counts, the first abort reason, cleanup failures,
pending tasks, structured ownership trees, and bounded forced termination. Callbacks are
observational.

## Deferred work

The Node adapter advertises `nodeCapabilities.deferredWork` as `process_tracked`. Calling
`context.defer(name, operation)` starts best-effort work that is owned by the server process rather
than response delivery. The HTTP response does not wait for it.

Deferred failures are sent to `diagnostics.onError` as `NELO_DEFERRED_002`. Request diagnostics also
include deferred task counts, pending work, ancestry, and failures. During shutdown Nelo drains
active exchanges before checking deferred work so an in-flight request cannot register work after
the shutdown code has already observed an empty deferred registry.

Process tracking is not durability. A process crash loses the work, there are no automatic retries,
and a task that ignores its signal cannot be forcibly terminated.

## Shutdown

```ts
await server.close({
  gracePeriod: 5_000,
  forceAfter: 10_000,
});
await server.closed;
```

`forceAfter` is measured from the start of shutdown and must be at least `gracePeriod`. Both values
must fit Node's timer range. Nelo first drains active exchanges and then deferred work within the
grace budget. At grace expiry active exchange and deferred-work signals receive `server_shutdown`;
at the hard deadline remaining sockets are destroyed. Nelo never calls `process.exit()` and installs
no global signal handlers.

The hard deadline can close a socket, but it cannot terminate arbitrary JavaScript promises. Nelo
records work still pending after its bounded settlement wait and proceeds with cleanup.
