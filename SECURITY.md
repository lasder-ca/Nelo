# Security policy

## Reporting a vulnerability

Do not publish a suspected vulnerability in a public issue, discussion, pull request, log, or test fixture.
Use a private GitHub security advisory instead:

https://github.com/sahenjp/Nelo/security/advisories/new

Include the affected version or commit, runtime, a minimal safe reproduction, expected and observed
behavior, and the confidentiality, integrity, or availability impact. Do not include production
credentials or third-party data.

## Supported line

Nelo is pre-1.0. Security fixes target the current `main` line unless a release notice explicitly says
otherwise.

## Security boundaries

- The portable package follows Web Platform APIs. Node-specific behavior remains under `nelo/node`.
- The Node adapter creates an HTTP server. `protocol: "https"` changes the public URL scheme supplied
  to the Fetch request; it does not terminate TLS. Use it only behind a trusted external TLS terminator.
- `X-Forwarded-Host` and `X-Forwarded-Proto` are not trusted by the Node request converter.
- Request bodies are streaming. Application-specific upload-size limits are the application's
  responsibility.
- Cancellation is cooperative. Work that ignores the supplied signal cannot be forcibly stopped by
  JavaScript.
- Diagnostics are observational and must not be used as an authorization boundary.

## Disclosure

Please test only systems and data you are authorized to use. Keep exploit details private until a fix
is available and coordinated disclosure is complete.
