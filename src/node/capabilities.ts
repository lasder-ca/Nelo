import type { RuntimeCapabilities } from "../lifetime/capabilities.ts";

export const nodeCapabilities: RuntimeCapabilities = Object.freeze({
  clientDisconnect: "reliable",
  responseDelivery: "body_close_only",
  deferredWork: "process_tracked",
  gracefulShutdown: "adapter_managed",
  asyncContext: "explicit_only",
});
