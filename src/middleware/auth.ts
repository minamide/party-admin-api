/**
 * JWT 認証ミドルウェア
 * リクエストから JWT を抽出、検証し、ユーザー情報をコンテキストに追加
 */

import { Context, Next } from 'hono';
import { verifyJWT, JWTPayload } from '../utils/jwt';
import { createErrorResponse } from '../utils/errors'; // ここを追加

declare global {
  interface CloudflareBindings {
    JWT_SECRET: string;
    auth?: AuthContext; // ここを追加
  }
}

export interface AuthContext {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  error?: string;
}

/**
 * JWT 認証ミドルウェア
 * Authorization ヘッダーから JWT を取得して検証
 * @param c - Hono Context
 * @param next - Next middleware
 */
export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const pathname = new URL(c.req.url).pathname;
  // Public routes that do not require auth
  const publicPrefixes = [
    '/health',
  ];

  const isPublic = publicPrefixes.some(prefix => pathname.startsWith(prefix));

  const authHeader = c.req.header('Authorization');
  if (!isPublic) console.log('authMiddleware: Processing request.');

  // Authorization ヘッダーがない場合
  if (!authHeader) {
    if (isPublic) {
      return next();
    }
    c.env.auth = { error: 'Missing Authorization header' } as AuthContext;
    console.log('authMiddleware: Missing Authorization header.');
    await next();
    return;
  }

  // Bearer スキーム以外のサポート
  if (!authHeader.startsWith('Bearer ')) {
    if (isPublic) {
      return next();
    }
    c.env.auth = { error: 'Invalid Authorization header format' } as AuthContext;
    console.log('authMiddleware: Invalid Authorization header format.');
    await next();
    return;
  }

  const token = authHeader.substring(7);
  console.log('authMiddleware: Token extracted.', token.substring(0, 10) + '...');

  try {
    // JWT を検証
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    console.log('authMiddleware: JWT verified. Payload userId:', payload.userId);

    // ユーザー情報をコンテキストに追加
    c.env.auth = {
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    } as AuthContext;
    console.log('authMiddleware: User context set.', c.env.auth.user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'JWT verification failed';
    console.warn('authMiddleware: JWT verification failed with primary secret.', message);

    // テスト環境向けフォールバック: 環境変数 TEST_JWT_SECRET が設定されていて
    // テスト実行中 (NODE_ENV=test または VITEST=1 または CI=1) の場合、
    // そのシークレットで再度検証を試みる。
    const testSecret = process.env.TEST_JWT_SECRET;
      const isD1Test = process.env.TEST_D1 === '1';
      if (testSecret && isD1Test) {
      try {
        const payload = await verifyJWT(token, testSecret);
        console.log('authMiddleware: JWT verified with TEST_JWT_SECRET. Payload userId:', payload.userId);
        c.env.auth = {
          user: {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
          },
        } as AuthContext;
      } catch (tError: unknown) {
        const tMsg = tError instanceof Error ? tError.message : 'Test JWT verification failed';
        c.env.auth = { error: tMsg } as AuthContext;
        console.error('authMiddleware: TEST_JWT_SECRET verification failed.', tMsg);
      }
    } else {
      c.env.auth = { error: message } as AuthContext;
      console.error('authMiddleware: JWT verification failed.', message);
    }
  }

  // ここで await next(); を呼び出す前に認証情報を設定
  await next();
}

/**
 * 認証が必須のミドルウェア
 * 認証されていないリクエストを 401 で拒否
 * @param c - Hono Context
 * @param next - Next middleware
 */
export async function requireAuth(c: Context, next: Next): Promise<void> {
  console.log('requireAuth: Entering requireAuth middleware.');

  // c.env が存在することを確認し、なければオブジェクトで初期化
  if (!c.env) {
    c.env = {} as any;
  }

  // authMiddleware によって認証情報が c.env.auth に設定されていることを期待
  let authContext = c.env.auth as AuthContext | undefined;
  console.log('requireAuth: Current authContext:', JSON.stringify(authContext, null, 2));

  // ユーザー情報がない、またはエラーがある場合は認証失敗
  if (!authContext?.user) {
    // テスト実行時にテスト用の既定認証コンテキストを注入するオプション
      if (process.env.TEST_AUTH_BYPASS === '1' && process.env.TEST_D1 === '1') {
      // テストバイパス時は、可能であればリクエストヘッダーからユーザーIDを読み取る。
      // - `x-test-user-id`: 明示的なテストユーザーIDヘッダー
      // - `Authorization: Bearer <token>`: トークンが JWT 形式ならペイロードをデコードして userId を代用
      const headerUserId = c.req.header('x-test-user-id');
      let resolvedUserId = headerUserId || process.env.TEST_AUTH_USER_ID || 'test-user';

      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        // 簡易 JWT ペイロードデコード（検証は行わない）: header.payload.signature
        if (token.split('.').length === 3) {
          try {
            const payloadB64 = token.split('.')[1];
            const payloadJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            if (payload && payload.userId) {
              resolvedUserId = String(payload.userId);
            }
          } catch (e) {
            // 無視してトークン文字列自体を userId として扱う
            resolvedUserId = token;
          }
        } else if (token.length > 0) {
          // JWT でない場合はトークン文字列自体を userId として扱う
          resolvedUserId = token;
        }
      }

      const testUser = {
        userId: resolvedUserId,
        email: process.env.TEST_AUTH_USER_EMAIL || 'test@example.com',
        role: process.env.TEST_AUTH_USER_ROLE || 'user',
      };
      c.env.auth = { user: testUser } as AuthContext;
      // ローカル参照を更新して以降の処理で安全に使えるようにする
      authContext = c.env.auth as AuthContext | undefined;
      console.log('requireAuth: TEST_AUTH_BYPASS enabled — injected test authContext.', testUser.userId);
    } else {
      console.warn('requireAuth: User not authenticated.', authContext?.error);
      return c.json(
        createErrorResponse(authContext?.error || 'Unauthorized', 'UNAUTHORIZED'),
        401
      );
    }
  }

  // 安全な参照でログを出力
  console.log('requireAuth: User authenticated.', authContext?.user?.userId ?? 'unknown');
  await next();
}

/**
 * メール認証済みユーザーのみアクセス可能にするミドルウェア
 * isVerified = 1 のユーザーのみ許可
 */
export async function requireVerifiedEmail(c: Context, next: Next): Promise<void> {
  console.log('requireVerifiedEmail: Checking email verification status.');

  // 先にrequireAuthが実行されていることを前提
  const authContext = c.env.auth as AuthContext;

  if (!authContext?.user) {
    console.warn('requireVerifiedEmail: User not authenticated.');
    return c.json(
      createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
      401
    );
  }

  // データベースからユーザーの認証状態を確認
  try {
    const { getDb } = await import('../utils/db');
    const { users } = await import('../db/schema');
    const { eq } = await import('drizzle-orm');

    const db = getDb(c);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, authContext.user.userId))
      .then(rows => rows[0]);

    if (!user) {
      console.warn('requireVerifiedEmail: User not found in database.');
      return c.json(
        createErrorResponse('User not found', 'USER_NOT_FOUND'),
        404
      );
    }

    if (!user.isVerified) {
      console.warn('requireVerifiedEmail: Email not verified for user:', user.id);
      return c.json(
        createErrorResponse(
          'Email verification required. Please verify your email address to access this resource.',
          'EMAIL_NOT_VERIFIED',
          {
            userId: user.id,
            email: user.email,
            isVerified: false
          }
        ),
        403
      );
    }

    console.log('requireVerifiedEmail: Email verified for user:', user.id);
    await next();
  } catch (error) {
    console.error('requireVerifiedEmail: Database error:', error);
    return c.json(
      createErrorResponse('Internal server error', 'SERVER_ERROR'),
      500
    );
  }
}

/**
 * 特定の役割が必要なミドルウェアを生成
 * @param requiredRole 必要な役割
 */
export function requireRole(requiredRole: string) {
  return async function (c: Context, next: Next): Promise<void> {
    const authContext = c.env.auth as AuthContext;

    if (!authContext?.user) {
      return c.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        401
      );
    }

    if (authContext.user.role !== requiredRole) {
      return c.json(
        createErrorResponse(
          `Forbidden: ${requiredRole} role required`,
          'FORBIDDEN',
          { userRole: authContext.user.role, requiredRole }
        ),
        403
      );
    }

    await next();
  };
}
