import { createServer, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import type { CancellationReason } from "../lifetime/cancellation.ts";
import { abortOnce } from "./disconnect.ts";
import { NodeAdapterError } from "./errors.ts";
import {
  type FetchApplication,
  handleNodeExchange,
  type NodeAdapterDiagnostics,
} from "./handler.ts";

export interface NodeServerAddress {
  readonly hostname: string;
  readonly port: number;
  readonly family: string;
}

export interface NodeCloseOptions {
  readonly gracePeriod?: number;
  readonly forceAfter?: number;
}

export interface NodeServeOptions {
  readonly hostname?: string;
  readonly port?: number;
  readonly protocol?: "http" | "https";
  readonly diagnostics?: NodeAdapterDiagnostics;
}

export interface NeloNodeServer {
  readonly address: NodeServerAddress | null;
  readonly closed: Promise<void>;
  listen(): Promise<NodeServerAddress>;
  close(options?: NodeCloseOptions): Promise<void>;
}

type ServerState = "idle" | "starting" | "listening" | "closing" | "closed" | "failed";

interface ActiveExchange {
  readonly controller: AbortController;
  readonly settled: Promise<void>;
}

export function serve(app: FetchApplication, options: NodeServeOptions = {}): NeloNodeServer {
  return new NodeServer(app, options);
}

class NodeServer implements NeloNodeServer {
  readonly #server: Server;
  readonly #sockets = new Set<Socket>();
  readonly #active = new Set<ActiveExchange>();
  readonly #emptyWaiters = new Set<() => void>();
  readonly #options:
    & Required<Pick<NodeServeOptions, "hostname" | "port" | "protocol">>
    & Pick<NodeServeOptions, "diagnostics">;
  readonly #closedDeferred = deferred<void>();
  #state: ServerState = "idle";
  #listenPromise?: Promise<NodeServerAddress>;
  #closePromise?: Promise<void>;
  #failure?: unknown;

  readonly closed: Promise<void>;

  constructor(app: FetchApplication, options: NodeServeOptions) {
    this.#options = {
      hostname: options.hostname ?? "127.0.0.1",
      port: options.port ?? 3000,
      protocol: options.protocol ?? "http",
      diagnostics: options.diagnostics,
    };
    validatePort(this.#options.port);
    this.closed = this.#closedDeferred.promise;
    this.closed.catch(() => undefined);
    this.#server = createServer((request, response) => {
      if (this.#state === "closing" || this.#state === "closed") {
        response.setHeader("connection", "close");
        response.writeHead(503).end("Server is shutting down");
        return;
      }
      const controller = new AbortController();
      const exchange: ActiveExchange = {
        controller,
        settled: handleNodeExchange(
          app,
          request,
          response,
          controller,
          { protocol: this.#options.protocol },
          this.#options.diagnostics,
        ).then(() => undefined),
      };
      this.#active.add(exchange);
      exchange.settled.then(
        () => this.#removeExchange(exchange),
        (error: unknown) => {
          this.#notifyError(error);
          this.#removeExchange(exchange);
        },
      ).catch(() => undefined);
    });
    this.#server.on("connection", (socket) => {
      this.#sockets.add(socket);
      socket.once("close", () => this.#sockets.delete(socket));
    });
    this.#server.on("error", (error) => {
      if (this.#state === "listening" || this.#state === "closing") {
        this.#abortActive({ type: "server_shutdown" });
        this.#fail(error);
      }
    });
  }

  get address(): NodeServerAddress | null {
    const address = this.#server.address();
    if (address === null || typeof address === "string") return null;
    return toPublicAddress(address);
  }

  listen(): Promise<NodeServerAddress> {
    if (this.#state === "closing" || this.#state === "closed" || this.#state === "failed") {
      return Promise.reject(new NodeAdapterError(`cannot listen while server is ${this.#state}`));
    }
    if (this.#listenPromise !== undefined) return this.#listenPromise;
    if (this.#state !== "idle") {
      return Promise.reject(new NodeAdapterError(`cannot listen while server is ${this.#state}`));
    }
    this.#state = "starting";
    this.#listenPromise = new Promise<NodeServerAddress>((resolve, reject) => {
      const cleanup = (): void => {
        this.#server.off("listening", onListening);
        this.#server.off("error", onError);
      };
      const onListening = (): void => {
        cleanup();
        this.#state = "listening";
        const address = this.address;
        if (address === null) {
          const error = new NodeAdapterError("server listened without a TCP address");
          this.#fail(error);
          reject(error);
        } else resolve(address);
      };
      const onError = (error: Error): void => {
        cleanup();
        this.#fail(error);
        reject(error);
      };
      this.#server.once("listening", onListening);
      this.#server.once("error", onError);
      this.#server.listen({ host: this.#options.hostname, port: this.#options.port });
    });
    this.#listenPromise.catch(() => undefined);
    return this.#listenPromise;
  }

  close(options: NodeCloseOptions = {}): Promise<void> {
    if (this.#closePromise !== undefined) return this.#closePromise;
    if (this.#state === "idle") {
      this.#state = "closed";
      this.#closedDeferred.resolve();
      this.#closePromise = Promise.resolve();
      return this.#closePromise;
    }
    if (this.#state === "failed") {
      this.#closePromise = Promise.reject(this.#failure);
      this.#closePromise.catch(() => undefined);
      return this.#closePromise;
    }
    const gracePeriod = options.gracePeriod ?? 5_000;
    const forceAfter = options.forceAfter ?? 10_000;
    validateShutdown(gracePeriod, forceAfter);
    if (this.#state === "starting") {
      this.#closePromise = this.#listenPromise!.then(() => {
        this.#state = "closing";
        return this.#shutdown(gracePeriod, forceAfter);
      });
      this.#closePromise.catch(() => undefined);
      return this.#closePromise;
    }
    this.#state = "closing";
    this.#closePromise = this.#shutdown(gracePeriod, forceAfter);
    this.#closePromise.catch(() => undefined);
    return this.#closePromise;
  }

  async #shutdown(gracePeriod: number, forceAfter: number): Promise<void> {
    const startedAt = Date.now();
    const serverClosed = new Promise<void>((resolve, reject) => {
      this.#server.close((error) => error === undefined ? resolve() : reject(error));
      this.#server.closeIdleConnections();
    });
    try {
      const graceful = await waitWithin(this.#whenEmpty(), gracePeriod);
      if (!graceful) this.#abortActive({ type: "server_shutdown" });

      const remaining = Math.max(0, forceAfter - (Date.now() - startedAt));
      const settled = await waitWithin(Promise.all([this.#whenEmpty(), serverClosed]), remaining);
      if (!settled) {
        for (const socket of this.#sockets) socket.destroy();
        this.#server.closeAllConnections();
        await serverClosed;
      }
      this.#state = "closed";
      this.#closedDeferred.resolve();
    } catch (error) {
      this.#fail(error);
      throw error;
    }
  }

  #abortActive(reason: CancellationReason): void {
    for (const exchange of this.#active) abortOnce(exchange.controller, reason);
  }

  #removeExchange(exchange: ActiveExchange): void {
    this.#active.delete(exchange);
    if (this.#active.size === 0) {
      if (this.#state === "closing") this.#server.closeIdleConnections();
      for (const resolve of this.#emptyWaiters) resolve();
      this.#emptyWaiters.clear();
    }
  }

  #whenEmpty(): Promise<void> {
    if (this.#active.size === 0) return Promise.resolve();
    return new Promise((resolve) => this.#emptyWaiters.add(resolve));
  }

  #fail(error: unknown): void {
    if (this.#state === "failed") return;
    this.#failure = error;
    this.#state = "failed";
    this.#closedDeferred.reject(error);
    this.#notifyError(error);
  }

  #notifyError(error: unknown): void {
    try {
      this.#options.diagnostics?.onError?.(error);
    } catch {
      // Diagnostics are observational and must not corrupt the server lifecycle.
    }
  }
}

function toPublicAddress(address: AddressInfo): NodeServerAddress {
  return { hostname: address.address, port: address.port, family: address.family };
}

function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new NodeAdapterError("port must be an integer from 0 through 65535");
  }
}

function validateShutdown(gracePeriod: number, forceAfter: number): void {
  if (!Number.isFinite(gracePeriod) || gracePeriod < 0) {
    throw new NodeAdapterError("gracePeriod must be a non-negative finite number");
  }
  if (!Number.isFinite(forceAfter) || forceAfter < gracePeriod) {
    throw new NodeAdapterError("forceAfter must be finite and at least gracePeriod");
  }
}

async function waitWithin(promise: Promise<unknown>, duration: number): Promise<boolean> {
  if (duration === 0) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then(() => true),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), duration);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}
