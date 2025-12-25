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

**Total: 124 tests ✅ All Passing**

#### Unit Tests (86 tests)
```bash
npm test
```
19 test files covering all 19 route files

#### Integration Tests (10 tests)
```bash
npm run test:integration
```
Mock D1 integration tests for posts and users

#### D1 Database Tests (28 tests)
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

## 初期管理者ログイン情報

開発環境では、`seed.sql` を使用して初期管理者ユーザーが設定されています。

**メールアドレス:** `admin@example.com`
**パスワード:** `AdminPass123`

**注意:**
-   このパスワードは開発目的のものであり、本番環境では使用しないでください。
-   `seed.sql` を変更した場合は、この情報も更新してください。
-   パスワードハッシュは `generate-password-hash.ts` スクリプトで生成されます。

