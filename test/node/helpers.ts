import { request as nodeRequest, type RequestOptions } from "node:http";
import { connect } from "node:net";
import type { NeloNodeServer, NodeServerAddress } from "../../src/node/mod.ts";

export interface HttpResult {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: Buffer;
}

export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

export function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

export function httpRequest(
  address: NodeServerAddress,
  options: Omit<RequestOptions, "host" | "port"> = {},
  chunks: readonly (string | Uint8Array)[] = [],
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const request = nodeRequest(
      { host: address.hostname, port: address.port, path: "/", ...options },
      (response) => {
        const body: Buffer[] = [];
        response.on("data", (chunk: Buffer) => body.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(body),
          }));
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    for (const chunk of chunks) request.write(chunk);
    request.end();
  });
}

export function rawHttpRequest(address: NodeServerAddress, requestText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(address.port, address.hostname);
    const chunks: Buffer[] = [];
    socket.on("connect", () => socket.end(requestText));
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("end", () => resolve(Buffer.concat(chunks).toString("latin1")));
    socket.on("error", reject);
  });
}

export async function closeServer(server: NeloNodeServer): Promise<void> {
  await server.close({ gracePeriod: 200, forceAfter: 2_000 });
  await server.closed;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  duration = 5_000,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), duration);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
