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

