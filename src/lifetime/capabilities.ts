export interface RuntimeCapabilities {
  readonly clientDisconnect: "reliable" | "best_effort" | "unavailable";
  readonly responseDelivery: "full" | "body_close_only" | "unavailable";
  readonly deferredWork: "native" | "process_tracked" | "unavailable";
  readonly gracefulShutdown: "native" | "adapter_managed" | "unavailable";
  readonly asyncContext: "native" | "polyfilled" | "explicit_only";
}
