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

const traceMarkup = `<section class="request-trace" aria-label="Request lifetime trace">
  <header class="trace-head">
    <div class="trace-identity">
      <span>GET /report</span>
      <strong>request_4f2a</strong>
    </div>
    <span class="trace-live"><i></i> handling</span>
  </header>

  <div class="trace-rail" aria-label="Request lifecycle">
    <div class="trace-step done"><i></i><span>accepted</span><small>0 ms</small></div>
    <div class="trace-step current"><i></i><span>handling</span><small>12 ms</small></div>
    <div class="trace-step"><i></i><span>delivering</span><small>—</small></div>
    <div class="trace-step"><i></i><span>closed</span><small>—</small></div>
  </div>

  <div class="trace-body">
    <div class="trace-summary">
      <img src="/brand/nelo-icon.svg" alt="">
      <div>
        <span>Owned by this request</span>
        <strong>3 active operations</strong>
        <p>Everything started here ends with this request.</p>
      </div>
    </div>

    <div class="trace-operations">
      <article>
        <div class="trace-op-main"><code>buildReport()</code><span>task</span></div>
        <b>joined</b>
      </article>
      <article>
        <div class="trace-op-main"><code>database</code><span>resource</span></div>
        <b>cleanup ready</b>
      </article>
      <article>
        <div class="trace-op-main"><code>response.body</code><span>stream</span></div>
        <b>waiting</b>
      </article>
    </div>
  </div>

  <footer class="trace-foot">
    <span><i></i> disconnect aborts the tree</span>
    <span><i></i> cleanup runs once</span>
  </footer>
</section>`;

const inlineCss = `<style id="nelo-production-ui-v3">
.hero .eyebrow{display:none!important}
.delivery-strip,.ownership-flow,.nelo-boundary-map{display:none!important}
.brand img,.footer-brand img{object-fit:contain;background:transparent!important}
.request-trace{margin:16px;border:1px solid #293244;border-radius:20px;background:linear-gradient(180deg,#101722,#0a1019);box-shadow:0 24px 70px rgba(0,0,0,.38);color:#eef4ff;overflow:hidden}
.trace-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
.trace-identity{display:flex;align-items:baseline;gap:10px;min-width:0}.trace-identity span{font:600 13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}.trace-identity strong{color:#758399;font:9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:500}
.trace-live{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid rgba(99,214,182,.2);border-radius:999px;background:rgba(99,214,182,.08);color:#79e4c4;font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.trace-live i{width:6px;height:6px;border-radius:50%;background:#63d6b6;box-shadow:0 0 0 4px rgba(99,214,182,.1)}
.trace-rail{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;padding:17px 18px 15px}.trace-rail:before{content:"";position:absolute;left:calc(12.5% + 18px);right:calc(12.5% + 18px);top:23px;height:1px;background:#303b4e}.trace-step{position:relative;z-index:1;display:grid;justify-items:center;gap:5px;color:#68768a}.trace-step i{width:11px;height:11px;border:2px solid #39465b;border-radius:50%;background:#101722}.trace-step span{font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.trace-step small{font:8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#4e5b6d}.trace-step.done{color:#9aa8bb}.trace-step.done i{border-color:#5d718b;background:#5d718b}.trace-step.current{color:#7be4c6}.trace-step.current i{border-color:#63d6b6;background:#63d6b6;box-shadow:0 0 0 5px rgba(99,214,182,.1)}
.trace-body{display:grid;grid-template-columns:minmax(170px,.8fr) minmax(260px,1.2fr);gap:10px;padding:0 14px 14px}.trace-summary{display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035)}.trace-summary img{width:36px!important;height:36px!important;min-width:36px;object-fit:contain;background:transparent!important;border-radius:0!important}.trace-summary span{display:block;color:#7f8da1;font:8px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.07em}.trace-summary strong{display:block;margin-top:6px;font-size:14px;line-height:1.15;letter-spacing:-.02em}.trace-summary p{margin:7px 0 0;color:#7e8b9d;font-size:10px;line-height:1.4}
.trace-operations{display:grid;gap:6px}.trace-operations article{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.035)}.trace-op-main{display:flex;align-items:center;gap:8px;min-width:0}.trace-op-main code{color:#e8f0fb;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trace-op-main span{padding:3px 6px;border-radius:999px;background:rgba(82,121,180,.12);color:#8ea2bf;font:7px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.trace-operations b{flex:0 0 auto;color:#75d8bd;font:8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:500}
.trace-foot{display:flex;flex-wrap:wrap;gap:8px 14px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.018)}.trace-foot span{display:inline-flex;align-items:center;gap:6px;color:#718096;font:8px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.trace-foot i{width:4px;height:4px;border-radius:50%;background:#63d6b6}
@media(max-width:720px){.request-trace{margin:12px}.trace-head{align-items:flex-start}.trace-identity{display:grid;gap:4px}.trace-body{grid-template-columns:1fr}.trace-summary{align-items:center}.trace-rail{padding-left:10px;padding-right:10px}.trace-rail:before{left:calc(12.5% + 10px);right:calc(12.5% + 10px)}.trace-step span{font-size:8px}.trace-operations article{align-items:flex-start}.trace-op-main{display:grid;gap:5px}}
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
    .replace(/<div class="ownership-flow"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${traceMarkup}</div></div></section>`)
    .replace(/<div class="nelo-boundary-map"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${traceMarkup}</div></div></section>`)
    .replace(/<section class="request-trace"[\s\S]*?<\/section><\/div><\/div><\/section>/, `${traceMarkup}</div></div></section>`)
    .replace(/<div class="delivery-strip"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${traceMarkup}</div></div></section>`);
  html = html.replace(/<style id="nelo-production-ui(?:-v2|-v3)?">[\s\S]*?<\/style>/g, "");
  html = html.replace('</head>', `${inlineCss}</head>`);
  await writeFile(path, html);
}

const home = await readFile("dist/index.html", "utf8");
for (const oldText of ["Incoming", "Nelo boundary", "Delivered", "Owned lifetime", "Request scope"]) {
  if (home.includes(oldText)) throw new Error(`Old ownership UI text remains: ${oldText}`);
}
if (!home.includes('class="request-trace"')) throw new Error("Request lifetime trace was not applied");
if (!home.includes('id="nelo-production-ui-v3"')) throw new Error("Inline production CSS v3 was not injected");
if (!home.includes('3 active operations')) throw new Error("Trace operation summary is missing");
if (!home.includes('/brand/nelo-icon.svg')) throw new Error("Transparent Nelo SVG icon was not applied");
console.log("Applied Nelo request trace UI v3.");
