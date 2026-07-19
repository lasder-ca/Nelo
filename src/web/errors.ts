export class DuplicateRouteError extends Error {
  override readonly name = "DuplicateRouteError";
  readonly code = "NELO_SCOPE_003";

  constructor(method: string, path: string) {
    super(`NELO_SCOPE_003: duplicate route ${method} ${path}`);
  }
}

export class InvalidRouteError extends TypeError {
  override readonly name = "InvalidRouteError";
  readonly code = "NELO_SCOPE_004";

  constructor(message: string) {
    super(`NELO_SCOPE_004: ${message}`);
  }
}

export class MalformedPathError extends URIError {
  override readonly name = "MalformedPathError";
  readonly code = "NELO_SCOPE_005";

  constructor(pathname: string) {
    super(`NELO_SCOPE_005: request path contains invalid percent encoding: ${pathname}`);
  }
}

export class DuplicateNextError extends Error {
  override readonly name = "DuplicateNextError";
  readonly code = "NELO_SCOPE_006";

  constructor() {
    super("NELO_SCOPE_006: middleware next() may only be called once");
  }
}
