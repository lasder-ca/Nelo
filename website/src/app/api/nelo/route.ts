import { Nelo } from "nelo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_PATH = "/api/nelo";
const NELO_VERSION = "0.2.0-alpha.1";

type Scenario = "health" | "tasks" | "resource" | "delivery";

type LabEvent = {
  label: string;
  atMs: number;
  detail?: unknown;
};

class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const scenario = parseScenario(new URL(request.url).searchParams.get("scenario"));

    if (scenario === "delivery") {
      return runDeliveryScenario(request);
    }

    return runJsonScenario(request);
  } catch (error) {
    if (error instanceof InputError) {
      return Response.json(
        { error: error.message },
        {
          status: 400,
          headers: labHeaders(),
        },
      );
    }

    throw error;
  }
}

async function runJsonScenario(request: Request): Promise<Response> {
  const startedAt = performance.now();
  const events: LabEvent[] = [];
  let finalDiagnostics: Record<string, unknown> | null = null;

  const mark = (label: string, detail?: unknown): void => {
    events.push({
      label,
      atMs: elapsed(startedAt),
      ...(detail === undefined ? {} : { detail }),
    });
  };

  const app = new Nelo({
    mode: "test",
    diagnostics(snapshot) {
      finalDiagnostics = {
        state: snapshot.state,
        handlerTasks: snapshot.handlerTasks,
        deliveryTasks: snapshot.deliveryTasks,
        handlerResources: snapshot.handlerResources,
        deliveryResources: snapshot.deliveryResources,
        pendingHandlerTasks: snapshot.pendingHandlerTasks,
        pendingDeliveryTasks: snapshot.pendingDeliveryTasks,
        cleanupFailures: snapshot.cleanupFailures.length,
        forcedTermination: snapshot.forcedTermination,
      };
    },
    onError(error, context) {
      if (error instanceof InputError) {
        return context.json({ error: error.message }, 400);
      }

      return context.json({ error: "The live Nelo request failed" }, 500);
    },
  });

  app.get(API_PATH, async (context) => {
    const url = new URL(context.req.url);
    const scenario = parseScenario(url.searchParams.get("scenario"));
    mark("request:accepted", { scenario });

    if (scenario === "health") {
      return context.json({
        scenario,
        ok: true,
        runtime: {
          node: process.version,
          nelo: NELO_VERSION,
        },
      });
    }

    if (scenario === "tasks") {
      const delay = readInteger(url, "delay", 350, 10, 3_000);
      const profile = context.fork("load-profile", async (signal) => {
        mark("task:start", { task: "load-profile", delayMs: delay });
        await wait(delay, signal);
        mark("task:complete", { task: "load-profile" });
        return { id: "user-42", name: "Nelo user" };
      });
      const activity = context.fork("load-activity", async (signal) => {
        const activityDelay = Math.min(delay + 80, 3_000);
        mark("task:start", { task: "load-activity", delayMs: activityDelay });
        await wait(activityDelay, signal);
        mark("task:complete", { task: "load-activity" });
        return ["request accepted", "owned tasks joined"];
      });

      const [user, recentActivity] = await Promise.all([profile, activity]);
      return context.json({ scenario, user, recentActivity });
    }

    if (scenario === "resource") {
      const connection = await context.use(
        "demo-connection",
        () => {
          mark("resource:acquire", { resource: "demo-connection" });
          return { id: "connection-1" };
        },
        () => {
          mark("resource:cleanup", { resource: "demo-connection" });
        },
      );

      mark("resource:use", { id: connection.id });
      return context.json({ scenario, result: "query complete", resourceId: connection.id });
    }

    throw new InputError("The delivery scenario must use the streaming endpoint");
  });

  const response = await app.fetch(request);
  const body = await response.text();
  const payload = parseJsonObject(body);

  return Response.json(
    {
      ...payload,
      lifecycle: events,
      diagnostics: finalDiagnostics,
    },
    {
      status: response.status,
      headers: {
        ...labHeaders(),
        "server-timing": `nelo;dur=${elapsed(startedAt)}`,
      },
    },
  );
}

async function runDeliveryScenario(request: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const app = new Nelo({ mode: "test" });

  app.get(API_PATH, (context) => {
    const url = new URL(context.req.url);
    const delay = readInteger(url, "delay", 220, 20, 1_000);
    const chunks = readInteger(url, "chunks", 5, 2, 10);
    let nextChunk = 1;

    context.delivery.use(() => {
      console.info("Nelo live delivery scope closed", {
        aborted: context.delivery.aborted,
        reason: context.delivery.reason,
      });
    });

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encodeLine(encoder, {
            event: "handler:return",
            transport: "next-route-response",
          }),
        );
      },
      async pull(controller) {
        if (nextChunk > chunks) {
          controller.enqueue(
            encodeLine(encoder, {
              event: "delivery:complete",
              chunks,
            }),
          );
          controller.close();
          return;
        }

        await wait(delay, context.delivery.signal);
        controller.enqueue(
          encodeLine(encoder, {
            event: "delivery:chunk",
            chunk: nextChunk++,
          }),
        );
      },
    });

    return new Response(body, {
      headers: {
        ...labHeaders(),
        "content-type": "application/x-ndjson; charset=utf-8",
        "x-nelo-delivery": "transport-owned",
      },
    });
  });

  return app.fetch(request);
}

function parseScenario(value: string | null): Scenario {
  const scenario = value ?? "health";
  if (
    scenario === "health" ||
    scenario === "tasks" ||
    scenario === "resource" ||
    scenario === "delivery"
  ) {
    return scenario;
  }

  throw new InputError(`Unknown scenario: ${scenario}`);
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
    throw new InputError(`${name} must be an integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new InputError(`${name} must be between ${minimum} and ${maximum}`);
  }

  return value;
}

function wait(duration: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, duration);

    function finish(): void {
      signal.removeEventListener("abort", abort);
      resolve();
    }

    function abort(): void {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason ?? new Error("Request cancelled"));
    }

    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function parseJsonObject(body: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(body);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { result: value };
  } catch {
    return { result: body };
  }
}

function encodeLine(encoder: TextEncoder, value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

function labHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-nelo-lab": "1",
  };
}

function elapsed(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}
