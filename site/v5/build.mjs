import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
let encoded = "";
for (let index = 0; index < manifest.chunks; index++) {
  encoded += (await readFile(new URL(`./chunk-${String(index).padStart(2, "0")}.txt`, import.meta.url), "utf8")).trim();
}
if (encoded.length !== manifest.base64_length) throw new Error(`Bundle length mismatch: ${encoded.length}`);
const compressed = Buffer.from(encoded, "base64");
const gzipHash = createHash("sha256").update(compressed).digest("hex");
if (gzipHash !== manifest.gzip_sha256) throw new Error(`Bundle checksum mismatch: ${gzipHash}`);
const raw = gunzipSync(compressed);
const rawHash = createHash("sha256").update(raw).digest("hex");
if (rawHash !== manifest.raw_sha256) throw new Error(`Payload checksum mismatch: ${rawHash}`);
const files = JSON.parse(raw.toString("utf8"));
await rm("dist", { recursive: true, force: true });
for (const [path, data] of Object.entries(files)) {
  const target = `dist/${path}`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(data, "base64"));
}
if (Object.keys(files).length !== manifest.files) throw new Error("File count mismatch");
console.log(`Built Nelo design system v5 (${manifest.files} files).`);