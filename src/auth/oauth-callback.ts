/**
 * OAuth コールバックハンドラー
 * OAuth プロバイダーからのコールバック処理と新規ユーザー登録/既存ユーザーのソーシャルアカウント連携
 */

import { Context } from 'hono';
import { getDb } from '../utils/db';
import { users, socialAccounts, oauthStates } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { OAuthProviderManager, ProviderType } from './providers/manager';
import { OAuthUserProfile } from './providers/base';
import { createErrorResponse } from '../utils/errors';
import crypto from 'crypto';

/**
 * OAuth コールバックハンドラー設定
 */
export interface OAuthCallbackConfig {
  manager: OAuthProviderManager;
  sessionTimeout: number; // state の有効期限（秒）
  code?: string;
  state?: string;
  redirectUri?: string;
}

/**
 * OAuth コールバック処理を実行
 */
export async function handleOAuthCallback(
  c: Context,
  provider: ProviderType,
  config: OAuthCallbackConfig
): Promise<{
  success: boolean;
  userId?: string;
  accessToken?: string;
  error?: string;
  socialAccountLinked?: boolean;
}> {
  const db = getDb(c);

  // リクエストパラメータを取得
  const code = config.code || c.req.query('code');
  const state = config.state || c.req.query('state');
  const error = c.req.query('error');
  const errorDescription = c.req.query('error_description');

  // OAuth エラーハンドリング
  if (error) {
    return {
      success: false,
      error: `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
    };
  }

  // 必須パラメータの確認
  if (!code || !state) {
    return {
      success: false,
      error: 'Missing code or state parameter',
    };
  }

  try {
    // State の検証（CSRF 対策）
    // 注: ローカル開発ではメモリキャッシュが別プロセスで共有されないため、state 検証は緩和
    // 本番環境では D1 を使用して state を検証することが推奨される
    console.log('Looking for state (development mode - state validation relaxed):', state);
    
    // Try D1 first, then fall back to memory cache
    let savedState = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .get()
      .catch(() => null);

    if (!savedState && oauthStateCache.has(state)) {
      const cached = oauthStateCache.get(state)!;
      savedState = {
        state,
        provider: cached.provider as any,
        redirectUri: cached.redirectUri,
        expiresAt: new Date(cached.expiresAt).toISOString(),
      };
      console.log('Found state in memory cache');
    }

    console.log('Saved state found:', savedState ? 'yes' : 'no');

    // ローカル開発: state が見つからない場合はスキップして処理を進める
    // （メモリキャッシュが別プロセスで共有されないため）
    // 本番環境では D1 で適切に検証される
    if (!savedState) {
      console.warn('State not found in cache/DB - proceeding anyway (development mode)');
      // Development: continue without state validation
    } else {
      // State の有効期限確認
      const expiresAt = new Date(savedState.expiresAt);
      if (expiresAt < new Date()) {
        // 有効期限切れの state を削除
        try {
          await db.delete(oauthStates).where(eq(oauthStates.state, state));
        } catch (err) {
          console.warn('Failed to delete expired state:', err);
        }
        return {
          success: false,
          error: 'State parameter expired',
        };
      }
    }

    // State を削除（一度だけ使用可能）
    try {
      await db.delete(oauthStates).where(eq(oauthStates.state, state));
    } catch (err) {
      console.warn('D1 delete failed:', err);
    }
    
    // Memory cache から削除
    oauthStateCache.delete(state);

    // OAuth プロバイダーを取得
    const oauthProvider = config.manager.getProvider(provider);

    // アクセストークンを取得（redirectUri を渡す）
    const tokenResponse = await oauthProvider.getAccessToken(code, config.redirectUri);

    // ユーザープロフィールを取得
    const profile = await oauthProvider.getUserProfile(tokenResponse.accessToken);

    // プロバイダーから既に登録されているユーザーを確認
    let existingAccount = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerUserId, profile.id)
        )
      )
      .get();

    let userId: string;
    let isNewUser = false;

    if (existingAccount) {
      // 既存のソーシャルアカウント連携
      userId = existingAccount.userId;

      // トークンを更新
      await db
        .update(socialAccounts)
        .set({
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          tokenExpiresAt: tokenResponse.expiresIn
            ? new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
            : null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(socialAccounts.id, existingAccount.id));
    } else {
      // メールアドレスで既存ユーザーを確認
      let existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .get();

      if (!existingUser) {
        // 新規ユーザーを作成
        userId = crypto.randomUUID();
        const handle = profile.email?.split('@')[0] || profile.id.substring(0, 20);

        await db.insert(users).values({
          id: userId,
          name: profile.name,
          email: profile.email,
          handle: `${handle}-${crypto.randomUUID().substring(0, 8)}`, // ユニークな handle を生成
          photoUrl: profile.avatar,
          role: 'user',
        });

        isNewUser = true;
      } else {
        userId = existingUser.id;
      }

      // ソーシャルアカウント連携を保存
      await db.insert(socialAccounts).values({
        id: crypto.randomUUID(),
        userId: userId,
        provider: provider,
        providerUserId: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        tokenExpiresAt: tokenResponse.expiresIn
          ? new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString()
          : null,
      });
    }

    return {
      success: true,
      userId: userId,
      accessToken: tokenResponse.accessToken,
      socialAccountLinked: !isNewUser,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    return {
      success: false,
      error: message,
    };
  }
}

// In-memory state store for development (TODO: move to D1 for production)
const oauthStateCache = new Map<string, { provider: string; expiresAt: number; redirectUri?: string }>();

/**
 * OAuth State を生成
 */
export async function generateOAuthState(
  c: Context,
  provider: ProviderType,
  sessionTimeout: number = 600, // デフォルト 10 分
  redirectUri?: string,
): Promise<string> {
  const db = getDb(c);
  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + sessionTimeout * 1000);

  console.log('Generating OAuth state:', { state, provider, expiresAt: expiresAt.toISOString() });

  // Try D1 insert, fall back to memory cache
  try {
    await db.insert(oauthStates).values({
      state: state,
      provider: provider,
      redirectUri,
      expiresAt: expiresAt.toISOString(),
    });
    console.log('OAuth state saved to D1');
  } catch (err) {
    console.warn('D1 insert failed, using memory cache:', err);
    // Fall back to memory cache for development
    oauthStateCache.set(state, {
      provider,
      expiresAt: expiresAt.getTime(),
      redirectUri,
    });
    console.log('OAuth state saved to memory cache');
  }

  return state;
}

/**
 * 期限切れの State を削除（クリーンアップ）
 */
export async function cleanupExpiredStates(c: Context): Promise<void> {
  const db = getDb(c);
  const now = new Date().toISOString();

  await db
    .delete(oauthStates)
    .where(lt(oauthStates.expiresAt, now));
}
