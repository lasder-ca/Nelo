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
defaults the Web URL to `http:` unless `protocol: "https"` is explicitly configured. It does not
trust `X-Forwarded-Host` or `X-Forwarded-Proto`. GET and HEAD requests have no Web body; other
request bodies use Node's stream bridge with `duplex: "half"`.

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
pending tasks, and bounded forced termination. Callbacks are observational.

## Shutdown

```ts
await server.close({
  gracePeriod: 5_000,
  forceAfter: 10_000,
});
await server.closed;
```

`forceAfter` is measured from the start of shutdown and must be at least `gracePeriod`. At grace
expiry active exchange signals receive `server_shutdown`; at the hard deadline remaining sockets are
destroyed. Nelo never calls `process.exit()` and installs no global signal handlers.

The hard deadline can close a socket, but it cannot terminate arbitrary JavaScript promises. Nelo
records work still pending after its bounded settlement wait and proceeds with cleanup.
