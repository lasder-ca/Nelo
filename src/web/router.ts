import { DuplicateRouteError, InvalidRouteError, MalformedPathError } from "./errors.ts";
import type { NeloHandler, NeloMiddleware } from "./types.ts";

interface StaticSegment {
  readonly type: "static";
  readonly value: string;
}

interface ParameterSegment {
  readonly type: "parameter";
  readonly name: string;
}

type RouteSegment = StaticSegment | ParameterSegment;

export interface RouteMatch {
  readonly type: "match";
  readonly params: Readonly<Record<string, string>>;
  readonly middleware: readonly NeloMiddleware[];
  readonly handler: NeloHandler;
}

export interface MethodNotAllowedMatch {
  readonly type: "method_not_allowed";
  readonly allowed: readonly string[];
}

export interface NotFoundMatch {
  readonly type: "not_found";
}

export type RouterMatch = RouteMatch | MethodNotAllowedMatch | NotFoundMatch;

interface Route {
  readonly method: string;
  readonly path: string;
  readonly signature: string;
  readonly segments: readonly RouteSegment[];
  readonly middleware: readonly NeloMiddleware[];
  readonly handler: NeloHandler;
  readonly order: number;
  readonly staticCount: number;
}

const METHOD_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const PARAMETER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class Router {
  readonly #routes: Route[] = [];

  add(
    method: string,
    path: string,
    middleware: readonly NeloMiddleware[],
    handler: NeloHandler,
  ): void {
    const normalizedMethod = normalizeMethod(method);
    const segments = parseRoutePath(path);
    const signature = segments
      .map((segment) => segment.type === "static" ? `s:${segment.value}` : "p:")
      .join("/");

    if (
      this.#routes.some((route) =>
        route.method === normalizedMethod && route.signature === signature
      )
    ) {
      throw new DuplicateRouteError(normalizedMethod, path);
    }

    this.#routes.push({
      method: normalizedMethod,
      path,
      signature,
      segments,
      middleware: [...middleware],
      handler,
      order: this.#routes.length,
      staticCount: segments.filter((segment) => segment.type === "static").length,
    });
  }

  match(method: string, pathname: string): RouterMatch {
    const normalizedMethod = normalizeMethod(method);
    const pathSegments = decodePath(pathname);
    const pathCandidates = this.#routes
      .map((route) => ({ route, params: matchSegments(route.segments, pathSegments) }))
      .filter((candidate) => candidate.params !== undefined);

    const methodCandidates = pathCandidates
      .filter(({ route }) => route.method === normalizedMethod)
      .sort((left, right) =>
        right.route.staticCount - left.route.staticCount || left.route.order - right.route.order
      );
    const selected = methodCandidates[0];
    if (selected !== undefined) {
      return {
        type: "match",
        params: Object.freeze(selected.params!),
        middleware: selected.route.middleware,
        handler: selected.route.handler,
      };
    }
    if (pathCandidates.length > 0) {
      return {
        type: "method_not_allowed",
        allowed: [...new Set(pathCandidates.map(({ route }) => route.method))].sort(),
      };
    }
    return { type: "not_found" };
  }
}

function normalizeMethod(method: string): string {
  if (!METHOD_PATTERN.test(method)) {
    throw new InvalidRouteError(`invalid HTTP method: ${method}`);
  }
  return method.toUpperCase();
}

function parseRoutePath(path: string): readonly RouteSegment[] {
  if (!path.startsWith("/")) throw new InvalidRouteError(`route path must start with "/": ${path}`);
  return decodePath(path).map((segment) => {
    if (!segment.startsWith(":")) return { type: "static", value: segment };
    const name = segment.slice(1);
    if (!PARAMETER_PATTERN.test(name)) {
      throw new InvalidRouteError(`invalid route parameter in path: ${path}`);
    }
    return { type: "parameter", name };
  });
}

function decodePath(pathname: string): readonly string[] {
  if (pathname === "/") return [];
  const rawSegments = pathname.slice(1).split("/");
  try {
    return rawSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    throw new MalformedPathError(pathname);
  }
}

function matchSegments(
  route: readonly RouteSegment[],
  path: readonly string[],
): Record<string, string> | undefined {
  if (route.length !== path.length) return undefined;
  const params: Record<string, string> = {};
  for (let index = 0; index < route.length; index++) {
    const routeSegment = route[index]!;
    const pathSegment = path[index]!;
    if (routeSegment.type === "static") {
      if (routeSegment.value !== pathSegment) return undefined;
    } else {
      params[routeSegment.name] = pathSegment;
    }
  }
  return params;
}
