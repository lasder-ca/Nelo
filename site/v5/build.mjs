import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";

const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
if (!Array.isArray(manifest.segments)) throw new Error("Invalid bundle manifest");

const chunks = [];
for (const segment of manifest.segments) {
  if (!segment || typeof segment.file !== "string") throw new Error("Invalid bundle segment");

  const value = (await readFile(new URL(`./${segment.file}`, import.meta.url), "utf8")).trim();
  if (segment.encoding === "text") {
    chunks.push(value);
    continue;
  }
  if (segment.encoding === "hex") {
    if (value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) {
      throw new Error(`Invalid hex segment: ${segment.file}`);
    }
    chunks.push(Buffer.from(value, "hex").toString("utf8"));
    continue;
  }
  throw new Error(`Unsupported segment encoding: ${segment.encoding}`);
}

// Segment transport may introduce line breaks. The cryptographic hashes below are the
// authoritative integrity checks, so normalize whitespace before strict base64 validation.
const encoded = chunks.join("").replace(/\s+/g, "");
if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
  throw new Error("Invalid base64 bundle");
}

const compressed = Buffer.from(encoded, "base64");
if (compressed.toString("base64") !== encoded) throw new Error("Non-canonical base64 bundle");

const gzipHash = createHash("sha256").update(compressed).digest("hex");
if (gzipHash !== manifest.gzip_sha256) throw new Error(`Bundle checksum mismatch: ${gzipHash}`);

const raw = gunzipSync(compressed);
const rawHash = createHash("sha256").update(raw).digest("hex");
if (rawHash !== manifest.raw_sha256) throw new Error(`Payload checksum mismatch: ${rawHash}`);

const files = JSON.parse(raw.toString("utf8"));
if (!files || typeof files !== "object" || Array.isArray(files)) {
  throw new Error("Invalid bundle payload");
}
if (Object.keys(files).length !== manifest.files) throw new Error("File count mismatch");

const outputRoot = resolve("dist");
await rm(outputRoot, { recursive: true, force: true });
for (const [path, data] of Object.entries(files)) {
  if (!path || path.includes("\\") || typeof data !== "string") {
    throw new Error(`Invalid output entry: ${path}`);
  }

  const target = resolve(outputRoot, path);
  if (target === outputRoot || !target.startsWith(`${outputRoot}${sep}`)) {
    throw new Error(`Output path escapes dist: ${path}`);
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(data, "base64"));
}

console.log(`Built Nelo design system v5 (${manifest.files} files).`);
