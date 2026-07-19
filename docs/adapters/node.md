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
  },
});
```

Delivery result `finished` is Node's local `finish`, not remote-client receipt confirmation.

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
