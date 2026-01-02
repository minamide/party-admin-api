**TEST_AUTH_BYPASS (テスト用認証バイパス)**

- **目的**: ローカル／CI の D1 統合テスト実行時に、実際の JWT 発行や外部認証に依存せずに `requireAuth` ミドルウェアへ認証コンテキストを注入するための仕組みです。

- **使い方**: Vitest が起動すると `src/test/setupAuthMock.ts` が読み込まれ、環境変数 `TEST_AUTH_BYPASS=1` を設定します。これにより `requireAuth` は `c.env.auth` にテスト用の `user` を注入します。

- **変更点**:
  - `src/middleware/auth.ts` にバイパス処理を追加（`process.env.TEST_AUTH_BYPASS === '1'` の場合に `c.env.auth` を設定）。
  - `src/test/setupAuthMock.ts` を追加して Vitest 実行時に環境変数を設定。
  - `vitest.d1.config.ts` に `setupFiles: ['src/test/setupAuthMock.ts']` を追加。

- **カスタマイズ**: デフォルトのテストユーザーは以下の環境変数で上書きできます。
  - `TEST_AUTH_USER_ID`（デフォルト: `test-user`）
  - `TEST_AUTH_USER_EMAIL`（デフォルト: `test@example.com`）
  - `TEST_AUTH_USER_ROLE`（デフォルト: `user`）

  - **ヘッダーによるオーバーライド**:
    - `x-test-user-id`: このヘッダーがあると、その値がテスト用の `userId` として使われます。
    - `Authorization: Bearer <token>`: トークンが JWT 形式であればペイロードをデコードして `userId` フィールドを利用します。JWT でない場合はトークン文字列自体を `userId` として扱います。

- **安全性と注意点**:
  - このバイパスはテスト実行時のみ有効にしてください。`src/test/setupAuthMock.ts` が読み込まれるのは Vitest の設定で指定された場合のみです。
  - 本番環境やデプロイ環境で `TEST_AUTH_BYPASS` を有効にしないよう CI/デプロイ設定を確認してください。

- **CI での推奨設定**:
  - CI でこれを利用する場合、ジョブ環境で `TEST_AUTH_BYPASS=1` をセットしておくと、テストが外部認証に依存せず安定して実行できます。

- **テスト用 JWT（推奨）**:
  - より実運用に近いテストを行うには、`TEST_JWT_SECRET` を CI に設定し、テスト側で署名済み JWT を生成して `Authorization: Bearer <token>` ヘッダーでリクエストを送信する方法を推奨します。
  - `src/test/jwtTestHarness.ts` を利用してトークンを生成できます:
    - `createTestToken({ userId, email, role })` を呼び出して署名済みトークンを作成します。
  - 利点: 実際の JWT 検証ロジックが通るため、ミドルウェアの挙動が本番に近くなります。
  - 注意: `TEST_JWT_SECRET` はテスト用途のシークレットです。CI 以外で公開しないでください。

  - **GitHub Actions 例**: 下記は CI 上で `TEST_JWT_SECRET` を設定してテストを実行するサンプルワークフローです。

```yaml
name: D1 Integration Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-d1:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: test
      CI: '1'
      TEST_JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build --if-present
      - run: npm run test:d1
        env:
          TEST_AUTH_BYPASS: '0'

```

  - CI でこのワークフローを使う場合、リポジトリの `Secrets` に `TEST_JWT_SECRET` を登録してください。

    - **このリポジトリ向けの改善**: ワークフロー内でトークンを自動生成するスクリプトを追加しました。ワークフローは `scripts/generate-test-tokens.mjs` を実行して `TEST_ADMIN_TOKEN` と `TEST_USER_TOKEN` を `GITHUB_ENV` に書き込みます。これらの環境変数はテスト実行時に利用できます。

    - **使用例（テスト内）**:

  ```ts
  // Vitest のテストから直接利用する例
  const adminToken = process.env.TEST_ADMIN_TOKEN;
  await request(app).post('/some/protected').set('Authorization', `Bearer ${adminToken}`)...
  ```


---
作成日: 2026-01-02
