<p align="center">
  <img src="./assets/nelo-icon.svg" alt="Nelo" width="128" height="128">
</p>

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

Nelo is a Web Standards framework that treats each request as the owner of the work it starts. A
handler may return a `Response` while tasks are still running, resources are still open, or a
response body is still being delivered. Nelo keeps those lifetimes explicit.

> Returning a `Response` is not the same as completing the request lifetime.

## Quick start

```ts
import { Nelo } from "@lasder/nelo";
import { serve } from "@lasder/nelo/node";

const app = new Nelo();

app.get("/users/:id", async (context) => {
  const user = context.fork("load-user", (signal) => fetchUser(context.params.id!, { signal }));
  return context.json(await user);
});

const server = serve(app, { port: 3000 });
await server.listen();
```

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

The handler scope closes after the handler finishes. The delivery scope remains active until the
body completes, fails, is cancelled, or the transport reports a disconnect. Resources are released
once in reverse acquisition order.

## Core API

| API                                      | Purpose                                                   |
| ---------------------------------------- | --------------------------------------------------------- |
| `app.fetch(request)`                     | Run routing, middleware, the handler, and owned delivery. |
| `context.fork(name, operation)`          | Start an eager task owned by the request.                 |
| `context.signal`                         | Forward cooperative cancellation to request work.         |
| `context.use(name, acquire, cleanup?)`   | Acquire and release a handler-owned resource.             |
| `context.delivery.fork(name, operation)` | Start work owned by response delivery.                    |
| `context.delivery.use(...)`              | Keep a resource or cleanup attached to delivery.          |

## Lvau integration

[`examples/lvau-service`](./examples/lvau-service/mod.ts) runs the Lvau file-encryption CLI as
request-owned work. Client cancellation terminates the child process, temporary plaintext is removed
with the handler scope, uploads are bounded, and the password is read from a protected local file.

See [the integration guide](./docs/integrations/lvau.md) for setup and security boundaries.

## Brand assets

- [`assets/nelo-icon.svg`](./assets/nelo-icon.svg) — primary icon for documentation and product
  surfaces.
- [`assets/favicon.svg`](./assets/favicon.svg) — compact browser and site icon.

Both assets are flat SVGs with transparent backgrounds and can be referenced directly from websites.

## Development

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

## License

Nelo is available under the [Apache License 2.0](./LICENSE).
