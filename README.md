# Nelo website

This branch contains only the source for [nelo.lattee.jp](https://nelo.lattee.jp).

The Nelo runtime and npm package live on the `main` branch. The website consumes the published package as a normal dependency instead of importing the repository source.

## Development

```bash
cd website
npm install
npm run dev
```

## Verification

```bash
cd website
npm run typecheck
npm run build
```

Vercel deploys this branch through the `nelo-lattee-jp` project.
