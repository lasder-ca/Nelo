import { readFile, writeFile } from "node:fs/promises";

const path = "dist/ja.html";
let html = await readFile(path, "utf8");

html = html
  .replace('<a class="brand" href="/"><img src="/brand/nelo-mark.svg" alt=""><span>Neloに任せる</span></a>', '<a class="brand" href="/"><img src="/brand/nelo-mark.svg" alt=""><span>Nelo</span></a>')
  .replace("TypeScript向けリクエストが管理ランタイム", "TypeScript向けリクエスト所有ランタイム");

if (!html.includes('<span>Nelo</span>')) throw new Error("Japanese brand name was modified");
if (!html.includes("TypeScript向けリクエスト所有ランタイム")) throw new Error("Japanese product category is invalid");
if (html.includes("Neloに任せる</span></a>") || html.includes("リクエストが管理ランタイム")) throw new Error("Over-broad Japanese replacement remains");

await writeFile(path, html);
console.log("Verified Japanese brand and product copy.");
