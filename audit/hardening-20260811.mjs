import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, oldText, newText) {
  const text = readFileSync(path, "utf8");
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one anchor, found ${count}`);
  writeFileSync(path, text.replace(oldText, newText));
}

replaceOnce(
  "api/nelo.ts",
  'import { handleNodeExchange } from "../src/node/handler.ts";\n',
  'import { handleNodeExchange } from "../src/node/handler.ts";\nimport { MalformedNodeRequestError } from "../src/node/errors.ts";\nimport { createWebRequest } from "../src/node/request.ts";\n',
);

replaceOnce(
  "api/nelo.ts",
  `    const request = new Request(createRequestUrl(incoming), {\n      method: incoming.method ?? "GET",\n      headers: createRequestHeaders(incoming),\n      signal: controller.signal,\n    });`,
  `    const request = createWebRequest(incoming, controller.signal, {\n      protocol: requestProtocol(incoming),\n    });`,
);

replaceOnce(
  "api/nelo.ts",
  `  } catch (error) {\n    if (outgoing.headersSent) {`,
  `  } catch (error) {\n    if (error instanceof MalformedNodeRequestError && !outgoing.headersSent) {\n      outgoing.statusCode = 400;\n      outgoing.setHeader("cache-control", "no-store");\n      outgoing.setHeader("content-type", "application/json; charset=utf-8");\n      outgoing.setHeader("x-content-type-options", "nosniff");\n      outgoing.end(JSON.stringify({ error: "Bad Request" }));\n      return;\n    }\n    if (outgoing.headersSent) {`,
);

let api = readFileSync("api/nelo.ts", "utf8");
let start = api.indexOf("function createRequestUrl(request: IncomingMessage): string {");
let end = api.indexOf("function requestProtocol(request: IncomingMessage): \"http\" | \"https\" {", start);
if (start < 0 || end < 0) throw new Error("api/nelo.ts: request URL helper block not found");
api = api.slice(0, start) + api.slice(end);

start = api.indexOf("function createRequestHeaders(request: IncomingMessage): Headers {");
end = api.indexOf("function firstHeader(value: string | string[] | undefined): string | undefined {", start);
if (start < 0 || end < 0) throw new Error("api/nelo.ts: request header helper block not found");
api = api.slice(0, start) + api.slice(end);
writeFileSync("api/nelo.ts", api);

replaceOnce(
  "test/node/site-api.test.ts",
  `import {\n  createDeliveryLabApplication,\n  handleNeloLabRequest,\n  type LabEvent,\n} from "../../api/nelo.ts";`,
  `import neloLabHandler, {\n  createDeliveryLabApplication,\n  handleNeloLabRequest,\n  type LabEvent,\n} from "../../api/nelo.ts";`,
);

const testFile = "test/node/site-api.test.ts";
let tests = readFileSync(testFile, "utf8");
const insertion = `\ntest("the live lab ignores untrusted forwarded host input", async () => {\n  const server = createServer((request, response) => {\n    void neloLabHandler(request, response);\n  });\n  server.listen(0, "127.0.0.1");\n  await once(server, "listening");\n  const address = server.address() as AddressInfo;\n\n  try {\n    const response = await fetch(\n      \`http://127.0.0.1:\${address.port}/api/nelo?scenario=health\`,\n      { headers: { "x-forwarded-host": "evil.example/redirect?x=1" } },\n    );\n    const payload = await readPayload(response);\n    assert.equal(response.status, 200);\n    assert.equal(payload.scenario, "health");\n  } finally {\n    server.close();\n    await once(server, "close");\n  }\n});\n`;
if (!tests.includes('the live lab ignores untrusted forwarded host input')) {
  const anchor = '\ntest("invalid lab input receives a bounded JSON error", async () => {';
  if (!tests.includes(anchor)) throw new Error("test insertion anchor not found");
  tests = tests.replace(anchor, insertion + anchor);
  writeFileSync(testFile, tests);
}
