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
import { sendEmail, generateVerificationEmailHtml, generateVerificationEmailText } from '../utils/email';
import { 
  createVerificationToken, 
  validateVerificationToken, 
  markTokenAsUsed, 
  completeEmailVerification,
  generateVerificationUrl 
} from '../utils/verification';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

const safeParseSettings = (value?: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('Failed to parse user settings in auth route', { value });
    return {};
  }
};

const extractSelectedGroupId = (userRow: any) => {
  const settings = safeParseSettings(userRow?.settings);
  return settings?.selectedGroupId ?? null;
};

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

    // 新規ユーザーを作成（isVerified: 0で作成）
    const newUserId = crypto.randomUUID();
    
    const userData = {
      id: newUserId,
      name: body.name,
      email: body.email,
      handle: body.handle,
      passwordHash: hash,
      passwordSalt: salt,
      role: body.role || 'user',
      isVerified: 0, // 未認証状態で作成
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('Inserting user data:', JSON.stringify(userData, null, 2));
    
    await db.insert(users).values(userData);

    // 認証トークンを生成
    const { token: verificationToken } = await createVerificationToken(
      db, 
      newUserId, 
      'email_verification'
    );

    // 認証URLを生成
    const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
    const verificationUrl = generateVerificationUrl(baseUrl, verificationToken);

    console.log('\n🔐 Verification Token Created:');
    console.log('  Token:', verificationToken);
    console.log('  Full URL:', verificationUrl);
    console.log('  Expires in: 24 hours\n');

    // 認証メールを送信
    const emailResult = await sendEmail(
      {
        from: c.env.FROM_EMAIL || 'noreply@example.com',
        to: body.email,
        subject: 'アカウント登録完了 - メール認証をお願いします',
        html: generateVerificationEmailHtml(body.name, verificationUrl),
        text: generateVerificationEmailText(body.name, verificationUrl),
      },
      c.env
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // メール送信に失敗してもユーザー作成は成功とする
      console.warn('User created but verification email failed to send');
    }

    // JWTは生成するが、isVerifiedがfalseの状態
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
        message: 'Account created successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: newUserId,
            email: body.email,
            handle: body.handle,
            name: body.name,
            role: body.role || 'user',
            isVerified: false,
            selectedGroupId: null,
          },
          token,
          emailSent: emailResult.success,
          messageId: emailResult.messageId,
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

    const selectedGroupId = extractSelectedGroupId(user);

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
            isAdmin: user.role === 'admin',
            selectedGroupId,
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
      .then((rows) => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('User not found', 'NOT_FOUND'),
        404
      );
    }

    const userData = {
      ...user,
      selectedGroupId: extractSelectedGroupId(user),
      isAdmin: user.role === 'admin',
    };

    return c.json(
      {
        success: true,
        data: userData,
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

    const { hash, salt } = await hashPassword(body.newPassword);

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

/**
 * POST /auth/verify-email
 * メールアドレス認証確認
 */
authRouter.post('/verify-email', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    const validation = validateRequired(body, ['token']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          'Missing required field: token',
          'VALIDATION_ERROR'
        ),
        400
      );
    }

    const db = getDb(c);
    
    // トークンの検証
    const tokenValidation = await validateVerificationToken(
      db, 
      body.token, 
      'email_verification'
    );

    if (!tokenValidation.isValid) {
      let message = 'Invalid verification token';
      if (tokenValidation.isExpired) {
        message = 'Verification token has expired';
      } else if (tokenValidation.isUsed) {
        message = 'Verification token has already been used';
      }

      return c.json(
        createErrorResponse(message, 'INVALID_TOKEN'),
        400
      );
    }

    // ユーザーの存在確認
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenValidation.userId!))
      .then(rows => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('User not found', 'USER_NOT_FOUND'),
        404
      );
    }

    // 既に認証済みかチェック
    if (user.isVerified) {
      return c.json(
        {
          success: true,
          message: 'Email is already verified',
          data: {
            user: {
              id: user.id,
              email: user.email,
              isVerified: true,
            },
          },
        },
        200
      );
    }

    // メール認証を完了
    const verificationSuccess = await completeEmailVerification(db, tokenValidation.userId!);
    if (!verificationSuccess) {
      return c.json(
        createErrorResponse('Failed to complete email verification', 'VERIFICATION_ERROR'),
        500
      );
    }

    // トークンを使用済みとしてマーク
    await markTokenAsUsed(db, body.token, 'email_verification');

    // JWT を生成（認証済みユーザー用）
    const token = await generateJWT(
      {
        userId: user.id,
        email: user.email!,
        role: user.role,
      },
      c.env.JWT_SECRET,
      86400 // 24 時間
    );

    return c.json(
      {
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            handle: user.handle,
            name: user.name,
            role: user.role,
            isVerified: true,
          },
          token,
        },
      },
      200
    );
  } catch (error: unknown) {
    console.error('Email verification error:', error);
    const message = error instanceof Error ? error.message : 'Email verification failed';
    const stack = error instanceof Error ? error.stack : undefined;
    return c.json(createErrorResponse(message, 'EMAIL_VERIFICATION_ERROR', { stack }), 500);
  }
});

/**
 * POST /auth/resend-verification
 * 認証メール再送信
 */
authRouter.post('/resend-verification', async (c) => {
  try {
    const body = await c.req.json();

    // バリデーション
    const validation = validateRequired(body, ['email']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          'Missing required field: email',
          'VALIDATION_ERROR'
        ),
        400
      );
    }

    if (!isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    const db = getDb(c);

    // ユーザーの存在確認
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .then(rows => rows[0]);

    if (!user) {
      return c.json(
        createErrorResponse('User not found', 'USER_NOT_FOUND'),
        404
      );
    }

    // 既に認証済みかチェック
    if (user.isVerified) {
      return c.json(
        createErrorResponse('Email is already verified', 'ALREADY_VERIFIED'),
        400
      );
    }

    // 新しい認証トークンを生成
    const { token } = await createVerificationToken(db, user.id, 'email_verification');

    // 認証URLを生成
    const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
    const verificationUrl = generateVerificationUrl(baseUrl, token);

    // 認証メールを送信
    const emailResult = await sendEmail(
      {
        from: c.env.FROM_EMAIL || 'noreply@example.com',
        to: user.email!,
        subject: 'メールアドレスの認証をお願いします',
        html: generateVerificationEmailHtml(user.name, verificationUrl),
        text: generateVerificationEmailText(user.name, verificationUrl),
      },
      c.env
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return c.json(
        createErrorResponse('Failed to send verification email', 'EMAIL_SEND_ERROR'),
        500
      );
    }

    return c.json(
      {
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: user.email,
          messageId: emailResult.messageId,
        },
      },
      200
    );
  } catch (error: unknown) {
    console.error('Resend verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resend verification email';
    const stack = error instanceof Error ? error.stack : undefined;
    return c.json(createErrorResponse(message, 'RESEND_VERIFICATION_ERROR', { stack }), 500);
  }
});
