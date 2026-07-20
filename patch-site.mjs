import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const iconBase64 = "UklGRmAEAABXRUJQVlA4IFQEAAAQHQCdASqgAKAAPnk4mEgko6KhKPSbAJAPCWUvaEqcZbiJnNtuptzm/GbzhkK9ELPyvJrN5aGlxmg+PH6kLcdC071AKeFkWqV04nuYztAkDxwyG6JfJ4PkJSD+pcvvKZQQ5ReSrNJy2R5T5sE+83T8jwQrXBCTAwSm0D0tuWpXE7HjnMUU9TJ5F1Q9LfhwqLie3xLWJtL3iJQ3/PMlOHyCc9/rF6XRR+9hAUqWQaw3anEYZydBx45y+dneCHoVDJ6jIj2JPNzFU6wxSkZQx73lzJtCR3zQsUYqTP+dHVt2Eki1loPynfNbLjGhmZFx/CwAAP77cNl8pKGZ7g8u1hWxwQ1BNcriuXhMH+//Dl3QX32DlcviNMquTfEsyjKU0afn8UpunNzTnKkvU/VivDWeRdggLvdr+dqnxYK5BQurUz4/7qSN1OhpBkTQGciewmNuBfO4ZcintYtx8vHrxmrvsPQ2P1YfEcmnOnhmrLzsLaKosQoG0/Vk6UZi7rmvGSJi84h6sKhs6qqC6l5xIiHxGgPB5Iup7TbLcQ4wMjt70kSQO8aQM8QDl36nDu2FTZe32egZfu4e8t2gOzHRGhI/5nEY9lCK/LwO7gOXot0IFk/VKJftGU/VHiDNOe4/RevVeI9SCMjVDGJlTl3tTYQsaPmZ5P9aZ8kMkei+d38w8uiJTN3gMrf1GqVeA+c6ta0heexbhTimafqBxBuAG4tc7a1M9ONqBcDM+CPzG7sQDYiZfqzOdYyw1g4+BJsEDa06tXPM5rSQHldYD10zlsMQYDT0//kh8QRsU/qeobY6QrYKWcP7EYtYAr/lk/xS76me2Yh/aUE9eJJ/d/e1MIN8cJp+trb++pM9YIKBJCxX95xjtbqhuEP3u+AfADU9d3i1eUxARkQQlXywd/GZySqqq54vh3RDMiUesrGDVtT96DxhZd9krl8hEoB+xADgQcK6XlE2VteCChUD6wCLlnESPaXdU6UhSmRlw5jFFWJabHdFk48KcKT5R30QqvUoY5SI1zTBfMnN5mdOMr+N8OWIOnonWNwVED6hBheuJ5LhKEJ3pmA/pDnlp9QBOs881ocD6E9cP0jzQtjxM0vEejZn27iRtACPgRkgIyFK+xDoDR/IdjKF8xEfAmcvD6nG/Nt51MntV66JRUETVFzBCUkDSPoQbgaxL//v81wMKvtOWZkVCGOnJ5HFw1I84WF5YhfZUQcrH9uNC8u4YECfHT1jrvfPfWMbQAWNQMvkqs1yd1pPkMb0J3pD/8IMq1+1Mw2+oMJApK/p6RzLbbHXvWViNjKgq/+7vhtA6QU7p6gQoEMYzoY7DIKG9SjNJgGoblW+Pwztebr9rnnY9FxhNWYxO399Ugl5i2LXOlfqUTON4NrA8Op6BY5PlJAWaiGk4oN1iYCpAvRjnH/DFSpYaf0wGwn3iPZEIg2/0/aQC7dBnUPbJE9UALWEFlmng/3bwHYAAAAA";

const flowMarkup = `<div class="ownership-flow" aria-label="Request ownership flow">
  <div class="flow-entry"><span class="flow-kicker">Incoming</span><strong>Request</strong><small>GET /report</small></div>
  <div class="flow-line" aria-hidden="true"><span></span></div>
  <div class="flow-scope">
    <div class="flow-scope-head"><img src="/brand/nelo-icon.webp" alt=""><div><span>Owned lifetime</span><strong>Request scope</strong></div><b>active</b></div>
    <div class="flow-owned-grid">
      <div><i>01</i><span>Task</span><small>joined</small></div>
      <div><i>02</i><span>Resource</span><small>LIFO cleanup</small></div>
      <div><i>03</i><span>Stream</span><small>backpressure</small></div>
    </div>
  </div>
  <div class="flow-line" aria-hidden="true"><span></span></div>
  <div class="flow-entry flow-response"><span class="flow-kicker">Delivered</span><strong>Response</strong><small>200 OK</small></div>
</div>`;

const extraCss = `
/* Nelo production visual patch */
.brand img,.footer-brand img{border-radius:10px;object-fit:cover}
.hero .eyebrow{display:none!important}
.delivery-strip{display:none!important}
.ownership-flow{display:grid;grid-template-columns:minmax(108px,.8fr) 58px minmax(300px,1.8fr) 58px minmax(108px,.8fr);align-items:center;gap:0;margin:20px;border:1px solid #30343b;border-radius:18px;padding:18px;background:linear-gradient(180deg,#12151a,#0d0f13);box-shadow:0 24px 70px #0008;overflow:hidden}
.flow-entry{min-height:116px;border:1px solid #30343b;border-radius:14px;background:#181b20;padding:18px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.flow-entry strong{font-size:19px;color:#f7f7f5;letter-spacing:-.03em}.flow-entry small{color:#858b95;font:11px Geist Mono Variable,monospace}.flow-kicker{color:#6ed7bb;text-transform:uppercase;letter-spacing:.1em;font:10px Geist Mono Variable,monospace}.flow-response{border-color:#365e55;background:#14231f}.flow-line{height:1px;background:#343943;position:relative}.flow-line span{position:absolute;right:-1px;top:-4px;width:9px;height:9px;border-top:1px solid #6ed7bb;border-right:1px solid #6ed7bb;transform:rotate(45deg)}
.flow-scope{border:1px solid #5bc8ad;border-radius:16px;padding:16px;background:#111b19;box-shadow:inset 0 0 0 1px #5bc8ad22}.flow-scope-head{display:flex;align-items:center;gap:11px;padding-bottom:14px;border-bottom:1px solid #2b3d38}.flow-scope-head img{width:38px;height:38px;border-radius:10px}.flow-scope-head div{display:grid;line-height:1.15}.flow-scope-head span{color:#83a099;font:10px Geist Mono Variable,monospace}.flow-scope-head strong{color:#f4f7f5;font-size:15px}.flow-scope-head b{margin-left:auto;color:#71e0c0;border:1px solid #3a675b;border-radius:99px;padding:4px 8px;font:10px Geist Mono Variable,monospace}.flow-owned-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:12px}.flow-owned-grid div{border:1px solid #293a35;border-radius:10px;padding:11px;background:#17211f;display:grid;gap:2px}.flow-owned-grid i{color:#5bc8ad;font:10px Geist Mono Variable,monospace}.flow-owned-grid span{color:#f3f5f4;font-size:12px;font-weight:650}.flow-owned-grid small{color:#7f928c;font:9px Geist Mono Variable,monospace}
@media(max-width:800px){.ownership-flow{grid-template-columns:1fr;margin:14px;padding:14px;gap:10px}.flow-line{width:1px;height:26px;justify-self:center}.flow-line span{right:-4px;top:auto;bottom:0;transform:rotate(135deg)}.flow-owned-grid{grid-template-columns:1fr}.flow-entry{min-height:84px}.flow-scope{width:100%}}
`;

await mkdir("dist/brand", { recursive: true });
await writeFile("dist/brand/nelo-icon.webp", Buffer.from(iconBase64, "base64"));

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
    .replaceAll('/brand/nelo-mark.svg', '/brand/nelo-icon.webp')
    .replaceAll('/brand/nelo-icon-color-dark.png', '/brand/nelo-icon.webp')
    .replace('<span class="eyebrow">Node adapter available · 49 tests passing</span>', '')
    .replace(/<div class="delivery-strip"[\s\S]*?<\/div><\/div><\/div><\/section>/, `${flowMarkup}</div></div></section>`);
  await writeFile(path, html);
}

const assetNames = await readdir("dist/_astro");
const cssName = assetNames.find((name) => name.endsWith(".css"));
if (!cssName) throw new Error("Nelo site CSS asset was not generated");
await writeFile(`dist/_astro/${cssName}`, `${await readFile(`dist/_astro/${cssName}`, "utf8")}\n${extraCss}`);

const home = await readFile("dist/index.html", "utf8");
if (home.includes("Node adapter available · 49 tests passing")) {
  throw new Error("Removed hero status text is still present");
}
if (!home.includes("class=\"ownership-flow\"")) {
  throw new Error("Ownership flow patch was not applied");
}
console.log("Applied verified Nelo production visual patch.");
