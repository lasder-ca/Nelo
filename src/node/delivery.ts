import type { ServerResponse } from "node:http";
import type { CancellationReason } from "../lifetime/cancellation.ts";
import { isCancellationReason } from "../lifetime/cancellation.ts";
import { NodeDeliveryError } from "./errors.ts";

export type NodeDeliveryState =
  | "pending"
  | "finished"
  | "client_disconnected"
  | "failed";

export interface NodeDeliveryResult {
  readonly state: Exclude<NodeDeliveryState, "pending">;
  readonly error?: unknown;
}

export interface NodeDeliveryHooks {
  readonly onBackpressure?: () => void;
}

export async function writeNodeResponse(
  method: string,
  webResponse: Response,
  nodeResponse: ServerResponse,
  signal: AbortSignal,
  hooks: NodeDeliveryHooks = {},
): Promise<NodeDeliveryResult> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let cancellation: Promise<void> | undefined;
  let cancellationFailure: unknown;
  const cancelReader = (): void => {
    if (reader === undefined || cancellation !== undefined) return;
    cancellation = reader.cancel(signal.reason).catch((error: unknown) => {
      cancellationFailure = error;
    });
  };

  try {
    applyStatusAndHeaders(webResponse, nodeResponse);
    const suppressBody = method === "HEAD" || webResponse.status === 204 ||
      webResponse.status === 304;
    if (suppressBody || webResponse.body === null) {
      if (webResponse.body !== null) await webResponse.body.cancel();
      nodeResponse.end();
      await waitForFinish(nodeResponse, signal);
      return { state: "finished" };
    }

    reader = webResponse.body.getReader();
    if (signal.aborted) cancelReader();
    else signal.addEventListener("abort", cancelReader, { once: true });

    while (true) {
      if (signal.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (done) break;
      if (!nodeResponse.write(value)) {
        hooks.onBackpressure?.();
        await waitForDrain(nodeResponse, signal);
      }
    }
    nodeResponse.end();
    await waitForFinish(nodeResponse, signal);
    return { state: "finished" };
  } catch (error) {
    if (reader !== undefined && cancellation === undefined) {
      cancellation = reader.cancel(error).catch((cancelError: unknown) => {
        cancellationFailure = cancelError;
      });
    }
    if (cancellation !== undefined) await cancellation;
    const combined = cancellationFailure === undefined || cancellationFailure === error
      ? error
      : new AggregateError([error, cancellationFailure], "Nelo Node delivery cancellation failed", {
        cause: error,
      });
    const reason = cancellationReason(signal);
    if (!nodeResponse.destroyed) {
      if (reason?.type === "server_shutdown") nodeResponse.end();
      else nodeResponse.destroy(combined instanceof Error ? combined : undefined);
    }
    return reason?.type === "client_disconnect"
      ? { state: "client_disconnected", error: combined }
      : { state: "failed", error: combined };
  } finally {
    signal.removeEventListener("abort", cancelReader);
    if (cancellation !== undefined) await cancellation;
    try {
      reader?.releaseLock();
    } catch {
      // A released or errored reader owns no further delivery work.
    }
  }
}

function applyStatusAndHeaders(webResponse: Response, nodeResponse: ServerResponse): void {
  nodeResponse.statusCode = webResponse.status;
  if (webResponse.statusText.length > 0 && !hasControlCharacter(webResponse.statusText)) {
    nodeResponse.statusMessage = webResponse.statusText;
  }

  const headerWithCookies = webResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = headerWithCookies.getSetCookie?.() ?? [];
  for (const [name, value] of webResponse.headers) {
    if (name.toLowerCase() !== "set-cookie") nodeResponse.setHeader(name, value);
  }
  if (cookies.length > 0) nodeResponse.setHeader("set-cookie", cookies);
}

function waitForDrain(response: ServerResponse, signal: AbortSignal): Promise<void> {
  return waitForEvent(response, "drain", signal);
}

function waitForFinish(response: ServerResponse, signal: AbortSignal): Promise<void> {
  if (response.writableFinished) return Promise.resolve();
  return waitForEvent(response, "finish", signal);
}

function waitForEvent(
  response: ServerResponse,
  event: "drain" | "finish",
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      response.off(event, onEvent);
      response.off("close", onClose);
      response.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onEvent = (): void => {
      cleanup();
      resolve();
    };
    const onClose = (): void => {
      cleanup();
      reject(signal.aborted ? signal.reason : new NodeDeliveryError("response closed early"));
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onAbort = (): void => {
      cleanup();
      reject(signal.reason);
    };
    response.once(event, onEvent);
    response.once("close", onClose);
    response.once("error", onError);
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

function cancellationReason(signal: AbortSignal): CancellationReason | undefined {
  return signal.aborted && isCancellationReason(signal.reason) ? signal.reason : undefined;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}
