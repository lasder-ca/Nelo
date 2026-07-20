import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type { CancellationReason } from "../lifetime/cancellation.ts";

export interface DisconnectMonitor {
  dispose(): void;
}

export function monitorDisconnect(
  request: IncomingMessage,
  response: ServerResponse,
  controller: AbortController,
): DisconnectMonitor {
  const socket: Socket = request.socket;
  const disconnect = (): void => abortOnce(controller, { type: "client_disconnect" });
  const requestError = (error: Error): void =>
    abortOnce(controller, { type: "request_error", error });
  const deliveryError = (error: Error): void =>
    abortOnce(controller, { type: "delivery_error", error });
  const onRequestClose = (): void => {
    if (!request.complete) disconnect();
  };
  const onResponseClose = (): void => {
    if (!response.writableFinished) disconnect();
  };
  const onSocketClose = (): void => {
    if (!response.writableFinished) disconnect();
  };

  request.on("aborted", disconnect);
  request.on("error", requestError);
  request.on("close", onRequestClose);
  response.on("error", deliveryError);
  response.on("close", onResponseClose);
  socket.on("close", onSocketClose);

  return {
    dispose() {
      request.off("aborted", disconnect);
      request.off("error", requestError);
      request.off("close", onRequestClose);
      response.off("error", deliveryError);
      response.off("close", onResponseClose);
      socket.off("close", onSocketClose);
    },
  };
}

export function abortOnce(controller: AbortController, reason: CancellationReason): void {
  if (!controller.signal.aborted) controller.abort(reason);
}
