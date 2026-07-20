import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Nelo">
  <defs>
    <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2f8cf0"/><stop offset="1" stop-color="#245fc7"/></linearGradient>
    <linearGradient id="mint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#72d7c2"/><stop offset="1" stop-color="#4bb7a5"/></linearGradient>
  </defs>
  <rect x="3" y="3" width="58" height="58" rx="15" fill="#121a28"/>
  <path d="M16 18c0-3 3.6-4.5 5.7-2.4L34 28l-8.5 8.5L16 27z" fill="url(#blue)"/>
  <path d="M16 27l9.5 9.5L16 46c-2.1 2.1-5.7.6-5.7-2.4V21.4c0-3 3.6-4.5 5.7-2.4z" fill="url(#blue)"/>
  <path d="M48 18c0-3-3.6-4.5-5.7-2.4L30 28l8.5 8.5L48 27z" fill="url(#mint)"/>
  <path d="M48 27l-9.5 9.5L48 46c2.1 2.1 5.7.6 5.7-2.4V21.4c0-3-3.6-4.5-5.7-2.4z" fill="url(#mint)"/>
</svg>`;

const flowMarkup = `<div class="nelo-boundary-map" aria-label="Request ownership flow">
  <div class="boundary-route boundary-request">
    <span>Incoming</span>
    <strong>Request</strong>
    <code>GET /report</code>
  </div>
  <div class="boundary-connector" aria-hidden="true"><i></i></div>
  <section class="boundary-core">
    <header class="boundary-core-head">
      <div class="boundary-title">
        <img src="/brand/nelo-icon.svg" alt="">
        <strong>Nelo boundary</strong>
      </div>
      <span class="boundary-state"><i></i> running</span>
    </header>
    <div class="boundary-nodes">
      <article><b>01</b><strong>Task</strong><span>joined</span></article>
      <article><b>02</b><strong>Resource</strong><span>LIFO cleanup</span></article>
      <article><b>03</b><strong>Stream</strong><span>backpressure</span></article>
    </div>
    <footer class="boundary-meta">
      <span>AbortSignal</span>
      <span>cleanup once</span>
      <span>delivery-aware</span>
    </footer>
  </section>
  <div class="boundary-connector" aria-hidden="true"><i></i></div>
  <div class="boundary-route boundary-response">
    <span>Delivered</span>
    <strong>Response</strong>
    <code>200 OK</code>
  </div>
</div>`;

const inlineCss = `<style id="nelo-production-ui-v2">
.hero .eyebrow{display:none!important}
.delivery-strip,.ownership-flow{display:none!important}
.brand img,.footer-brand img{object-fit:contain;background:transparent!important}
.nelo-boundary-map{display:grid;grid-template-columns:108px 22px minmax(230px,1fr) 22px 108px;align-items:center;gap:8px;margin:16px;border:1px solid #2b3340;border-radius:18px;padding:12px;background:linear-gradient(180deg,#111722,#0b1018);box-shadow:0 20px 60px rgba(0,0,0,.34);color:#edf4ff;overflow:hidden}
.boundary-route{min-width:0;min-height:82px;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035)}
.boundary-route span{color:#63d6b6;font:9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em}
.boundary-route strong{font-size:15px;line-height:1.1;letter-spacing:-.03em}
.boundary-route code{color:#8795a9;font:9px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
.boundary-response{border-color:rgba(99,214,182,.22);background:rgba(99,214,182,.07)}
.boundary-connector{position:relative;height:1px;background:#364052}
.boundary-connector i{position:absolute;right:0;top:-4px;width:9px;height:9px;border-top:1px solid #63d6b6;border-right:1px solid #63d6b6;transform:rotate(45deg)}
.boundary-core{min-width:0;padding:12px;border:1px solid rgba(99,214,182,.34);border-radius:16px;background:linear-gradient(180deg,rgba(26,45,42,.82),rgba(17,31,29,.86));box-shadow:inset 0 0 0 1px rgba(99,214,182,.05)}
.boundary-core-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08)}
.boundary-title{display:flex;align-items:center;min-width:0;gap:9px}
.boundary-title img{width:30px!important;height:30px!important;min-width:30px;object-fit:contain;background:transparent!important;border-radius:0!important}
.boundary-title strong{font-size:14px;line-height:1.1;letter-spacing:-.02em;white-space:nowrap}
.boundary-state{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:5px 8px;border:1px solid rgba(99,214,182,.24);border-radius:999px;background:rgba(99,214,182,.08);color:#7be4c6;font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.boundary-state i{width:6px;height:6px;border-radius:50%;background:#63d6b6;box-shadow:0 0 0 4px rgba(99,214,182,.10)}
.boundary-nodes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
.boundary-nodes article{min-width:0;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.035)}
.boundary-nodes b{display:block;color:#63d6b6;font:8px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.boundary-nodes strong{display:block;margin-top:5px;font-size:11px;line-height:1.1}
.boundary-nodes span{display:block;margin-top:4px;color:#83928f;font:8px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.boundary-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
.boundary-meta span{padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.04);color:#82908f;font:8px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
@media(max-width:720px){
  .nelo-boundary-map{grid-template-columns:1fr;margin:12px;padding:12px;gap:8px}
  .boundary-connector{width:1px;height:18px;justify-self:center}
  .boundary-connector i{right:-4px;top:auto;bottom:0;transform:rotate(135deg)}
  .boundary-route{min-height:64px;text-align:center;align-items:center}
  .boundary-nodes{grid-template-columns:1fr}
  .boundary-nodes span{white-space:normal}
}
</style>`;

await mkdir("dist/brand", { recursive: true });
await writeFile("dist/brand/nelo-icon.svg", iconSvg);

const htmlFiles = [];
async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collectHtml(path);
    else if (entry.name.endsWith(".html")) htmlFiles.push(path);
  }
}
await collectHtml("dist");

for (const path of htmlFiles) {
  let html = await readFile(path, "utf8");
  html = html
    .replaceAll('/brand/nelo-mark.svg', '/brand/nelo-icon.svg')
    .replaceAll('/brand/nelo-icon.webp', '/brand/nelo-icon.svg')
    .replaceAll('/brand/nelo-icon.png', '/brand/nelo-icon.svg')
    .replace('<span class="eyebrow">Node adapter available · 49 tests passing</span>', '')
    .replace(/<div class="ownership-flow"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${flowMarkup}</div></div></section>`)
    .replace(/<div class="nelo-boundary-map"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${flowMarkup}</div></div></section>`)
    .replace(/<div class="delivery-strip"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${flowMarkup}</div></div></section>`);
  html = html.replace(/<style id="nelo-production-ui(?:-v2)?">[\s\S]*?<\/style>/g, "");
  html = html.replace('</head>', `${inlineCss}</head>`);
  await writeFile(path, html);
}

const home = await readFile("dist/index.html", "utf8");
if (home.includes("Node adapter available · 49 tests passing")) throw new Error("Removed hero status text is still present");
if (home.includes("Owned lifetime") || home.includes("Request scope")) throw new Error("Old scope UI is still present");
if (!home.includes('class="nelo-boundary-map"')) throw new Error("Nelo boundary map was not applied");
if (!home.includes('id="nelo-production-ui-v2"')) throw new Error("Inline production CSS was not injected");
if (!home.includes('/brand/nelo-icon.svg')) throw new Error("Transparent Nelo SVG icon was not applied");
console.log("Applied cached-safe Nelo boundary UI v2.");
