<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/nelo-wordmark-on-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/nelo-wordmark-on-light.svg">
    <img src="./assets/nelo-wordmark-on-light.svg" alt="Nelo — Every request owns its work." width="520">
  </picture>
</p>

<p align="center">
  <strong>Request-owned tasks, resources, cancellation, and response delivery for TypeScript.</strong>
</p>

<p align="center">
  <img alt="Experimental" src="https://img.shields.io/badge/status-experimental-6d7178">
  <img alt="Version 0.2.0 alpha 1" src="https://img.shields.io/badge/version-0.2.0--alpha.1-2864dc">
  <img alt="Strict TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <a href="./LICENSE"><img alt="Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-5bc8ad"></a>
</p>

<p align="center">
  English · <a href="./README.ja.md">日本語</a> · <a href="https://nelo.lattee.jp">Website</a>
</p>

Nelo is a Web Standards framework that treats each request as the owner of the work it starts. A handler may return a `Response` while tasks are still running, resources are still open, or a response body is still being delivered. Nelo keeps those lifetimes explicit.

> Returning a `Response` is not the same as completing the request lifetime.

## Quick start

```ts
import { Nelo } from "@lasder/nelo";
import { serve } from "@lasder/nelo/node";

const app = new Nelo();

app.get("/users/:id", async (context) => {
  const user = context.fork("load-user", (signal) =>
    fetchUser(context.params.id!, { signal })
  );

  return context.json(await user);
});

const server = serve(app, { port: 3000 });
await server.listen();
```

Nelo must own a task when it starts. It cannot attach reliable cancellation to an arbitrary promise that is already running.

## Lifetime model

```text
Request lifetime
├── Handler scope
│   ├── middleware
│   ├── context.fork()
│   └── context.use()
└── Delivery scope
    ├── Response.body
    ├── context.delivery.fork()
    └── context.delivery.use()
```

The handler scope closes after the handler finishes. The delivery scope remains active until the body completes, fails, is cancelled, or the transport reports a disconnect. Resources are released once in reverse acquisition order.

## Core API

| API | Purpose |
|---|---|
| `app.fetch(request)` | Run routing, middleware, the handler, and owned delivery. |
| `context.fork(name, operation)` | Start an eager task owned by the request. |
| `context.signal` | Forward cooperative cancellation to request work. |
| `context.use(name, acquire, cleanup?)` | Acquire and release a handler-owned resource. |
| `context.delivery.fork(name, operation)` | Start work owned by response delivery. |
| `context.delivery.use(...)` | Keep a resource or cleanup attached to delivery. |

The current framework also includes static and parameter routes, global and route middleware, `404`/`405` handling, centralized errors, bounded diagnostics, a Node.js adapter, disconnect handling, streaming backpressure, and graceful shutdown.

## Lvau integration

[`examples/lvau-service`](./examples/lvau-service/mod.ts) runs the Lvau file-encryption CLI as request-owned work. Client cancellation terminates the child process, temporary plaintext is removed with the handler scope, uploads are bounded, and the password is read from a protected local file.

See [the integration guide](./docs/integrations/lvau.md) for setup and security boundaries.

## Runtime support

| Capability | Portable core | Node.js | Other runtimes |
|---|:---:|:---:|:---:|
| Request-owned tasks and resources | Yes | Yes | Core APIs are portable |
| Response-body lifetime tracking | Yes | Yes | Adapter work remains |
| Client disconnect integration | — | Yes | Adapter work remains |
| Graceful shutdown | — | Yes | Adapter work remains |
| Durable deferred work | No | No | Not claimed |

Support is documented only where an adapter and its transport tests exist.

## Current limits

Nelo does not claim:

- forced cancellation of arbitrary promises;
- proof that a client physically received every byte;
- durable or exactly-once background execution;
- identical transport behavior across runtimes;
- completed Cloudflare, Deno, or Bun adapters.

## Development

The current package name is `@lasder/nelo`. Build and validate the source checkout with Node.js 20, 22, or 24 and Deno 2:

```sh
git clone https://github.com/lasder-ca/Nelo.git
cd Nelo
npm install

npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run check:package
npm run check:tarball
```

Useful references:

- [Node.js adapter](./docs/adapters/node.md)
- [Request ownership ADR](./docs/adr/0002-nelo-request-ownership.md)
- [Lvau integration](./docs/integrations/lvau.md)

## License

Nelo is available under the [Apache License 2.0](./LICENSE).
