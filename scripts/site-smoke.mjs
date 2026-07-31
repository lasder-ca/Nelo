import { readFile, stat } from "node:fs/promises";

const [html, css, javascript] = await Promise.all([
  readFile("dist/index.html", "utf8"),
  readFile("dist/nelo.css", "utf8"),
  readFile("dist/nelo.js", "utf8"),
]);

assertIncludes(html, 'id="lab"', "homepage live lab section");
assertIncludes(html, "/api/nelo?scenario=tasks", "documented API endpoint");
assertIncludes(html, 'data-lab-scenario="deadline"', "deadline scenario control");
assertIncludes(html, 'data-lab-scenario="delivery"', "delivery scenario control");
assertIncludes(html, "Run the framework, not a mock.", "live implementation boundary copy");
assertIncludes(css, ".lab-grid", "live lab responsive layout");
assertIncludes(css, ":focus-visible", "keyboard focus styling");
assertIncludes(javascript, "fetch(buildLabUrl()", "same-origin API execution");
assertIncludes(javascript, "activeController.abort()", "browser cancellation control");
assertIncludes(javascript, "application/x-ndjson", "streaming delivery response handling");
assertIncludes(javascript, "x-nelo-delivery", "delivery transport metadata");
assertIncludes(javascript, "scenario==='delivery'", "delivery timing controls");
assertExcludes(html, 'href="/docs', "broken generated documentation route");

const logo = await stat("dist/brand/nelo-mark.svg");
if (!logo.isFile() || logo.size === 0) {
  throw new Error("Generated brand mark is missing or empty");
}

console.log("Nelo site smoke checks passed.");

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`Missing ${label}: ${expected}`);
  }
}

function assertExcludes(value, unexpected, label) {
  if (value.includes(unexpected)) {
    throw new Error(`Found ${label}: ${unexpected}`);
  }
}
