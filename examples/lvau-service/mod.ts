import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Nelo } from "@lasder/nelo";
import { serve } from "@lasder/nelo/node";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const STDERR_LIMIT = 16 * 1024;
const DEFAULT_PROCESS_TIMEOUT_MS = 30_000;
const MAX_PROCESS_TIMEOUT_MS = 10 * 60_000;

const lvauCli = process.env.LVAU_CLI ?? "lvau-cli";
const passwordFile = process.env.LVAU_PASSWORD_FILE;
const processTimeoutMs = parseProcessTimeout(process.env.LVAU_TIMEOUT_MS);

if (passwordFile === undefined || passwordFile.length === 0) {
  throw new Error("LVAU_PASSWORD_FILE must point to a protected password file");
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

class LvauProcessError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "LvauProcessError";
  }
}

const app = new Nelo({
  onError(error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof LvauProcessError) {
      console.error(error.stderr || error.message);
      const message = error.status === 504 ? "Encryption timed out" : "Encryption failed";
      return Response.json({ error: message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  },
});

app.get("/health", () => Response.json({ status: "ok" }));

app.post("/encrypt", async (context) => {
  const plaintext = await readRequestBody(context.req, context.signal, MAX_UPLOAD_BYTES);
  const workdir = await context.use(
    "lvau-workdir",
    () => mkdtemp(join(tmpdir(), "nelo-lvau-")),
    (path) => rm(path, { recursive: true, force: true }),
  );

  const inputPath = join(workdir, "input.bin");
  const outputPath = join(workdir, "output.lvau");
  await writeFile(inputPath, plaintext, { mode: 0o600 });

  await context.fork("lvau-encrypt", (signal) =>
    runLvau(
      [
        "encrypt",
        "--in-file",
        inputPath,
        "--out-file",
        outputPath,
        "--password-file",
        passwordFile,
        "--profile",
        "balanced",
      ],
      signal,
      processTimeoutMs,
    ));

  const encrypted = await readFile(outputPath);
  return new Response(encrypted, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": 'attachment; filename="payload.lvau"',
      "content-type": "application/octet-stream",
      "x-content-type-options": "nosniff",
    },
  });
});

const port = parsePort(process.env.PORT);
const server = serve(app, { hostname: "127.0.0.1", port });
const address = await server.listen();
console.log(`Lvau service listening on http://${address.hostname}:${address.port}`);

async function readRequestBody(
  request: Request,
  signal: AbortSignal,
  limit: number,
): Promise<Uint8Array> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      throw new HttpError(400, "Invalid Content-Length header");
    }

    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length)) {
      throw new HttpError(400, "Invalid Content-Length header");
    }
    if (length > limit) throw new HttpError(413, "Payload is too large");
  }

  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  const cancelRead = (): void => {
    void reader.cancel(signal.reason).catch(() => undefined);
  };

  if (signal.aborted) cancelRead();
  else signal.addEventListener("abort", cancelRead, { once: true });

  try {
    while (true) {
      if (signal.aborted) {
        throw signal.reason ?? new Error("Request was cancelled");
      }

      const { done, value } = await reader.read();
      if (signal.aborted) {
        throw signal.reason ?? new Error("Request was cancelled");
      }
      if (done) break;

      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("payload limit exceeded");
        throw new HttpError(413, "Payload is too large");
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", cancelRead);
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function runLvau(
  args: readonly string[],
  signal: AbortSignal,
  timeoutMs: number,
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new Error("Lvau process was cancelled"));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(lvauCli, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });

    let stderr = "";
    let settled = false;
    let terminationError: unknown;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
    let executionTimer: ReturnType<typeof setTimeout> | undefined;

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-STDERR_LIMIT);
    });

    const cleanup = (): void => {
      signal.removeEventListener("abort", abort);
      if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
      if (executionTimer !== undefined) clearTimeout(executionTimer);
    };

    const finish = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error === undefined) resolve();
      else reject(error);
    };

    const terminate = (error: unknown): void => {
      terminationError ??= error;
      if (child.exitCode !== null || child.signalCode !== null) return;

      if (child.kill()) {
        forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
      }
    };

    const abort = (): void => {
      terminate(signal.reason ?? new Error("Lvau process was cancelled"));
    };

    child.once("error", (error) => {
      finish(
        terminationError ??
          new LvauProcessError("Unable to start lvau-cli", error.message),
      );
    });

    child.once("exit", (code, exitSignal) => {
      if (terminationError !== undefined) {
        finish(terminationError);
        return;
      }
      if (code === 0) {
        finish();
        return;
      }

      const reason = code === null ? `signal ${exitSignal ?? "unknown"}` : `exit code ${code}`;
      finish(new LvauProcessError(`lvau-cli failed with ${reason}`, stderr.trim()));
    });

    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });

    executionTimer = setTimeout(
      () =>
        terminate(
          new LvauProcessError(
            `lvau-cli exceeded the ${timeoutMs}ms execution limit`,
            stderr.trim(),
            504,
          ),
        ),
      timeoutMs,
    );
  });
}

function parseProcessTimeout(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PROCESS_TIMEOUT_MS;
  if (!/^\d+$/.test(value)) {
    throw new Error("LVAU_TIMEOUT_MS must be an integer number of milliseconds");
  }

  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 1_000 || timeout > MAX_PROCESS_TIMEOUT_MS) {
    throw new Error(
      `LVAU_TIMEOUT_MS must be between 1000 and ${MAX_PROCESS_TIMEOUT_MS}`,
    );
  }
  return timeout;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT must be an integer from 0 through 65535");
  }
  return port;
}
