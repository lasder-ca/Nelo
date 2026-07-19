import type { RuntimeCapabilities } from "../lifetime/capabilities.ts";

export const nodeCapabilities: RuntimeCapabilities = Object.freeze({
  clientDisconnect: "reliable",
  responseDelivery: "body_close_only",
  deferredWork: "unavailable",
  gracefulShutdown: "adapter_managed",
  asyncContext: "explicit_only",
});
