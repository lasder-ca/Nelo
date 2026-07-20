import { readFile, writeFile } from "node:fs/promises";

const localeData = {
  en: {
    states: ["task attached", "resource registered", "delivery tracked"],
    strip: [
      "Promises do not wander off",
      "Cleanup runs once",
      "Disconnect means stop",
      "Delivery is part of the request",
      "Request and Response stay standard",
      "Every task gets a name",
      "The first abort reason wins",
      "Real sockets, not wishful thinking",
    ],
  },
  ja: {
    states: ["タスクを登録", "リソースを登録", "配信まで追跡"],
    strip: [
      "Promiseを野放しにしない",
      "後片付けは一度だけ",
      "切断したら、ちゃんと止まる",
      "Responseを返しても、まだ途中",
      "RequestとResponseはWeb標準のまま",
      "タスクには名前を付ける",
      "中断理由は先着1名",
      "実ソケットで確認済み。机上の空論ではありません",
    ],
  },
  ko: {
    states: ["작업 등록", "리소스 등록", "전달 추적"],
    strip: ["떠도는 Promise 없음", "정리는 한 번만", "연결이 끊기면 작업도 중지", "Response 반환은 아직 중간", "Web Standards 그대로", "작업마다 이름", "첫 취소 이유 유지", "실제 소켓으로 검증"],
  },
  zh: {
    states: ["任务已注册", "资源已注册", "传输已跟踪"],
    strip: ["Promise 不再游离", "清理只执行一次", "连接断开就停止", "返回 Response 还没结束", "Request 和 Response 保持标准", "每个任务都有名字", "保留第一个取消原因", "使用真实套接字验证"],
  },
};

const jaReplacements = [
  ["Neloは、タスク・リソース・キャンセル・レスポンス配信を、作成したリクエストの所有下に置くTypeScriptランタイムです。", "Neloは、リクエストから生まれた非同期タスク、リソース、キャンセル、レスポンス配信の寿命をまとめて管理するTypeScriptランタイムです。"],
  [">移行<", ">使い方<"],
  [">対応状況<", ">対応環境<"],
  ["TypeScriptのリクエスト所有ランタイム", "TypeScript向けリクエスト所有ランタイム"],
  ["処理を、", "そのPromise、"],
  ["リクエストの中へ。", "野放しにしない。"],
  ["Neloは、標準のRequestとResponseを変えずに、タスク・リソース・キャンセル・配信処理へ明確な所有者を与えます。", "Neloは、リクエストから生まれたタスクやリソースを、最後までそのリクエストに持たせます。RequestとResponseはWeb標準のまま。後片付けだけ、きっちりします。"],
  ["ガイドを読む", "使ってみる"],
  ["ソースを見る", "GitHubで見る"],
  ["所有関係が見えるルート", "野良Promiseを出さないルート"],
  [">experimental<", ">実験中<"],
  ["すべてを書き直さずに移行", "全部を書き直す必要はありません"],
  ["一つずつ、所有下へ移す。", "まずは一つ、Neloに預ける。"],
  ["ルーティングやWeb標準APIはそのまま。リクエストに属する処理だけを登録します。", "ルーターもRequestもResponseもそのまま。寿命を管理してほしい処理だけ、context.fork()やcontext.use()へ渡します。"],
  [">移行前<", ">これまで<"],
  [">Nelo<", ">Neloに任せる<"],
  ["所有者が曖昧", "誰が止める？"],
  ["リクエスト所有", "リクエストが管理"],
  ["変わること", "ここが変わる"],
  [">タスク<", ">Promise<"],
  ["Promiseをcontext.fork()から開始し、リクエストのSignalを渡します。スコープ終了前に必ず状態が確定します。", "Promiseをcontext.fork()から開始します。切断や停止のSignalが届き、リクエストが閉じる前に完了・失敗・キャンセルのどれかに決着します。"],
  ["取得と解放をcontext.use()へ移し、失敗時も逆順で一度だけクリーンアップします。", "取得と解放をcontext.use()へまとめます。例外が起きても、後片付けはLIFO順で一度だけ。finallyの迷路から抜けられます。"],
  ["リソースを配信スコープへ移し、レスポンス本文の配信が本当に終わるまで保持します。", "ストリーム中に必要なリソースはcontext.delivery.use()へ。Responseを返した瞬間に閉じてしまう、あの事故を防ぎます。"],
  ["Neloの仕組み", "Neloが面倒を見る範囲"],
  ["ハンドラが終わっても、リクエストは終わらない。", "returnしたあとも、仕事は残る。"],
  ["ハンドラ実行中の処理と、レスポンス配信中の処理を別の所有スコープとして扱います。", "ハンドラの実行とレスポンスの配信は、同じリクエストでも終わるタイミングが違います。Neloはそこを分けて管理します。"],
  ["子タスクを所有する", "Promiseを野良にしない"],
  ["context.fork()から非同期処理を開始し、名前・親子関係・終了状態・失敗を記録します。", "context.fork()で始めた処理には名前と親が付きます。終わったか、失敗したか、逃げたか。全部追えます。"],
  ["リソースを一度だけ閉じる", "後片付けを忘れない"],
  ["context.use()が取得と解放を管理し、失敗経路でもLIFO順でクリーンアップします。", "context.use()が取得と解放を一組にします。例外の日も、LIFO順で一度だけ片付けます。"],
  ["ストリームを早く閉じない", "配信が終わるまで閉じない"],
  ["context.delivery.use()が、完了・キャンセル・切断・停止まで配信用リソースを保持します。", "context.delivery.use()は、レスポンス本文の完了・切断・停止までリソースを保持します。returnはゴールではありません。"],
  ["最初の理由を残す", "中断理由は先着1名"],
  ["最初に発生した型付きキャンセル理由を、所有ツリー全体へ上書きせず伝播します。", "最初に起きた切断や停止の理由を、そのまま所有ツリーへ伝えます。あとから来た理由で上書きしません。"],
  ["ルート全体", "実際のルート"],
  ["普通のコードの中に、所有関係だけを足す。", "増えるのは、所有者を示す数行だけ。"],
  ["独自のRequestやResponseは不要です。追加するのは、処理の所有者を示す数行だけです。", "独自のRequestやResponseを覚える必要はありません。Web標準はそのまま。寿命の管理だけNeloに渡します。"],
  ["ownership lines", "所有関係を加える行"],
  ["context.fork() — task lifetime", "context.fork() — タスクの寿命"],
  ["context.use() — handler resource", "context.use() — ハンドラ中のリソース"],
  ["context.delivery.use() — response delivery", "context.delivery.use() — レスポンス配信中のリソース"],
  ["handler return<br>────────────<br>body delivery<br>────────────<br>cleanup once", "ハンドラ終了<br>────────────<br>本文を配信中<br>────────────<br>最後に1回だけ解放"],
  ["ownership: explicit", "所有関係を登録済み"],
  ["ランタイム対応", "対応環境"],
  ["検証できた範囲だけを対応と呼ぶ。", "動いたものだけ、動くと言う。"],
  ["Portable CoreとNodeアダプターは利用可能です。他のアダプターは実際の配信挙動を検証してから公開します。", "Portable CoreとNode.jsアダプターは実装・検証済みです。ほかのランタイムは、実際の配信と切断まで試してから名乗ります。"],
  [">Target<", ">環境<"],
  [">Status<", ">状態<"],
  [">Boundary<", ">確認した範囲<"],
  ["Fetch実行、所有スコープ、Response.body追跡", "Fetch API、所有スコープ、Response.bodyの完了追跡"],
  ["実ソケット、切断、バックプレッシャー、Graceful Shutdown", "実ソケット、切断、バックプレッシャー、グレースフルシャットダウン"],
  ["Portable実行。Production Adapterは未公開", "Portable Coreは動作確認済み。専用アダプターはまだ"],
  [">予定<", ">これから<"],
  ["Production Adapterとしての対応表明はまだ行わない", "「たぶん動く」ではなく、試してから追加します"],
  ["まず、一つのルートから。", "まずは、野良Promiseを一つ捕まえる。"],
  ["Promise、リソース、ストリームのどれか一つを、作成したリクエストの中へ移します。", "一つのルート、一つのタスクから。Neloの所有モデルは小さく導入できます。"],
  ["Getting Startedを開く", "Getting Startedへ"],
  ["すべての処理に、所有するリクエストを。", "仕事を、リクエストの中で終わらせる。"],
  ["コピー済み", "コピーしました"],
  ["地域から自動選択", "地域から選びました"],
];

const appendOnce = (base, extra, marker) => base.includes(marker) ? base : `${base}\n${extra}`;
const replaceChecked = (html, from, to) => html.includes(from) ? html.replaceAll(from, to) : html;

for (const file of ["en", "ja", "ko", "zh", "index"]) {
  const locale = file === "index" ? "en" : file;
  const data = localeData[locale];
  const path = `dist/${file}.html`;
  let html = await readFile(path, "utf8");

  html = html.replaceAll('<div class="float-tag b">stream → delivery</div>', "");
  const marqueeItems = [...data.strip, ...data.strip].map((item, index) => `<span style="--item:${index}">${item}</span>`).join("");
  html = html.replace(/<div class="marquee"><div class="marquee-track">[\s\S]*?<\/div><\/div>/, `<div class="marquee"><div class="marquee-track">${marqueeItems}</div></div>`);
  html = html.replace('<div class="progress"></div>', '<div class="progress"></div><div class="motion-cursor" aria-hidden="true"></div>');
  html = html.replace('<section class="hero" id="overview" data-section>', '<section class="hero" id="overview" data-section><div class="hero-gridlines" aria-hidden="true"></div>');
  html = html.replace('<div class="shell hero-grid"><div>', '<div class="shell hero-grid"><div class="hero-copy">');
  html = html.replaceAll('class="btn alt"', 'class="btn alt magnetic"').replaceAll('class="btn"', 'class="btn magnetic"');
  html = html.replace('<span>before → Nelo</span></div><div class="diff">', '<span>before → Nelo</span><i class="tab-timer" aria-hidden="true"></i></div><div class="diff">');
  const stateData = encodeURIComponent(JSON.stringify(data.states));
  html = html.replace('</div></div></div></section><div class="marquee">', `</div><div class="editor-state" data-states="${stateData}"><i></i><span>${data.states[0]}</span></div></div></div></section><div class="marquee">`);

  if (locale === "ja") {
    for (const [from, to] of jaReplacements) html = replaceChecked(html, from, to);
  }

  if (html.includes("stream → delivery")) throw new Error(`${file}: obsolete floating label remains`);
  if (!html.includes("editor-state") || !html.includes("tab-timer") || !html.includes(data.strip[0])) throw new Error(`${file}: motion polish failed`);
  if (locale === "ja" && (html.includes("所有されるタスク") || html.includes("スコープ付き解放") || html.includes("配信ライフタイム"))) throw new Error("Japanese translation-style copy remains");
  await writeFile(path, html);
}

const [css, js, polishCss, polishJs] = await Promise.all([
  readFile("dist/nelo-site.css", "utf8"),
  readFile("dist/nelo-site.js", "utf8"),
  readFile(new URL("./polish.css", import.meta.url), "utf8"),
  readFile(new URL("./polish.js", import.meta.url), "utf8"),
]);
await writeFile("dist/nelo-site.css", appendOnce(css, polishCss, "Motion polish: restrained"));
await writeFile("dist/nelo-site.js", appendOnce(js, polishJs, "const reducedMotion"));
console.log("Applied Nelo native Japanese copy and motion polish.");
