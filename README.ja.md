<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/nelo-wordmark-on-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/nelo-wordmark-on-light.svg">
    <img src="./assets/nelo-wordmark-on-light.svg" alt="Nelo — Every request owns its work." width="520">
  </picture>
</p>

<p align="center">
  <strong>TypeScriptのリクエストに、タスク、リソース、中断、レスポンス配信を所有させます。</strong>
</p>

<p align="center">
  <img alt="実験的" src="https://img.shields.io/badge/status-experimental-6d7178">
  <img alt="Version 0.2.0 alpha 1" src="https://img.shields.io/badge/version-0.2.0--alpha.1-2864dc">
  <img alt="Strict TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <a href="./LICENSE"><img alt="Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-5bc8ad"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> · 日本語 · <a href="https://nelo.lattee.jp">Webサイト</a>
</p>

Neloは、各リクエストを、そのリクエストから始まった処理の所有者として扱うWeb Standardsベースのフレームワークです。ハンドラーが`Response`を返したあとも、タスク、リソース、レスポンス本文の配信が残る場合があります。Neloはそれぞれの寿命を明示します。

> `Response`を返した時点で、リクエストに関係する処理がすべて終わるとは限りません。

## クイックスタート

```ts
import { Nelo } from "@lasder/nelo";
import { serve } from "@lasder/nelo/node";

const app = new Nelo();

app.get("/users/:id", async (context) => {
  const user = context.fork("load-user", (signal) =>
    fetchUser(context.params.id!, { signal })
  );

  return context.json(await user);
});

const server = serve(app, { port: 3000 });
await server.listen();
```

タスクは開始時点からNeloの管理下に置く必要があります。すでに動き始めた任意のPromiseへ、あとから確実な中断処理を付けるものではありません。

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

ハンドラースコープはハンドラー終了後に閉じます。デリバリースコープは、本文の完了、失敗、中断、接続切断まで残ります。リソースは一度だけ、取得した順序と逆に解放されます。

## 主なAPI

| API | 役割 |
|---|---|
| `app.fetch(request)` | ルーティング、ミドルウェア、ハンドラー、配信を実行します。 |
| `context.fork(name, operation)` | リクエストが所有するタスクを開始します。 |
| `context.signal` | リクエストの中断通知を処理へ渡します。 |
| `context.use(name, acquire, cleanup?)` | ハンドラーが所有するリソースを取得・解放します。 |
| `context.delivery.fork(name, operation)` | レスポンス配信が所有する処理を開始します。 |
| `context.delivery.use(...)` | リソースや後片付けを配信終了まで保持します。 |

現在は、静的ルートとパラメータールート、全体・ルート単位のミドルウェア、`404`/`405`、共通エラー処理、上限付き診断、Node.jsアダプター、切断検知、ストリーミングのバックプレッシャー、安全なサーバー終了も含みます。

## Lvau連携

[`examples/lvau-service`](./examples/lvau-service/mod.ts)は、Lvauのファイル暗号化CLIをリクエストが所有する処理として実行します。クライアント切断時には子プロセスを終了し、一時平文をハンドラースコープとともに削除します。アップロードサイズを制限し、パスワードは権限を制限したローカルファイルから読み取ります。

設定方法と安全上の境界は[連携ガイド](./docs/integrations/lvau.md)を確認してください。

## 対応状況

| 機能 | 共通部分 | Node.js | その他のランタイム |
|---|:---:|:---:|:---:|
| リクエスト所有のタスクとリソース | 対応 | 対応 | 共通APIは移植可能 |
| レスポンス本文の寿命追跡 | 対応 | 対応 | アダプター未実装 |
| クライアント切断との連携 | — | 対応 | アダプター未実装 |
| 安全なサーバー終了 | — | 対応 | アダプター未実装 |
| 永続的な遅延処理 | 非対応 | 非対応 | 保証しません |

各ランタイムは、アダプターと実通信テストが揃った範囲だけを対応済みとします。

## 現在の制限

Neloは、次を保証しません。

- 任意のPromiseの強制終了。
- クライアントが全バイトを物理的に受信したことの証明。
- 永続的または厳密に一度だけ実行されるバックグラウンド処理。
- すべてのランタイムで同一の通信動作。
- Cloudflare、Deno、Bun向けアダプターの完成。

## 開発

現在のパッケージ名は`@lasder/nelo`です。Node.js 20、22、24とDeno 2でソースを検証します。

```sh
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
```

関連文書:

- [Node.jsアダプター](./docs/adapters/node.md)
- [リクエスト所有のADR](./docs/adr/0002-nelo-request-ownership.md)
- [Lvau連携](./docs/integrations/lvau.md)

## ライセンス

[Apache License 2.0](./LICENSE)で公開しています。
