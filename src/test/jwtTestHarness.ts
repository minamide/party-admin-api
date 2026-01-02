import { generateJWT, JWTPayload } from '../utils/jwt';

/**
 * テスト環境向けに簡単に署名済み JWT を生成するユーティリティ
 * - 署名には `TEST_JWT_SECRET` 環境変数を利用します。
 */
export async function createTestToken(payload: JWTPayload, expiresInSeconds = 24 * 3600): Promise<string> {
  const secret = process.env.TEST_JWT_SECRET;
  if (!secret) throw new Error('TEST_JWT_SECRET is required to create test tokens');
  return generateJWT(payload, secret, expiresInSeconds);
}

export default createTestToken;
