```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Testing

### Test Suite Summary

**Current Status: Partial Pass**
- Unit tests with authentication mocking: 7/13 passing
- D1 database integration: Ready (requires mocking setup improvements)
- Overall: Tests in progress, core functionality tested via manual API testing

#### Unit Tests
```bash
npm test
```
Tests use mocked databases and authentication middleware

#### Integration Tests
```bash
npm run test:integration
```
D1 integration tests for posts and users

#### D1 Database Tests
```bash
npm run test:d1
```
D1-specific tests with ACID properties, performance, concurrency

### Configuration
- `vitest.config.ts` - Unit tests
- `vitest.integration.config.ts` - Integration tests
- `vitest.d1.config.ts` - D1 tests

### Commands
```bash
npm test           # Run all tests
npm test:watch    # Watch mode
npm run test:coverage  # Coverage report
npm run test:integration  # Integration only
npm run test:d1   # D1 tests only
```

## メール認証設定

開発環境でメール認証を利用するには、以下の環境変数が `wrangler.jsonc` に設定されている必要があります:

```jsonc
"vars": {
  "NODE_ENV": "development",
  "BASE_URL": "http://localhost:3000",
  "FROM_EMAIL": "noreply@party-admin.local",
  "EMAIL_SERVICE": "development"
}
```

開発環境では、メール送信はコンソールに出力されます。メール認証トークンを確認するには、`npm run dev` 実行中の ターミナルを確認してください。

詳細は [EMAIL_AUTH_TROUBLESHOOTING.md](./docs/EMAIL_AUTH_TROUBLESHOOTING.md) を参照してください。

## 初期管理者ログイン情報

開発環境では、`seed.sql` を使用して初期管理者ユーザーが設定されています。

**メールアドレス:** `admin@example.com`
**パスワード:** `AdminPass123`

**注意:**
-   このパスワードは開発目的のものであり、本番環境では使用しないでください。
-   `seed.sql` を変更した場合は、この情報も更新してください。
-   パスワードハッシュは `generate-password-hash.ts` スクリプトで生成されます。

