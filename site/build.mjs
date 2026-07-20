import { mkdir, readFile, writeFile } from "node:fs/promises";
import locales from "./i18n.mjs";

const officialMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 35 214 310" role="img" aria-labelledby="title"><title id="title">Nelo</title><defs><linearGradient id="b" x1="58" y1="52" x2="150" y2="316" gradientUnits="userSpaceOnUse"><stop stop-color="#3183EA"/><stop offset="1" stop-color="#2368D0"/></linearGradient><linearGradient id="m" x1="148" y1="72" x2="236" y2="316" gradientUnits="userSpaceOnUse"><stop stop-color="#6ED2BE"/><stop offset="1" stop-color="#4DB9A7"/></linearGradient><linearGradient id="n" x1="88" y1="78" x2="230" y2="312" gradientUnits="userSpaceOnUse"><stop stop-color="#173E77"/><stop offset="1" stop-color="#102C58"/></linearGradient></defs><path d="M86 52Q58 52 58 80V304Q58 329 79 315L148 260V121L104 77Q96 52 86 52Z" fill="url(#b)"/><path d="M208 66L148 121V260L215 315Q236 329 236 304V80Q236 50 208 66Z" fill="url(#m)"/><path d="M104 77L236 209V304Q236 329 215 315L58 158V80Q58 52 86 52Q96 52 104 77Z" fill="url(#n)"/></svg>`;

const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const js = await readFile(new URL("./app.js", import.meta.url), "utf8");

const routeCode = `import { Nelo } from "nelo";
import { serve } from "nelo/node";

const app = new Nelo();

app.get("/report", async (context) => {
  const report = context.fork(
    "report",
    (signal) => buildReport({ signal }),
  );

  const connection = await context.use(
    "database",
    (signal) => database.connect({ signal }),
    (resource) => resource.close(),
  );

  context.delivery.use(() => connection.closeStream());
  return new Response(connection.stream(await report));
});

await serve(app, { port: 3000 }).listen();`;

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const markedRoute = esc(routeCode).split("\n").map((line) => {
  const marked = line.includes("context.fork") || line.includes("context.use") || line.includes("context.delivery.use");
  return `<span${marked ? ' class="markline"' : ''}>${line || " "}</span>`;
}).join("\n");

function render(locale, t) {
  const codeLines = [
    '<span class="code-line"><span class="ln">1</span><span class="kw">app.get</span>(<span class="str">"/report"</span>, <span class="kw">async</span> (context) =&gt; {</span>',
    '<span class="code-line"><span class="ln">2</span>  <span class="kw">const</span> report = context.<span class="fn">fork</span>(</span>',
    '<span class="code-line"><span class="ln">3</span>    <span class="str">"report"</span>,</span>',
    '<span class="code-line"><span class="ln">4</span>    (signal) =&gt; buildReport({ signal }),</span>',
    '<span class="code-line"><span class="ln">5</span>  );</span>',
    '<span class="code-line"><span class="ln">6</span></span>',
    '<span class="code-line"><span class="ln">7</span>  <span class="kw">const</span> db = <span class="kw">await</span> context.<span class="fn">use</span>(...);</span>',
    '<span class="code-line"><span class="ln">8</span>  context.delivery.<span class="fn">use</span>(() =&gt; db.close());</span>',
    '<span class="code-line"><span class="ln">9</span>  <span class="kw">return new</span> Response(db.stream(<span class="kw">await</span> report));</span>',
    '<span class="code-line"><span class="ln">10</span>});</span>'
  ].join("\n");
  const runtimeRows = t.targets.map((r, index) => `<div class="runtime-row"><div class="runtime-name">${r[0]}</div><div><span class="tag${index === 3 ? " planned" : ""}">${r[1]}</span></div><div class="runtime-detail">${r[2]}</div></div>`).join("");
  const languageLinks = Object.entries(locales).map(([key, item]) => `<a href="/?lang=${key}" aria-current="${key === locale}"><span>${item.langName}</span>${key === locale ? `<small>${t.auto}</small>` : ""}</a>`).join("");
  const marqueeItems = [...t.strip, ...t.strip].map((item) => `<span>${item}</span>`).join("");
  return `<!doctype html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${t.meta}"><meta name="theme-color" content="#05070b"><link rel="icon" href="/brand/nelo-mark.svg"><link rel="canonical" href="https://nelo.lattee.jp/${locale}"><link rel="alternate" hreflang="en" href="https://nelo.lattee.jp/en"><link rel="alternate" hreflang="ja" href="https://nelo.lattee.jp/ja"><link rel="alternate" hreflang="ko" href="https://nelo.lattee.jp/ko"><link rel="alternate" hreflang="zh" href="https://nelo.lattee.jp/zh"><title>Nelo — Every request owns its work.</title><link rel="stylesheet" href="/nelo-site.css"></head><body><div class="progress"></div><header class="top"><div class="shell nav"><a class="brand" href="/"><img src="/brand/nelo-mark.svg" alt=""><span>Nelo</span></a><nav class="links"><a href="#overview">${t.nav.overview}</a><a href="#migrate">${t.nav.migrate}</a><a href="#model">${t.nav.model}</a><a href="#runtime">${t.nav.runtime}</a><a href="/docs">${t.nav.docs}</a><a href="https://github.com/lasder-ca/Nelo">GitHub ↗</a></nav><div class="navtools"><span class="status"><i></i>${t.status}</span><div class="lang"><button aria-label="${t.language}">${locale.toUpperCase()}</button><div class="langmenu">${languageLinks}</div></div><button class="menu" aria-label="Menu">☰</button></div></div></header><main><section class="hero" id="overview" data-section><div class="shell hero-grid"><div><span class="kick">${t.badge}</span><h1>${t.heroTitleA}<span>${t.heroTitleB}</span></h1><p class="lead">${t.heroLead}</p><div class="actions"><a class="btn" href="/docs/getting-started">${t.guide}</a><a class="btn alt" href="https://github.com/lasder-ca/Nelo">${t.source}</a></div><div class="hero-notes"><span>Request / Response</span><span>context.fork()</span><span>context.use()</span><span>context.delivery</span></div></div><div class="editor-wrap"><div class="float-tag a">task → request</div><div class="float-tag b">stream → delivery</div><div class="editor"><div class="editorbar"><span>${t.heroCodeLabel}</span><span class="dots"><i></i><i></i><i></i></span></div><pre class="hero-code"><code>${codeLines}</code></pre><div class="editor-foot"><b>ownership: explicit</b><span>server.ts</span></div></div></div></div></section><div class="marquee"><div class="marquee-track">${marqueeItems}</div></div><section class="section reveal" id="migrate" data-section><div class="shell"><div class="section-head"><div><span class="eyebrow">${t.migrateEyebrow}</span><h2>${t.migrateTitle}</h2></div><p class="intro">${t.migrateLead}</p></div><div class="workbench"><div class="workbar"><div class="tabs"><button data-tab="task" aria-selected="true">${t.tabs.task}</button><button data-tab="resource" aria-selected="false">${t.tabs.resource}</button><button data-tab="stream" aria-selected="false">${t.tabs.stream}</button></div><span>before → Nelo</span></div><div class="diff"><section class="pane"><div class="pane-title"><b>${t.before}</b><span>${t.unowned}</span></div><pre><code id="before-code"></code></pre></section><section class="pane"><div class="pane-title"><b class="after">${t.after}</b><span>${t.owned}</span></div><pre><code id="after-code"></code></pre></section></div><div class="change"><b>${t.whatChanged}</b><span id="change-copy"></span></div><span hidden data-change="task">${t.changes.task}</span><span hidden data-change="resource">${t.changes.resource}</span><span hidden data-change="stream">${t.changes.stream}</span></div></div></section><section class="section reveal" id="model" data-section><div class="shell"><div class="section-head"><div><span class="eyebrow">${t.modelEyebrow}</span><h2>${t.modelTitle}</h2></div><p class="intro">${t.modelLead}</p></div><div class="bento"><article class="card big"><span class="card-label">context.fork()</span><h3>${t.cards.taskTitle}</h3><p>${t.cards.taskText}</p><div class="task-flow"><i></i><i></i><i></i><b></b></div></article><article class="card"><span class="card-label">context.use()</span><h3>${t.cards.resourceTitle}</h3><p>${t.cards.resourceText}</p><div class="stack"><i></i><i></i><i></i></div></article><article class="card"><span class="card-label">context.delivery.use()</span><h3>${t.cards.deliveryTitle}</h3><p>${t.cards.deliveryText}</p><div class="mini-code">handler return<br>────────────<br>body delivery<br>────────────<br>cleanup once</div></article><article class="card big"><span class="card-label">CancellationReason</span><h3>${t.cards.cancelTitle}</h3><p>${t.cards.cancelText}</p><div class="reason"><span>client_disconnect</span><span>server_shutdown</span><span>delivery_error</span></div></article></div></div></section><section class="section reveal"><div class="shell"><div class="section-head"><div><span class="eyebrow">${t.routeEyebrow}</span><h2>${t.routeTitle}</h2></div><p class="intro">${t.routeLead}</p></div><div class="route-grid"><div class="route-copy"><span class="card-label">ownership lines</span><ul><li>context.fork() — task lifetime</li><li>context.use() — handler resource</li><li>context.delivery.use() — response delivery</li></ul></div><div class="full-code"><div class="full-bar"><span>server.ts</span><button class="copy" data-copy="${t.copy}" data-copied="${t.copied}">${t.copy}</button></div><pre><code id="full-code">${markedRoute}</code></pre></div></div></div></section><section class="section reveal" id="runtime" data-section><div class="shell"><div class="section-head"><div><span class="eyebrow">${t.runtimeEyebrow}</span><h2>${t.runtimeTitle}</h2></div><p class="intro">${t.runtimeLead}</p></div><div class="runtime"><div class="runtime-row runtime-head"><div>Target</div><div>Status</div><div>Boundary</div></div>${runtimeRows}</div></div></section><section class="section reveal"><div class="shell cta"><div><h2>${t.ctaTitle}</h2><p>${t.ctaText}</p></div><a class="btn" href="/docs/getting-started">${t.ctaButton}</a></div></section></main><footer><div class="shell footer"><span>Nelo — ${t.footer}</span><span>0.2.0-alpha.1 · Apache-2.0</span></div></footer><script type="module" src="/nelo-site.js"></script></body></html>`;
}

await mkdir("dist/brand", { recursive: true });
await writeFile("dist/brand/nelo-mark.svg", officialMark);
await writeFile("dist/nelo-site.css", css);
await writeFile("dist/nelo-site.js", js);
for (const [locale, text] of Object.entries(locales)) {
  await writeFile(`dist/${locale}.html`, render(locale, text));
}
await writeFile("dist/index.html", render("en", locales.en));

const generated = await Promise.all(["en", "ja", "ko", "zh"].map((locale) => import("node:fs/promises").then(({ readFile }) => readFile(`dist/${locale}.html`, "utf8"))));
if (generated.some((html) => html.includes("scope-scene") || html.includes("request_4f2a"))) throw new Error("Legacy visual remains");
if (generated.some((html) => !html.includes("context.delivery.use") || !html.includes("nelo-site.js"))) throw new Error("Localized site validation failed");
console.log("Applied Nelo multilingual motion redesign.");
