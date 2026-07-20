import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repository = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "nelo-package-smoke-"));
const consumer = join(temporaryRoot, "consumer");
const npmCache = join(temporaryRoot, "npm-cache");
let archive;

try {
  await mkdir(consumer);
  const packed = await execFileAsync(
    "npm",
    ["pack", "--json", "--cache", npmCache],
    { cwd: repository },
  );
  const [{ filename }] = JSON.parse(packed.stdout);
  archive = join(repository, filename);

  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await execFileAsync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      npmCache,
      archive,
    ],
    { cwd: consumer },
  );

  await writeFile(
    join(consumer, "smoke.mjs"),
    `import { Nelo } from "nelo";
import { serve } from "nelo/node";

const app = new Nelo();
let resourceOpen = true;
let cleanups = 0;
app.get("/", (context) => context.text("tarball-ok"));
app.get("/stream", (context) => {
  context.delivery.use(() => {
    resourceOpen = false;
    cleanups++;
  });
  return new Response(new ReadableStream({
    pull(controller) {
      if (!resourceOpen) throw new Error("delivery resource closed before streaming");
      controller.enqueue(new TextEncoder().encode("stream-ok"));
      controller.close();
    },
  }));
});
const server = serve(app, { port: 0 });

try {
  const address = await server.listen();
  const response = await fetch(\`http://\${address.hostname}:\${address.port}/\`);
  if (response.status !== 200 || await response.text() !== "tarball-ok") {
    throw new Error("tarball response mismatch");
  }
  const streamed = await fetch(\`http://\${address.hostname}:\${address.port}/stream\`);
  if (await streamed.text() !== "stream-ok" || resourceOpen || cleanups !== 1) {
    throw new Error("tarball delivery lifetime mismatch");
  }
} finally {
  await server.close({ gracePeriod: 100, forceAfter: 1_000 });
}
`,
  );
  await execFileAsync("node", [join(consumer, "smoke.mjs")], { cwd: consumer });
  console.log("Tarball consumer smoke: ok");
} finally {
  if (archive !== undefined) await rm(archive, { force: true });
  await rm(temporaryRoot, { recursive: true, force: true });
}
