import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { MalformedNodeRequestError } from "./errors.ts";

export interface NodeRequestOptions {
  readonly protocol?: "http" | "https";
}

const HTTP_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const VISIBLE_ASCII = /^[\x21-\x7e]+$/;

export function createWebRequest(
  incoming: IncomingMessage,
  signal: AbortSignal,
  options: NodeRequestOptions = {},
): Request {
  const protocol = options.protocol ?? "http";
  const host = readHost(incoming);
  const base = validateHost(host, protocol);
  const target = validateTarget(incoming.url);
  const url = new URL(target, base);
  if (url.origin !== base.origin) {
    throw new MalformedNodeRequestError("request target must not override the Host header");
  }

  const method = incoming.method?.toUpperCase();
  if (method === undefined || !HTTP_TOKEN.test(method)) {
    throw new MalformedNodeRequestError("request method is missing or invalid");
  }

  const headers = new Headers();
  for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
    const name = incoming.rawHeaders[index];
    const value = incoming.rawHeaders[index + 1];
    if (name !== undefined && value !== undefined) headers.append(name, value);
  }

  const init: RequestInit & { duplex?: "half" } = { method, headers, signal };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  try {
    return new Request(url, init);
  } catch (error) {
    throw new MalformedNodeRequestError("request could not be converted", { cause: error });
  }
}

function readHost(incoming: IncomingMessage): string {
  const hostValues: string[] = [];
  for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
    if (incoming.rawHeaders[index]?.toLowerCase() === "host") {
      const value = incoming.rawHeaders[index + 1];
      if (value !== undefined) hostValues.push(value);
    }
  }
  if (hostValues.length !== 1) {
    throw new MalformedNodeRequestError("exactly one Host header is required");
  }
  return hostValues[0]!;
}

function validateHost(host: string, protocol: "http" | "https"): URL {
  if (
    !VISIBLE_ASCII.test(host) || /[\\/?#@%]/.test(host) || host.length > 255
  ) {
    throw new MalformedNodeRequestError("Host header is invalid");
  }
  try {
    const url = new URL(`${protocol}://${host}/`);
    if (url.hostname.length === 0 || url.username.length > 0 || url.password.length > 0) {
      throw new Error("invalid authority");
    }
    return url;
  } catch (error) {
    throw new MalformedNodeRequestError("Host header is invalid", { cause: error });
  }
}

function validateTarget(target: string | undefined): string {
  if (
    target === undefined || !target.startsWith("/") || target.startsWith("//") ||
    target.includes("#") || hasControlCharacter(target)
  ) {
    throw new MalformedNodeRequestError("request target is invalid");
  }
  return target;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}
