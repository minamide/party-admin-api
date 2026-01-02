// Setup file for Vitest (D1 tests).
// Enable TEST_AUTH_BYPASS so middleware injects a test auth context.
process.env.TEST_AUTH_BYPASS = '1';
// Optional: configure default test user via env vars
// デフォルトのテストユーザーIDをテスト群で使われている値に合わせる
process.env.TEST_AUTH_USER_ID = process.env.TEST_AUTH_USER_ID || 'test-user-id';
process.env.TEST_AUTH_USER_EMAIL = process.env.TEST_AUTH_USER_EMAIL || 'test@example.com';
// デフォルトでは管理者ロールを使い、権限制御によるテストの失敗を避ける
process.env.TEST_AUTH_USER_ROLE = process.env.TEST_AUTH_USER_ROLE || 'admin';

// テスト用 JWT シークレット（テストで署名済みトークンを検証する場合に使用）
// CI での安定動作のためにデフォルト値を設定しています。実際のシークレットは CI 側で上書きしてください。
process.env.TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-secret-for-ci';
// このセットアップは D1 向けの Vitest 設定でのみ読み込まれるため、
// 明示的に D1 テストフラグを設定してミドルウェアの挙動を限定します。
process.env.TEST_D1 = '1';

console.log('setupAuthMock: TEST_AUTH_BYPASS enabled for Vitest.');
console.log('setupAuthMock: TEST_JWT_SECRET set:', !!process.env.TEST_JWT_SECRET);
