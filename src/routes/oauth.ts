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
import { generateJWT } from '../utils/jwt';
import { getDb } from '../utils/db';
import { socialAccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export const oauthRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * GET /oauth/authorize/:provider
 * OAuth 認可リクエストをリダイレクト
 * redirect_uri パラメータはオプション（デフォルトは /oauth/callback/:provider）
 */
oauthRouter.get('/authorize/:provider', async (c: Context) => {
  try {
    const provider = c.req.param('provider') as ProviderType;
    const redirectUri = c.req.query('redirect_uri'); // フロントエンドのコールバック URL
    
    // Get OAuth manager from context
    const oauthManager = c.get('oauthManager') as OAuthProviderManager;
    
    if (!oauthManager) {
      return c.json(
        createErrorResponse('OAuth manager not initialized', 'OAUTH_NOT_INITIALIZED'),
        500
      );
    }

    // プロバイダーの確認
    if (!oauthManager.isProviderAvailable(provider)) {
      return c.json(
        createErrorResponse(`OAuth provider '${provider}' is not available`, 'PROVIDER_NOT_AVAILABLE'),
        400
      );
    }

    // State を生成（redirect_uri も含める）
    const state = await generateOAuthState(c, provider, 600, redirectUri); // 10 分有効

    // OAuth プロバイダーを取得
    const oauthProvider = oauthManager.getProvider(provider);

    // デフォルトスコープを取得
    const scope = oauthProvider.getDefaultScopes();

    // 認可 URL を生成（フロントのredirect_uriを使用）
    const authorizationUrl = oauthProvider.getAuthorizationUrl(state, scope, redirectUri);
    
    // デバッグ: 生成されたURLをログ出力
    console.log('Authorization URL:', authorizationUrl);
    console.log('Using redirect_uri:', redirectUri);

    // リダイレクト
    return c.redirect(authorizationUrl);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('OAuth authorize error:', error);
    return c.json(
      createErrorResponse(message, 'OAUTH_AUTHORIZE_ERROR'),
      500
    );
  }
});

/**
 * POST /oauth/exchange
 * OAuth コード交換処理（フロントエンド用）
 * code と state をリクエストボディで受け取り、JWT トークンを返す
 */
oauthRouter.post('/exchange', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { provider, code, state, redirectUri } = body;

    if (!provider || !code || !state) {
      return c.json(
        createErrorResponse('Missing required parameters: provider, code, state', 'INVALID_PARAMS'),
        400
      );
    }

    // Get OAuth manager from context
    const oauthManager = c.get('oauthManager') as OAuthProviderManager;

    if (!oauthManager) {
      return c.json(
        createErrorResponse('OAuth manager not initialized', 'OAUTH_NOT_INITIALIZED'),
        500
      );
    }

    // プロバイダーの確認
    if (!oauthManager.isProviderAvailable(provider)) {
      return c.json(
        createErrorResponse(`OAuth provider '${provider}' is not available`, 'PROVIDER_NOT_AVAILABLE'),
        400
      );
    }

    console.log('OAuth exchange requested:', { provider, code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', redirectUri });

    // OAuth コールバック処理
    const result = await handleOAuthCallback(c, provider as ProviderType, {
      manager: oauthManager,
      sessionTimeout: 600,
      code,
      state,
      redirectUri,
    });

    if (!result.success) {
      return c.json(
        createErrorResponse(result.error || 'OAuth exchange failed', 'OAUTH_EXCHANGE_ERROR'),
        400
      );
    }

    // JWT トークンを生成
    const token = await generateJWT(
      {
        userId: result.userId!,
        email: '', // プロフィールから取得する必要がある場合は追加
        role: 'user',
      },
      c.env.JWT_SECRET,
      86400 // 24 時間
    );

    // 成功レスポンスを返す
    return c.json(
      {
        success: true,
        data: {
          userId: result.userId,
          token,
          provider,
          isNewUser: !result.socialAccountLinked,
        },
      },
      200
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(
      createErrorResponse(message, 'OAUTH_EXCHANGE_ERROR'),
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
