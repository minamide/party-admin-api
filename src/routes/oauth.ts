/**
 * OAuth ルート
 * Google、GitHub、X、LINE の OAuth 認証エンドポイント
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import {
  OAuthProviderManager,
  ProviderType,
} from '../auth/providers/manager';
import {
  handleOAuthCallback,
  generateOAuthState,
  cleanupExpiredStates,
} from '../auth/oauth-callback';
import { createErrorResponse, getErrorMessage } from '../utils/errors';
import { getDb } from '../utils/db';
import { socialAccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export const oauthRouter = new Hono<{ Bindings: CloudflareBindings }>();

let oauthManager: OAuthProviderManager;

/**
 * OAuth マネージャーを初期化
 */
export function initializeOAuthManager(manager: OAuthProviderManager) {
  oauthManager = manager;
}

/**
 * GET /oauth/authorize/:provider
 * OAuth 認可リクエストをリダイレクト
 */
oauthRouter.get('/authorize/:provider', async (c: Context) => {
  try {
    const provider = c.req.param('provider') as ProviderType;

    // プロバイダーの確認
    if (!oauthManager.isProviderAvailable(provider)) {
      return c.json(
        createErrorResponse(`OAuth provider '${provider}' is not available`, 'PROVIDER_NOT_AVAILABLE'),
        400
      );
    }

    // State を生成
    const state = await generateOAuthState(c, provider, 600); // 10 分有効

    // OAuth プロバイダーを取得
    const oauthProvider = oauthManager.getProvider(provider);

    // デフォルトスコープを取得
    const scope = oauthProvider.getDefaultScopes();

    // 認可 URL を生成
    const authorizationUrl = oauthProvider.getAuthorizationUrl(state, scope);

    // リダイレクト
    return c.redirect(authorizationUrl);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_AUTHORIZE_ERROR'),
      500
    );
  }
});

/**
 * GET /oauth/callback/:provider
 * OAuth コールバック処理
 */
oauthRouter.get('/callback/:provider', async (c: Context) => {
  try {
    const provider = c.req.param('provider') as ProviderType;

    // プロバイダーの確認
    if (!oauthManager.isProviderAvailable(provider)) {
      return c.json(
        createErrorResponse(`OAuth provider '${provider}' is not available`, 'PROVIDER_NOT_AVAILABLE'),
        400
      );
    }

    // OAuth コールバック処理
    const result = await handleOAuthCallback(c, provider, {
      manager: oauthManager,
      sessionTimeout: 600,
    });

    if (!result.success) {
      return c.json(
        createErrorResponse(result.error || 'OAuth callback failed', 'OAUTH_CALLBACK_ERROR'),
        400
      );
    }

    // フロントエンドにリダイレクト
    // クライアントが JWT トークンを生成して返すようにしてください
    const redirectUrl = new URL(
      process.env.OAUTH_REDIRECT_URL || 'http://localhost:3000/auth/callback'
    );
    redirectUrl.searchParams.set('userId', result.userId || '');
    redirectUrl.searchParams.set('accessToken', result.accessToken || '');
    redirectUrl.searchParams.set('provider', provider);
    redirectUrl.searchParams.set('isNewUser', result.socialAccountLinked ? 'false' : 'true');

    return c.redirect(redirectUrl.toString());
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_CALLBACK_ERROR'),
      500
    );
  }
});

/**
 * GET /oauth/providers
 * 利用可能な OAuth プロバイダーのリストを取得
 */
oauthRouter.get('/providers', (c: Context) => {
  try {
    const providers = oauthManager.getAvailableProviders();
    return c.json(
      {
        providers: providers,
        count: providers.length,
      },
      200
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_ERROR'),
      500
    );
  }
});

/**
 * GET /oauth/linked
 * 認証済みユーザーのリンク済みソーシャルアカウントを取得（認証必須）
 */
oauthRouter.get('/linked', async (c: Context) => {
  try {
    const auth = c.env.auth as any;

    if (!auth?.user) {
      return c.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        401
      );
    }

    const db = getDb(c);
    const linked = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, auth.user.userId))
      .all();

    return c.json(
      {
        userId: auth.user.userId,
        linkedAccounts: linked.map((account) => ({
          provider: account.provider,
          email: account.email,
          name: account.name,
          linkedAt: account.linkedAt,
        })),
      },
      200
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_ERROR'),
      500
    );
  }
});

/**
 * DELETE /oauth/unlink/:provider
 * ソーシャルアカウント連携を削除（認証必須）
 */
oauthRouter.delete('/unlink/:provider', async (c: Context) => {
  try {
    const auth = c.env.auth as any;
    const provider = c.req.param('provider') as ProviderType;

    if (!auth?.user) {
      return c.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        401
      );
    }

    const db = getDb(c);

    // ソーシャルアカウント連携を削除
    const result = await db
      .delete(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, auth.user.userId),
          eq(socialAccounts.provider, provider)
        )
      );

    return c.json(
      {
        success: true,
        message: `${provider} account unlinked successfully`,
      },
      200
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_ERROR'),
      500
    );
  }
});
