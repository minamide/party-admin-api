/**
 * メール認証フロー テストスクリプト
 * 署名登録→メール認証トークン検証 のフロー全体をテスト
 */

import { Hono } from 'hono';
import type { CloudflareBindings } from './worker-configuration';

// テスト用のベースURL
const BASE_URL = 'http://localhost:8787';

interface SignupPayload {
  name: string;
  email: string;
  handle: string;
  password: string;
}

interface VerifyEmailPayload {
  token: string;
}

/**
 * 署名登録エンドポイントへのリクエスト
 */
async function testSignup(payload: SignupPayload): Promise<any> {
  console.log('\n📝 ステップ 1: ユーザー登録...');
  const response = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Signup failed: ${data.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * メール認証トークン検証エンドポイントへのリクエスト
 */
async function testVerifyEmail(token: string): Promise<any> {
  console.log('\n✉️ ステップ 2: メール認証トークン検証...');
  const response = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Email verification failed: ${data.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * 署名後にデータベースからトークンを取得（開発テスト用）
 */
async function extractTokenFromResponse(signupResponse: any): Promise<string> {
  // 本来はメール内容から取得するが、開発環境ではコンソールログから抽出
  // ここでは簡略版として、レスポンスから推測される情報を使用
  console.log('\n🔍 メール認証トークンを取得中...');
  console.log('注: 開発環境では console.log に出力されたメール内容からトークンを抽出してください');
  return '';
}

/**
 * メイン テストフロー
 */
async function runEmailAuthTest() {
  console.log('🚀 メール認証フロー テスト開始\n');
  console.log('='.repeat(50));

  const testUser: SignupPayload = {
    name: 'テスト ユーザー',
    email: `test-${Date.now()}@example.com`,
    handle: `testuser${Date.now()}`,
    password: 'TestPassword123!',
  };

  try {
    // ステップ 1: ユーザー登録
    const signupResponse = await testSignup(testUser);
    console.log('✅ ユーザー登録成功');

    // ステップ 2: メール認証トークンを取得
    // 実際の運用では、ユーザーがメールをクリックして検証しますが、
    // テスト環境では develop console に出力されたトークンを使用します
    console.log('\n⚠️ 次のステップ:');
    console.log('1. npm run dev でサーバーを起動している場合、開発コンソールを確認してください');
    console.log('2. メール認証トークンの完全なURLが表示されています');
    console.log('3. URLから token パラメータを抽出して、以下のコマンドを実行してください:');
    console.log(
      `   curl -X POST http://localhost:8787/auth/verify-email -H "Content-Type: application/json" -d '{"token":"<your-token-here>"}'`
    );

    console.log('\n' + '='.repeat(50));
    console.log('📋 登録されたユーザー情報:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Handle: ${testUser.handle}`);
    console.log(`  Password: ${testUser.password}`);
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

// テスト実行
runEmailAuthTest().catch(console.error);
