import { readFile, writeFile } from "node:fs/promises";

const path = "dist/nelo.js";
let javascript = await readFile(path, "utf8");

javascript = replaceRequired(
  javascript,
  "const timed=scenario==='tasks'||scenario==='deadline';",
  "const timed=scenario==='tasks'||scenario==='deadline'||scenario==='delivery';",
  "delivery timing controls",
);

javascript = replaceRequired(
  javascript,
  "if(scenario==='deadline'){params.set('work',delayInput.value);params.set('timeout',timeoutInput.value)}return '/api/nelo?'",
  "if(scenario==='deadline'){params.set('work',delayInput.value);params.set('timeout',timeoutInput.value)}if(scenario==='delivery'){params.set('delay',delayInput.value);params.set('chunks','6')}return '/api/nelo?'",
  "delivery query parameters",
);

javascript = replaceRequired(
  javascript,
  "const response=await fetch(buildLabUrl(),{headers:{accept:'application/json'},signal:activeController.signal});const payload=await response.json();outputElement.textContent=JSON.stringify({http:{status:response.status,serverTiming:response.headers.get('server-timing'),neloLab:response.headers.get('x-nelo-lab')},...payload},null,2);",
  "const response=await fetch(buildLabUrl(),{headers:{accept:'application/json, application/x-ndjson'},signal:activeController.signal});const contentType=response.headers.get('content-type')||'';const payload=contentType.includes('application/x-ndjson')?{stream:(await response.text()).trim().split('\\n').filter(Boolean).map(line=>JSON.parse(line))}:await response.json();outputElement.textContent=JSON.stringify({http:{status:response.status,serverTiming:response.headers.get('server-timing'),neloLab:response.headers.get('x-nelo-lab'),delivery:response.headers.get('x-nelo-delivery')},...payload},null,2);",
  "NDJSON delivery response handling",
);

await writeFile(path, javascript);
console.log("Patched the generated site for transport-owned delivery responses.");

function replaceRequired(value, search, replacement, label) {
  if (!value.includes(search)) {
    throw new Error(`Unable to patch ${label}: source fragment was not found`);
  }
  return value.replace(search, replacement);
}
