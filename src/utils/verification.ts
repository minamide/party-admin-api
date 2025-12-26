/**
 * Email認証トークン管理ユーティリティ
 */

import { eq, and, lt } from 'drizzle-orm';
import { verificationTokens } from '../db/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

/**
 * 認証トークンの種類
 */
export type TokenType = 'email_verification' | 'password_reset';

/**
 * トークン生成結果
 */
export interface TokenResult {
  token: string;
  expiresAt: string;
}

/**
 * トークン検証結果
 */
export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  error?: string;
  isExpired?: boolean;
  isUsed?: boolean;
}

/**
 * セキュアなランダムトークン生成
 * @param length トークンの長さ（デフォルト: 32文字）
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 認証トークンを生成してデータベースに保存
 * @param db データベース接続
 * @param userId ユーザーID
 * @param type トークンタイプ
 * @param expirationHours 有効期限（時間、デフォルト: 24時間）
 */
export async function createVerificationToken(
  db: DrizzleD1Database,
  userId: string,
  type: TokenType,
  expirationHours: number = 24
): Promise<TokenResult> {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
  
  // 既存の同じタイプの未使用トークンを削除
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.type, type)
      )
    );

  // 新しいトークンを作成
  await db
    .insert(verificationTokens)
    .values({
      id: crypto.randomUUID(),
      userId,
      token,
      type,
      expiresAt,
      usedAt: null,
    });

  return { token, expiresAt };
}

/**
 * トークンの有効性を検証
 * @param db データベース接続
 * @param token 検証するトークン
 * @param type 期待するトークンタイプ
 */
export async function validateVerificationToken(
  db: DrizzleD1Database,
  token: string,
  type: TokenType
): Promise<TokenValidationResult> {
  try {
    const tokenRecord = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, type)
        )
      )
      .then(rows => rows[0]);

    if (!tokenRecord) {
      return { isValid: false, error: 'Token not found' };
    }

    // 既に使用済みかチェック
    if (tokenRecord.usedAt) {
      return { isValid: false, error: 'Token already used', isUsed: true };
    }

    // 有効期限チェック
    const now = new Date();
    const expires = new Date(tokenRecord.expiresAt);
    if (now > expires) {
      return { isValid: false, error: 'Token expired', isExpired: true };
    }

    return { isValid: true, userId: tokenRecord.userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token validation failed';
    return { isValid: false, error: message };
  }
}

/**
 * トークンを使用済みとしてマーク
 * @param db データベース接続
 * @param token 使用するトークン
 * @param type トークンタイプ
 */
export async function markTokenAsUsed(
  db: DrizzleD1Database,
  token: string,
  type: TokenType
): Promise<boolean> {
  try {
    const result = await db
      .update(verificationTokens)
      .set({ 
        usedAt: new Date().toISOString() 
      })
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, type)
        )
      );

    return true;
  } catch (error) {
    console.error('Failed to mark token as used:', error);
    return false;
  }
}

/**
 * 期限切れトークンをクリーンアップ
 * @param db データベース接続
 */
export async function cleanupExpiredTokens(db: DrizzleD1Database): Promise<number> {
  try {
    const now = new Date().toISOString();
    const result = await db
      .delete(verificationTokens)
      .where(lt(verificationTokens.expiresAt, now));
    
    console.log(`Cleaned up expired verification tokens`);
    return 0; // D1 doesn't return affected rows count
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
    return 0;
  }
}

/**
 * 認証URL生成
 * @param baseUrl アプリのベースURL
 * @param token 認証トークン
 * @param type トークンタイプ
 */
export function generateVerificationUrl(
  baseUrl: string,
  token: string,
  type: TokenType = 'email_verification'
): string {
  const endpoint = type === 'email_verification' ? 'verify-email' : 'reset-password';
  return `${baseUrl}/auth/${endpoint}?token=${token}`;
}

/**
 * メール認証完了後の処理
 * @param db データベース接続
 * @param userId ユーザーID
 */
export async function completeEmailVerification(
  db: DrizzleD1Database,
  userId: string
): Promise<boolean> {
  try {
    const { users } = await import('../db/schema');
    
    await db
      .update(users)
      .set({ 
        isVerified: 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('Failed to complete email verification:', error);
    return false;
  }
}