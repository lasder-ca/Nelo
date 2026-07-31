import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Nelo } from "@lasder/nelo";
import { serve } from "@lasder/nelo/node";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const STDERR_LIMIT = 16 * 1024;

const lvauCli = process.env.LVAU_CLI ?? "lvau-cli";
const passwordFile = process.env.LVAU_PASSWORD_FILE;

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
  constructor(message: string, readonly stderr: string) {
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
      return Response.json({ error: "Encryption failed" }, { status: 502 });
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
    )
  );

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
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new HttpError(400, "Invalid Content-Length header");
    }
    if (length > limit) throw new HttpError(413, "Payload is too large");
  }

  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      if (signal.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("payload limit exceeded");
        throw new HttpError(413, "Payload is too large");
      }
      chunks.push(value);
    }
  } finally {
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

function runLvau(args: readonly string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(lvauCli, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });

    let stderr = "";
    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-STDERR_LIMIT);
    });

    const cleanup = (): void => {
      signal.removeEventListener("abort", abort);
      if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
    };

    const finish = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error === undefined) resolve();
      else reject(error);
    };

    const abort = (): void => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill();
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
      forceKillTimer.unref?.();
    };

    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });

    child.once("error", (error) => finish(error));
    child.once("exit", (code, exitSignal) => {
      if (signal.aborted) {
        finish(signal.reason ?? new Error("Lvau process was cancelled"));
        return;
      }
      if (code === 0) {
        finish();
        return;
      }

      const reason = code === null ? `signal ${exitSignal ?? "unknown"}` : `exit code ${code}`;
      finish(new LvauProcessError(`lvau-cli failed with ${reason}`, stderr.trim()));
    });
  });
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT must be an integer from 0 through 65535");
  }
  return port;
}
