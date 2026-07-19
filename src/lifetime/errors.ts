export class ScopeClosedError extends Error {
  override readonly name = "ScopeClosedError";
  readonly code = "NELO_SCOPE_001";

  constructor(operation: string) {
    super(`NELO_SCOPE_001: cannot ${operation}: the lifetime scope is not open`);
  }
}

export class UnjoinedTaskError extends Error {
  override readonly name = "UnjoinedTaskError";
  readonly code = "NELO_TASK_001";

  constructor(
    readonly taskNames: readonly string[],
    readonly ancestry: readonly (readonly string[])[],
  ) {
    super(`NELO_TASK_001: lifetime scope completed with unjoined tasks: ${taskNames.join(", ")}`);
  }
}

export class InvalidResourceError extends TypeError {
  override readonly name = "InvalidResourceError";
  readonly code = "NELO_RESOURCE_001";

  constructor(name: string) {
    super(
      `NELO_RESOURCE_001: resource "${name}" must be disposable or have an explicit cleanup callback`,
    );
  }
}

export class InvalidResponseError extends TypeError {
  override readonly name = "InvalidResponseError";
  readonly code = "NELO_DELIVERY_001";

  constructor() {
    super("NELO_DELIVERY_001: a Nelo handler must return a Response");
  }
}

export type NeloDiagnosticError = Error & { readonly code: string };

export function diagnosticCode(error: unknown): string {
  if (
    typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string" && error.code.startsWith("NELO_")
  ) {
    return error.code;
  }
  if (error instanceof AggregateError) {
    for (const nested of error.errors) {
      const code = diagnosticCode(nested);
      if (code !== "NELO_SCOPE_999") return code;
    }
  }
  return "NELO_SCOPE_999";
}
