import { Buffer } from "node:buffer";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Nelo } from "../mod.ts";
import type { NeloAbortReason } from "../src/lifetime/cancellation.ts";
import { diagnosticCode } from "../src/lifetime/errors.ts";
import type { RequestDiagnostics } from "../src/lifetime/request-lifetime.ts";
import { handleNodeExchange } from "../src/node/handler.ts";
import { MalformedNodeRequestError } from "../src/node/errors.ts";
import { createWebRequest } from "../src/node/request.ts";

const NELO_VERSION = "0.2.0";
const API_PATH = "/api/nelo";

type LabScenario = "health" | "tasks" | "deadline" | "resource" | "delivery";

export interface LabEvent {
  readonly label: string;
  readonly atMs: number;
  readonly detail?: unknown;
}

export type LabEventListener = (event: LabEvent) => void;

class LabInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabInputError";
  }
}

export async function handleNeloLabRequest(request: Request): Promise<Response> {
  const startedAt = performance.now();
  const events: LabEvent[] = [];
  const diagnostics: RequestDiagnostics[] = [];

  const mark = createEventMarker(startedAt, (event) => events.push(event));
  const app = createJsonLabApplication(mark, diagnostics);
  const neloResponse = await app.fetch(request);
  const originalBody = await neloResponse.text();
  const payload = parseResponseBody(originalBody, neloResponse.headers.get("content-type"));
  const finalDiagnostics = diagnostics.at(-1);

  return Response.json(
    {
      ...payload,
      lifecycle: events,
      diagnostics: finalDiagnostics === undefined ? null : summariseDiagnostics(finalDiagnostics),
    },
    {
      status: neloResponse.status,
      headers: {
        "cache-control": "no-store",
        "server-timing": `nelo;dur=${elapsed(startedAt)}`,
        "x-content-type-options": "nosniff",
        "x-nelo-lab": "1",
      },
    },
  );
}

export function createDeliveryLabApplication(listener: LabEventListener = () => undefined): Nelo {
  const startedAt = performance.now();
  const mark = createEventMarker(startedAt, listener);
  const encoder = new TextEncoder();
  const app = new Nelo({
    mode: "test",
    diagnostics(snapshot) {
      mark("diagnostics", {
        state: snapshot.state,
        pendingDeliveryTasks: snapshot.pendingDeliveryTasks,
        abortReason: serialiseReason(snapshot.abortReason),
      });
    },
    onError(error, context) {
      if (error instanceof LabInputError) {
        return context.json({ error: error.message }, 400);
      }
      return context.json(
        { error: "The Nelo delivery lab failed", code: diagnosticCode(error) },
        500,
      );
    },
  });

  app.get(API_PATH, (context) => {
    const url = new URL(context.req.url);
    const scenario = parseScenario(url.searchParams.get("scenario"));
    if (scenario !== "delivery") {
      throw new LabInputError("The transport endpoint only accepts scenario=delivery");
    }

    const delay = readInteger(url, "delay", 250, 10, 1_000);
    const chunkCount = readInteger(url, "chunks", 6, 2, 12);
    let nextChunk = 1;

    mark("request:accepted", { scenario, delayMs: delay, chunks: chunkCount });
    context.delivery.use(() => {
      mark("delivery:cleanup", {
        reason: serialiseReason(context.delivery.reason),
      });
    });
    mark("handler:return", { transport: "node-server-response" });

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encodeLine(encoder, {
            event: "handler:return",
            transport: "node-server-response",
          }),
        );
      },
      async pull(controller) {
        if (nextChunk > chunkCount) {
          mark("delivery:body-complete", { chunks: chunkCount });
          controller.enqueue(
            encodeLine(encoder, {
              event: "delivery:body-complete",
              chunks: chunkCount,
            }),
          );
          controller.close();
          return;
        }

        await wait(
          delay,
          context.delivery.signal,
          () =>
            mark("delivery:abort", {
              reason: serialiseReason(context.delivery.reason),
            }),
        );
        const chunk = nextChunk++;
        mark("delivery:chunk", { chunk });
        controller.enqueue(encodeLine(encoder, { event: "delivery:chunk", chunk }));
      },
      cancel(reason) {
        mark("delivery:stream-cancel", { reason: serialiseReason(reason) });
      },
    });

    return new Response(body, {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/x-ndjson; charset=utf-8",
        "x-content-type-options": "nosniff",
        "x-nelo-delivery": "transport-owned",
        "x-nelo-lab": "1",
      },
    });
  });

  return app;
}

export default async function neloLabHandler(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  if (requestedScenario(incoming) === "delivery") {
    await handleNodeExchange(
      createDeliveryLabApplication((event) => {
        console.info(JSON.stringify({ source: "nelo-live-lab", ...event }));
      }),
      incoming,
      outgoing,
      new AbortController(),
      { protocol: requestProtocol(incoming) },
      {
        onError(error) {
          console.error("Nelo delivery lab failed", error);
        },
      },
    );
    return;
  }

  await writeBufferedLabResponse(incoming, outgoing);
}

function createJsonLabApplication(
  mark: (label: string, detail?: unknown) => void,
  diagnostics: RequestDiagnostics[],
): Nelo {
  const app = new Nelo({
    mode: "test",
    diagnostics(snapshot) {
      diagnostics.push(snapshot);
    },
    onError(error, context) {
      if (error instanceof LabInputError) {
        return context.json({ error: error.message }, 400);
      }

      return context.json(
        {
          error: "The Nelo lab request failed",
          code: diagnosticCode(error),
        },
        500,
      );
    },
  });

  app.get(API_PATH, async (context) => {
    const url = new URL(context.req.url);
    const scenario = parseScenario(url.searchParams.get("scenario"));
    mark("request:accepted", { scenario });

    switch (scenario) {
      case "health":
        return context.json({
          scenario,
          ok: true,
          runtime: {
            node: process.version,
            nelo: NELO_VERSION,
          },
        });

      case "tasks": {
        const delay = readInteger(url, "delay", 350, 10, 4_000);
        const profile = context.fork("load-profile", async (signal) => {
          mark("task:start", { task: "load-profile", delayMs: delay });
          await wait(delay, signal, () => mark("task:cancel", { task: "load-profile" }));
          mark("task:complete", { task: "load-profile" });
          return { id: "user-42", name: "Nelo user" };
        });
        const activity = context.fork("load-activity", async (signal) => {
          const activityDelay = Math.min(delay + 80, 4_000);
          mark("task:start", { task: "load-activity", delayMs: activityDelay });
          await wait(
            activityDelay,
            signal,
            () => mark("task:cancel", { task: "load-activity" }),
          );
          mark("task:complete", { task: "load-activity" });
          return ["request accepted", "owned tasks joined"];
        });

        const [user, recentActivity] = await Promise.all([profile, activity]);
        return context.json({ scenario, user, recentActivity });
      }

      case "deadline": {
        const work = readInteger(url, "work", 900, 10, 5_000);
        const timeout = readInteger(url, "timeout", 250, 1, 3_000);
        using deadline = context.deadline(timeout);
        mark("deadline:created", {
          timeoutMs: deadline.duration,
          deadline: deadline.deadline,
        });

        try {
          await wait(
            work,
            deadline.signal,
            () => mark("deadline:abort", { reason: serialiseReason(deadline.signal.reason) }),
          );
          mark("work:complete", { workMs: work });
          return context.json({ scenario, expired: false, workMs: work, timeoutMs: timeout });
        } catch (error) {
          if (isDeadlineReason(error)) {
            return context.json(
              {
                scenario,
                expired: true,
                workMs: work,
                timeoutMs: timeout,
                reason: serialiseReason(error),
              },
              504,
            );
          }
          throw error;
        }
      }

      case "resource": {
        const resource = await context.use(
          "demo-connection",
          () => {
            mark("resource:acquire", { resource: "demo-connection" });
            return { id: "connection-1", open: true };
          },
          () => {
            mark("resource:cleanup", { resource: "demo-connection" });
          },
        );
        mark("resource:use", { id: resource.id });
        return context.json({ scenario, result: "query complete", resourceId: resource.id });
      }

      case "delivery":
        throw new LabInputError(
          "The delivery scenario must be called through the live Node transport",
        );
    }
  });

  return app;
}

async function writeBufferedLabResponse(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  const controller = new AbortController();
  const abort = (): void => {
    if (!controller.signal.aborted) controller.abort({ type: "client_disconnect" });
  };
  const close = (): void => {
    if (!incoming.complete) abort();
  };

  incoming.once("aborted", abort);
  incoming.once("close", close);

  try {
    const request = createWebRequest(incoming, controller.signal, {
      protocol: requestProtocol(incoming),
    });
    const response = await handleNeloLabRequest(request);

    outgoing.statusCode = response.status;
    for (const [name, value] of response.headers) outgoing.setHeader(name, value);

    if (incoming.method === "HEAD") {
      outgoing.end();
      return;
    }

    const body = Buffer.from(await response.arrayBuffer());
    outgoing.setHeader("content-length", body.byteLength);
    outgoing.end(body);
  } catch (error) {
    if (error instanceof MalformedNodeRequestError && !outgoing.headersSent) {
      outgoing.statusCode = 400;
      outgoing.setHeader("cache-control", "no-store");
      outgoing.setHeader("content-type", "application/json; charset=utf-8");
      outgoing.setHeader("x-content-type-options", "nosniff");
      outgoing.end(JSON.stringify({ error: "Bad Request" }));
      return;
    }
    if (outgoing.headersSent) {
      outgoing.destroy(error instanceof Error ? error : undefined);
      return;
    }

    outgoing.statusCode = 500;
    outgoing.setHeader("cache-control", "no-store");
    outgoing.setHeader("content-type", "application/json; charset=utf-8");
    outgoing.setHeader("x-content-type-options", "nosniff");
    outgoing.end(JSON.stringify({ error: "Unable to execute the Nelo lab" }));
  } finally {
    incoming.removeListener("aborted", abort);
    incoming.removeListener("close", close);
  }
}

function parseScenario(value: string | null): LabScenario {
  const scenario = value ?? "health";
  if (
    scenario === "health" || scenario === "tasks" || scenario === "deadline" ||
    scenario === "resource" || scenario === "delivery"
  ) {
    return scenario;
  }
  throw new LabInputError(`Unknown scenario: ${scenario}`);
}

function requestedScenario(request: IncomingMessage): string | null {
  try {
    return new URL(request.url ?? API_PATH, "https://nelo.invalid").searchParams.get("scenario");
  } catch {
    return null;
  }
}

function readInteger(
  url: URL,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new LabInputError(`${name} must be an integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new LabInputError(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function wait(
  duration: number,
  signal: AbortSignal,
  onAbort: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      operation();
    };
    const abort = (): void => {
      finish(() => {
        onAbort();
        reject(signal.reason ?? new Error("Operation was cancelled"));
      });
    };
    const timer = setTimeout(() => finish(resolve), duration);

    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function createEventMarker(
  startedAt: number,
  listener: LabEventListener,
): (label: string, detail?: unknown) => void {
  return (label, detail) => {
    listener({
      label,
      atMs: elapsed(startedAt),
      ...(detail === undefined ? {} : { detail }),
    });
  };
}

function elapsed(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function encodeLine(encoder: TextEncoder, value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

function isDeadlineReason(value: unknown): value is Extract<NeloAbortReason, { type: "deadline" }> {
  return typeof value === "object" && value !== null && "type" in value &&
    value.type === "deadline" && "deadline" in value && typeof value.deadline === "number";
}

function serialiseReason(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return value instanceof Error ? { name: value.name, message: value.message } : value;
  }

  const type = typeof value.type === "string" ? value.type : "unknown";
  if (type === "deadline" && "deadline" in value && typeof value.deadline === "number") {
    return { type, deadline: value.deadline };
  }
  return { type };
}

function parseResponseBody(body: string, contentType: string | null): Record<string, unknown> {
  if (contentType?.includes("application/json")) {
    try {
      const value: unknown = JSON.parse(body);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
      return { result: value };
    } catch {
      return { result: body };
    }
  }
  return { result: body };
}

function summariseDiagnostics(diagnostics: RequestDiagnostics): Record<string, unknown> {
  return {
    state: diagnostics.state,
    handlerTasks: diagnostics.handlerTasks,
    deliveryTasks: diagnostics.deliveryTasks,
    handlerResources: diagnostics.handlerResources,
    deliveryResources: diagnostics.deliveryResources,
    pendingHandlerTasks: diagnostics.pendingHandlerTasks,
    pendingDeliveryTasks: diagnostics.pendingDeliveryTasks,
    forcedTermination: diagnostics.forcedTermination,
    ...(diagnostics.abortReason === undefined
      ? {}
      : { abortReason: serialiseReason(diagnostics.abortReason) }),
    cleanupFailures: diagnostics.cleanupFailures.length,
  };
}

function requestProtocol(request: IncomingMessage): "http" | "https" {
  return firstHeader(request.headers["x-forwarded-proto"]) === "http" ? "http" : "https";
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.split(",", 1)[0]?.trim();
}
