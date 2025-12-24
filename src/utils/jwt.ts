/**
 * JWT (JSON Web Token) 生成・検証ユーティリティ
 * Web Crypto API を使用してセキュアに実装
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT を生成
 * @param payload - ペイロード
 * @param secret - 署名用シークレット
 * @param expiresInSeconds - 有効期限（秒）
 * @returns JWT トークン
 */
export async function generateJWT(
  payload: JWTPayload,
  secret: string,
  expiresInSeconds: number = 86400 // デフォルト 24 時間
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signature = await signMessage(message, secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${message}.${encodedSignature}`;
}

/**
 * JWT を検証
 * @param token - JWT トークン
 * @param secret - 署名用シークレット
 * @returns デコード済みペイロード
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;

  // 署名を検証
  const expectedSignature = await signMessage(message, secret);
  const expectedEncodedSignature = base64UrlEncode(expectedSignature);

  // 署名が一致するか確認（タイミング攻撃対策）
  const signatureMatch = await timingSafeCompare(
    encodedSignature,
    expectedEncodedSignature
  );

  if (!signatureMatch) {
    throw new Error('Invalid signature');
  }

  // ペイロードをデコード
  const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

  // 有効期限を確認
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Base64URL エンコード
 * @param str - エンコード対象の文字列またはバイナリ
 * @returns Base64URL エンコード済み文字列
 */
function base64UrlEncode(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;

  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }

  const base64 = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
  
  const base64Url = btoa(base64)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return base64Url;
}

/**
 * Base64URL デコード
 * @param str - Base64URL 文字列
 * @returns デコード済み JSON 文字列
 */
function base64UrlDecode(str: string): string {
  // パディングを追加
  const padding = 4 - (str.length % 4);
  const padded = str + (padding < 4 ? '='.repeat(padding) : '');

  // Base64 に戻す
  const base64 = padded
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * HMAC-SHA256 で署名を生成
 * @param message - メッセージ
 * @param secret - シークレット
 * @returns 署名バイナリ
 */
async function signMessage(message: string, secret: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  const secretData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return signature;
}

/**
 * タイミング攻撃に強い文字列比較
 * @param a - 比較値 A
 * @param b - 比較値 B
 * @returns 一致した場合 true
 */
async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aData = encoder.encode(a);
  const bData = encoder.encode(b);

  // 長さが異なる場合は即座に false
  if (aData.length !== bData.length) {
    return false;
  }

  // Web Crypto API の timingSafeEqual を使用（Cloudflare Workers）
  // テスト環境では利用不可の場合があるため、フォールバック実装
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(aData, bData);
  }

  // フォールバック: バイト単位の比較（タイミング攻撃対策）
  let result = 0;
  for (let i = 0; i < aData.length; i++) {
    result |= aData[i] ^ bData[i];
  }
  return result === 0;
}
