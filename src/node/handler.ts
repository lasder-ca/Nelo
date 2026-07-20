import type { IncomingMessage, ServerResponse } from "node:http";
import { type RequestDiagnosticsListener, responseLifetime } from "../lifetime/request-lifetime.ts";
import { monitorDisconnect } from "./disconnect.ts";
import { type NodeDeliveryHooks, type NodeDeliveryResult, writeNodeResponse } from "./delivery.ts";
import { MalformedNodeRequestError } from "./errors.ts";
import { createWebRequest, type NodeRequestOptions } from "./request.ts";

export interface FetchApplication {
  fetch(request: Request): Promise<Response>;
}

export interface NodeAdapterDiagnostics {
  readonly onDelivery?: (result: NodeDeliveryResult) => void;
  readonly onError?: (error: unknown) => void;
  readonly onRequestDiagnostics?: RequestDiagnosticsListener;
}

export interface NodeExchangeHooks extends NodeDeliveryHooks, NodeAdapterDiagnostics {}

export async function handleNodeExchange(
  app: FetchApplication,
  request: IncomingMessage,
  response: ServerResponse,
  controller: AbortController,
  options: NodeRequestOptions = {},
  hooks: NodeExchangeHooks = {},
): Promise<NodeDeliveryResult> {
  const monitor = monitorDisconnect(request, response, controller);
  try {
    let webRequest: Request;
    try {
      webRequest = createWebRequest(request, controller.signal, options);
    } catch (error) {
      if (!(error instanceof MalformedNodeRequestError)) throw error;
      const result = await writeNodeResponse(
        request.method ?? "GET",
        new Response("Bad Request", { status: 400 }),
        response,
        controller.signal,
        hooks,
      );
      reportDelivery(hooks, result);
      return result;
    }

    const webResponse = await app.fetch(webRequest);
    const lifetime = responseLifetime(webResponse);
    const unsubscribe = hooks.onRequestDiagnostics === undefined
      ? undefined
      : lifetime?.subscribe(hooks.onRequestDiagnostics);
    const result = await writeNodeResponse(
      webRequest.method,
      webResponse,
      response,
      controller.signal,
      hooks,
    );
    reportDelivery(hooks, result);
    if (result.state === "failed" && result.error !== undefined) reportError(hooks, result.error);
    unsubscribe?.();
    return result;
  } catch (error) {
    reportError(hooks, error);
    if (!response.destroyed) response.destroy(error instanceof Error ? error : undefined);
    const result: NodeDeliveryResult = { state: "failed", error };
    reportDelivery(hooks, result);
    return result;
  } finally {
    monitor.dispose();
  }
}

function reportDelivery(hooks: NodeAdapterDiagnostics, result: NodeDeliveryResult): void {
  try {
    hooks.onDelivery?.(result);
  } catch (error) {
    reportError(hooks, error);
  }
}

function reportError(hooks: NodeAdapterDiagnostics, error: unknown): void {
  try {
    hooks.onError?.(error);
  } catch {
    // Diagnostics are observational and must not alter request settlement.
  }
}
