/**
 * 認証ルート
 * ユーザーのサインアップ、サインイン、サインアウトを処理
 */

import { Hono } from 'hono';
import { getDb } from '../utils/db';
import { generateJWT } from '../utils/jwt';
import { hashPassword, verifyPassword, checkPasswordStrength } from '../utils/password';
import { validateRequired, isValidEmail, isValidHandle } from '../utils/validation';
import { createErrorResponse } from '../utils/errors';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

export const authRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * POST /auth/sign-up
 * 新規ユーザー登録
 */
authRouter.post('/sign-up', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    const validation = validateRequired(body, ['email', 'handle', 'name', 'password']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }

    // メール形式のチェック
    if (!isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    // ハンドル形式のチェック
    if (!isValidHandle(body.handle)) {
      return c.json(
        createErrorResponse(
          'Handle must be 3-30 characters, alphanumeric and underscore only',
          'INVALID_HANDLE'
        ),
        400
      );
    }

    // パスワード強度のチェック
    const passwordStrength = checkPasswordStrength(body.password);
    if (passwordStrength === 'weak') {
      return c.json(
        createErrorResponse(
          'Password must be at least 8 characters with uppercase, lowercase, and numbers',
          'WEAK_PASSWORD',
          { strength: passwordStrength }
        ),
        400
      );
    }

    // ユーザーが既に存在するかチェック
    const db = getDb(c);
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .then(rows => rows[0]);

    if (existingEmail) {
      return c.json(
        createErrorResponse('Email already registered', 'EMAIL_EXISTS'),
        409
      );
    }

    const existingHandle = await db
      .select()
      .from(users)
      .where(eq(users.handle, body.handle))
      .then(rows => rows[0]);

    if (existingHandle) {
      return c.json(
        createErrorResponse('Handle already taken', 'HANDLE_EXISTS'),
        409
      );
    }

    // パスワードをハッシュ化
    const { hash, salt } = await hashPassword(body.password);
    
    console.log('Hash:', hash);
    console.log('Salt:', salt);

    // 新規ユーザーを作成
    const newUserId = crypto.randomUUID();
    
    const userData = {
      id: newUserId,
      name: body.name,
      email: body.email,
      handle: body.handle,
      passwordHash: hash,
      passwordSalt: salt,
      role: body.role || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('Inserting user data:', JSON.stringify(userData, null, 2));
    
    await db.insert(users).values(userData);

    // JWT を生成
    const token = await generateJWT(
      {
        userId: newUserId,
        email: body.email,
        role: body.role || 'user',
      },
      c.env.JWT_SECRET,
      86400 // 24 時間
    );

    return c.json(
      {
        success: true,
        data: {
          user: {
            id: newUserId,
            email: body.email,
            handle: body.handle,
            name: body.name,
            role: body.role || 'user',
          },
          token,
        },
      },
      201
    );
  } catch (error: unknown) {
    console.error('Sign up error:', error);
    const message = error instanceof Error ? error.message : 'Sign up failed';
    const stack = error instanceof Error ? error.stack : undefined;
    return c.json(createErrorResponse(message, 'SIGNUP_ERROR', { stack }), 500);
  }
});

/**
 * POST /auth/sign-in
 * ユーザーログイン
 */
authRouter.post('/sign-in', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    const validation = validateRequired(body, ['email', 'password']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR'
        ),
        400
      );
    }

    // ユーザーを検索
    const db = getDb(c);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .then(rows => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
        401
      );
    }

    // パスワード検証
    if (!user.passwordHash || !user.passwordSalt) {
      return c.json(
        createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
        401
      );
    }

    const passwordMatch = await verifyPassword(
      body.password,
      user.passwordHash,
      user.passwordSalt
    );

    if (!passwordMatch) {
      return c.json(
        createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'),
        401
      );
    }

    // JWT を生成
    const token = await generateJWT(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user',
      },
      c.env.JWT_SECRET,
      86400 // 24 時間
    );

    return c.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            handle: user.handle,
            name: user.name,
            role: user.role || 'user',
          },
          token,
        },
      },
      200
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sign in failed';
    return c.json(createErrorResponse(message, 'SIGNIN_ERROR'), 500);
  }
});

/**
 * POST /auth/sign-out
 * ユーザーログアウト
 * （JWT ベースなのでサーバー側では特に処理なし、クライアントがトークンを削除）
 */
authRouter.post('/sign-out', async (c) => {
  return c.json(
    {
      success: true,
      message: 'Signed out successfully',
    },
    200
  );
});

/**
 * GET /auth/me
 * 現在のユーザー情報を取得（認証が必須）
 */
authRouter.get('/me', async (c) => {
  const auth = c.env.auth as any;

  if (!auth?.user) {
    return c.json(
      createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
      401
    );
  }

  try {
    const db = getDb(c);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.user.userId))
      .then(rows => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('User not found', 'NOT_FOUND'),
        404
      );
    }

    return c.json(
      {
        success: true,
        data: user,
      },
      200
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return c.json(createErrorResponse(message, 'FETCH_ERROR'), 500);
  }
});

/**
 * POST /auth/change-password
 * ユーザーのパスワード変更
 */
authRouter.post('/change-password', async (c) => {
  try {
    const auth = c.env.auth as any;

    if (!auth?.user) {
      return c.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        401
      );
    }

    const body = await c.req.json();

    // バリデーション
    const validation = validateRequired(body, ['oldPassword', 'newPassword']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }

    // パスワード強度のチェック
    const passwordStrength = checkPasswordStrength(body.newPassword);
    if (passwordStrength === 'weak') {
      return c.json(
        createErrorResponse(
          'New password must be at least 8 characters with uppercase, lowercase, and numbers',
          'WEAK_PASSWORD',
          { strength: passwordStrength }
        ),
        400
      );
    }

    const db = getDb(c);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.user.userId))
      .then((rows) => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('User not found', 'NOT_FOUND'),
        404
      );
    }

    // 現在のパスワードを確認
    if (!user.passwordHash || !user.passwordSalt) {
      return c.json(
        createErrorResponse('Password not set for this account', 'PASSWORD_NOT_SET'),
        400
      );
    }

    const passwordMatch = await verifyPassword(
      body.oldPassword,
      user.passwordHash,
      user.passwordSalt
    );

    if (!passwordMatch) {
      return c.json(
        createErrorResponse('Invalid old password', 'INVALID_OLD_PASSWORD'),
        401
      );
    }

    // 新しいパスワードをハッシュ化
    const { hash, salt } = await hashPassword(body.newPassword);

    // パスワードを更新
    await db
      .update(users)
      .set({
        passwordHash: hash,
        passwordSalt: salt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, auth.user.userId));

    return c.json(
      {
        success: true,
        message: 'Password updated successfully',
      },
      200
    );
  } catch (error: unknown) {
    console.error('Change password error:', error);
    const message = error instanceof Error ? error.message : 'Failed to change password';
    const stack = error instanceof Error ? error.stack : undefined;
    return c.json(createErrorResponse(message, 'CHANGE_PASSWORD_ERROR', { stack }), 500);
  }
});
