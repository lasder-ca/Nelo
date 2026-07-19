export class NodeAdapterError extends Error {
  override readonly name = "NodeAdapterError";
  readonly code = "NELO_ADAPTER_001";

  constructor(message: string, options?: ErrorOptions) {
    super(`NELO_ADAPTER_001: ${message}`, options);
  }
}

export class MalformedNodeRequestError extends TypeError {
  override readonly name = "MalformedNodeRequestError";
  readonly code = "NELO_ADAPTER_002";

  constructor(message: string, options?: ErrorOptions) {
    super(`NELO_ADAPTER_002: ${message}`, options);
  }
}

export class NodeDeliveryError extends Error {
  override readonly name = "NodeDeliveryError";
  readonly code = "NELO_DELIVERY_002";

  constructor(message: string, options?: ErrorOptions) {
    super(`NELO_DELIVERY_002: ${message}`, options);
  }
}
