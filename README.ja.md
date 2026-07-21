<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/nelo-wordmark-on-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/nelo-wordmark-on-light.svg">
    <img src="./assets/nelo-wordmark-on-light.svg" alt="Nelo — Every request owns its work." width="560">
  </picture>
</p>

<p align="center">
  <strong>リクエストに紐づく処理を、終了まで管理するTypeScriptフレームワーク。</strong><br>
  <sub>子タスク、キャンセル、リソース、レスポンス配信を、処理を始めたリクエストの中に保ちます。</sub>
</p>

<p align="center">
  <img alt="開発段階: 実験的" src="https://img.shields.io/badge/開発段階-実験的-6d7178">
  <img alt="バージョン: 0.2.0 alpha 1" src="https://img.shields.io/badge/version-0.2.0--alpha.1-2864dc">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <a href="./LICENSE"><img alt="Apache-2.0 license" src="https://img.shields.io/badge/license-Apache--2.0-5bc8ad"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> · 日本語 · <a href="https://nelo.lattee.jp">Webサイト</a>
</p>

Neloは、リクエストから始まった処理を、そのリクエストが所有する仕事として管理します。ハンドラーが`Response`を返したあとも、非同期タスクが動いていたり、リソースが開いたままだったり、レスポンス本文の送信が続いていたりします。Neloはそれぞれの寿命を明示し、待機、中断、解放、所有権の移動を意図的に行えるようにします。

> `Response`を返した時点で、リクエストに関係する処理がすべて終わるとは限りません。

## Neloが解決する問題

通常の非同期ハンドラーでは、次のような処理が残ることがあります。

- 待つ人がいないPromiseが、そのまま動き続ける。
- クライアントとの接続が切れても、関連する処理が止まらない。
- ストリームが使っているリソースを、ハンドラー終了時に閉じてしまう。
- 後片付けや配信中に起きた失敗を確認できない。
- サーバー終了時に、リクエストから始まった処理が残る。

Neloは標準の`Request`、`Response`、`Headers`、`URL`、`ReadableStream`、`AbortSignal`を保ったまま、これらの処理がどのリクエストに属するのかを明確にします。

## ライフタイム

```text
リクエストのライフタイム
├── ハンドラースコープ
│   ├── ミドルウェア
│   ├── context.fork()
│   └── context.use()
└── デリバリースコープ
    ├── Response.body
    ├── context.delivery.fork()
    └── context.delivery.use()
```

ハンドラースコープは、ハンドラーの終了後に閉じます。デリバリースコープは、レスポンス本文の送信が完了するか、失敗、中断、切断が起きるまで残ります。登録したリソースは一度だけ、取得した順序と逆に解放されます。

## 使用例

```ts
import { Nelo } from "@lasder/nelo";

const app = new Nelo();

app.get("/users/:id", async (context) => {
  const user = context.fork("user", (signal) =>
    fetchUser(context.params.id!, { signal })
  );

  const feed = context.fork("feed", (signal) =>
    fetchFeed(context.params.id!, { signal })
  );

  return context.json({
    user: await user,
    feed: await feed,
  });
});
```

タスクは、開始した時点からNeloの管理下に置く必要があります。すでに動き始めた任意のPromiseへ、あとから確実な中断処理を付けるものではありません。

## 主なAPI

| API | 役割 |
|---|---|
| `app.fetch(request)` | ルーティング、ミドルウェア、ハンドラー、レスポンス配信を実行します。 |
| `context.fork(name, operation)` | 現在のリクエストが所有するタスクを開始します。 |
| `context.signal` | リクエストに紐づく処理へ中断通知を渡します。 |
| `context.use(name, acquire, cleanup?)` | ハンドラー内で使うリソースを取得し、一度だけ解放します。 |
| `context.delivery.fork(name, operation)` | レスポンス配信が所有する処理を開始します。 |
| `context.delivery.use(cleanup)` | レスポンス配信の終了時に実行する後片付けを登録します。 |
| `LifetimeScope#createChild(name)` | 親子関係を持つ新しい所有範囲を作ります。 |

### 所有されるタスク

`context.fork()`は、`await`できる`OwnedTask`を返します。タスク名、親スコープ、終了状態、失敗内容が診断情報として残ります。

```ts
const profile = context.fork("profile", (signal) =>
  loadProfile({ signal })
);

return context.json(await profile);
```

所有されたタスクを待たず、別のスコープへ移さないまま終了すると、Neloは中断を要求し、`NELO_TASK_001`を報告します。

### 協調的な中断

Neloは最初の中断理由を保持し、子スコープと所有タスクへ同じ`AbortSignal`を伝えます。JavaScriptは任意のPromiseを強制終了できないため、処理側も受け取ったSignalを確認し、安全に止まる必要があります。

### リソースの解放

```ts
const connection = await context.use(
  "database",
  (signal) => database.connect({ signal }),
  (resource) => resource.close(),
);
```

リソースは、所有された処理が終了したあとに一度だけ解放されます。複数ある場合は、取得した順序と逆に処理します。ハンドラー、タスク、後片付けで起きた失敗は失われず、必要に応じてまとめて報告されます。

### レスポンス配信が所有するリソース

ストリームが使うリソースは、ハンドラーが返ったあとも必要になる場合があります。その場合はデリバリースコープへ後片付けを登録します。

```ts
app.get("/stream", async (context) => {
  const resource = await openResource();
  context.delivery.use(() => resource.close());

  return new Response(resource.stream());
});
```

デリバリースコープは、本文の送信完了、中断、生成側の失敗、クライアント切断、サーバー終了のいずれかで閉じます。

## Webフレームワークとしての機能

現在の共通部分には、次の機能があります。

- `app.fetch(Request)`によるFetch形式の実行。
- 静的ルートと名前付きパラメーター。
- `404`と`405`を含むメソッド判定。
- 静的ルートを優先する決定的なルーティング。
- 全体またはルート単位のミドルウェア。
- ミドルウェアの`next()`を一度だけ呼べる制約。
- 共通のエラー処理。
- `json`、`text`、`fork`、`use`、`delivery`ヘルパー。
- 中断通知を無視するタスクへの上限付き診断。
- ハンドラー終了時と配信終了時の後片付け失敗の報告。

## 対応状況

| 機能 | 共通部分 | Node.js | Cloudflare | Deno | Bun |
|---|:---:|:---:|:---:|:---:|:---:|
| リクエストスコープ | ✅ | — | — | ✅ | — |
| 所有タスク | ✅ | — | — | ✅ | — |
| リソース解放 | ✅ | — | — | ✅ | — |
| レスポンス配信の追跡 | ✅ | ✅ | 予定 | 予定 | 予定 |
| クライアント切断の検知 | — | ✅ | 予定 | 予定 | 予定 |
| 安全なサーバー終了 | — | ✅ | 予定 | 予定 | 予定 |
| レスポンス後の処理 | — | 予定 | 予定 | 予定 | 予定 |

共通部分は`Response.body`を包み、観測できる本文の境界でデリバリースコープを閉じます。Node.jsアダプターは、接続の切断、バックプレッシャー、サーバー終了も同じモデルへ結び付けます。

## 現在の制限

Neloは、次の動作を保証しません。

- 任意のPromiseの強制終了。
- クライアントがすべてのバイトを物理的に受信したことの証明。
- 永続的または厳密に一度だけ実行されるバックグラウンド処理。
- Cloudflare、Deno、Bun向けアダプターの完成。
- すべてのランタイムで同一の通信動作。

各ランタイムの動作は、アダプターと実際の通信テストが揃った範囲だけを対応済みとして記載します。

## 開発

現在のリポジトリでは、アルファ版パッケージを`@lasder/nelo`として準備しています。

```bash
git clone https://github.com/lasder-ca/Nelo.git
cd Nelo
npm install

npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm run check:package
npm run check:tarball
npm run pack:dry-run
```

## ロードマップ

- **Phase 1 — 完了:** ライフタイム、所有タスク、中断理由、リソース解放。
- **Phase 2 — 完了:** Fetch形式のAPI、ルーティング、ミドルウェア、コンテキスト、エラー処理。
- **Phase 3 — 完了:** Node.jsアダプター、実ソケットでの切断テスト、配信追跡、安全なサーバー終了、CI。
- **Phase 4 — 完了:** ハンドラーと配信の分離、配信が所有する処理、型付き中断理由、後片付け失敗の集約、リクエスト診断。
- **今後:** 追加ランタイム向けアダプター、レスポンス後の処理、診断ツール。

## ライセンス

[Apache License 2.0](./LICENSE)で公開しています。
