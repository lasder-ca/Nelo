# Lvau integration

Nelo can own a local [`lvau-cli`](https://github.com/lasder-ca/lvau) process as part of a request. The example in [`examples/lvau-service`](../../examples/lvau-service/mod.ts) exposes a small upload-to-capsule endpoint and keeps the process, temporary files, and cleanup inside the request lifetime.

## What the example guarantees

- the upload is limited to 8 MiB before encryption starts;
- plaintext and encrypted output are written to a private temporary directory;
- the temporary directory is removed when the handler scope closes;
- `lvau-cli` receives the request `AbortSignal` through `context.fork()` and is terminated when the request is cancelled;
- the password is read by Lvau from a protected local file, not from the URL, request body, environment value, or command-line password argument;
- the `balanced` profile is selected explicitly;
- stderr returned to the process is bounded and is not sent to the client.

Cancellation prevents abandoned work from continuing. It does not make a partially completed external operation transactional, and it does not replace process isolation for an internet-facing service.

## Run it

Build Lvau and make `lvau-cli` available, then prepare a password file:

```sh
printf '%s' 'replace-with-a-strong-passphrase' > password.txt
chmod 600 password.txt

export LVAU_PASSWORD_FILE="$PWD/password.txt"
export LVAU_CLI="/path/to/lvau/target/release/lvau-cli"
npm run build:test-node
node .tmp/node-tests/examples/lvau-service/mod.js
```

Send a file as the request body:

```sh
curl --fail-with-body \
  --data-binary @document.pdf \
  --output document.pdf.lvau \
  http://127.0.0.1:3000/encrypt
```

On Windows, restrict the password file ACL to the account running the service. Lvau's automatic broad-permission check applies on Unix; it cannot verify an overly permissive Windows ACL.

## Production boundary

The example is intentionally local and minimal. Before exposing a similar endpoint publicly:

- authenticate and authorize every request;
- place uploads and the Lvau process inside a dedicated low-privilege worker or sandbox;
- set stricter request, concurrency, CPU, memory, and execution-time limits;
- keep password files and private keys outside the application repository;
- add rate limiting and audit records that never include plaintext or credentials;
- avoid adding a general-purpose decrypt endpoint unless the threat model requires it.
