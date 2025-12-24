/**
 * パスワード管理ユーティリティ
 * Web Crypto API を使用してセキュアにハッシュ化
 */

/**
 * パスワードをハッシュ化
 * PBKDF2 アルゴリズムを使用（Cloudflare Workers で標準サポート）
 * @param password - プレーンテキストパスワード
 * @param salt - ソルト（デフォルト: ランダム生成）
 * @returns {hash, salt} ハッシュとソルト（Base64 エンコード）
 */
export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  // ソルトが指定されない場合はランダム生成
  if (!salt) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    salt = arrayBufferToBase64(saltBytes);
  }

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = base64ToArrayBuffer(salt);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000, // セキュアな反復回数
      hash: 'SHA-256',
    },
    key,
    256 // 256 ビット = 32 バイト
  );

  const hash = arrayBufferToBase64(derivedBits);

  return { hash, salt };
}

/**
 * パスワードを検証
 * @param password - プレーンテキストパスワード
 * @param hash - ハッシュ（Base64 エンコード）
 * @param salt - ソルト（Base64 エンコード）
 * @returns 一致した場合 true
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const { hash: computedHash } = await hashPassword(password, salt);

  // タイミング攻撃に強い比較
  const encoder = new TextEncoder();
  const hashData = encoder.encode(hash);
  const computedHashData = encoder.encode(computedHash);

  if (hashData.length !== computedHashData.length) {
    return false;
  }

  // Web Crypto API の timingSafeEqual を使用（Cloudflare Workers）
  // テスト環境では利用不可の場合があるため、フォールバック実装
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    try {
      return crypto.subtle.timingSafeEqual(hashData, computedHashData);
    } catch {
      // フォールバック
    }
  }

  // フォールバック: バイト単位の比較
  let result = 0;
  for (let i = 0; i < hashData.length; i++) {
    result |= hashData[i] ^ computedHashData[i];
  }
  return result === 0;
}

/**
 * ArrayBuffer を Base64 文字列に変換
 * @param buffer - ArrayBuffer
 * @returns Base64 文字列
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binaryString = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  return btoa(binaryString);
}

/**
 * Base64 文字列を ArrayBuffer に変換
 * @param base64 - Base64 文字列
 * @returns ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * パスワードの強度をチェック
 * @param password - パスワード
 * @returns 強度レベル: 'weak' | 'medium' | 'strong'
 */
export function checkPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) {
    return 'weak';
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const strength = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(
    Boolean
  ).length;

  if (strength >= 3 && password.length >= 12) {
    return 'strong';
  } else if (strength >= 2 && password.length >= 10) {
    return 'medium';
  } else {
    return 'weak';
  }
}

/**
 * セキュアなランダムトークンを生成
 * @param length - トークン長（バイト数）
 * @returns Base64 エンコード済みランダムトークン
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return arrayBufferToBase64(bytes);
}
