import { Hono } from "hono";
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired, isValidEmail, isValidHandle } from '../utils/validation';
import { requireAuth, requireRole } from '../middleware/auth';

export const usersRouter = new Hono<{ Bindings: CloudflareBindings }>();

// GET /users - リスト取得（認証必須、管理者のみ）
usersRouter.get("/", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    // 管理者のみが全ユーザーリストを取得可能
    if (auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: only admins can list all users', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    const result = await db.select().from(users).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USERS_LIST_ERROR'), 500);
  }
});

// POST /users - ユーザー作成（認証必須）
usersRouter.post("/", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const body = await c.req.json();
    
    // Validation
    const validation = validateRequired(body, ['id', 'name', 'handle']);
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

    if (!isValidHandle(body.handle)) {
      return c.json(
        createErrorResponse(
          'Handle must be 3-30 characters, alphanumeric and underscore only',
          'INVALID_HANDLE'
        ),
        400
      );
    }

    if (body.email && !isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    const db = getDb(c);
    const result = await db.insert(users).values({
      id: body.id,
      name: body.name,
      email: body.email || null,
      handle: body.handle,
      role: body.role || 'user',
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      bannerUrl: body.bannerUrl || null,
    }).returning().get();
    
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_CREATE_ERROR'), 400);
  }
});

// GET /users/:id - ユーザー詳細取得（認証必須）
usersRouter.get("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(users).where(eq(users.id, id)).get();
    
    if (!result) {
      return c.json(
        createErrorResponse('ユーザーが見つかりません', 'USER_NOT_FOUND'),
        404
      );
    }
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_GET_ERROR'), 500);
  }
});

// PUT /users/:id - ユーザー更新（認証必須）
usersRouter.put("/:id", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    // 自分のプロフィール、または管理者のみ編集可能
    if (auth.user.userId !== id && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: cannot edit other users', 'FORBIDDEN'),
        403
      );
    }

    if (body.email && !isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    const result = await db.update(users)
      .set({
        name: body.name,
        email: body.email,
        bio: body.bio,
        photoUrl: body.photoUrl,
        bannerUrl: body.bannerUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning()
      .get();
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_UPDATE_ERROR'), 400);
  }
});

// DELETE /users/:id - ユーザー削除（認証必須、管理者のみ）
usersRouter.delete("/:id", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const id = c.req.param('id');

    // 管理者のみ削除可能
    if (auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: only admins can delete users', 'FORBIDDEN'),
        403
      );
    }

    const db = getDb(c);
    
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_DELETE_ERROR'), 400);
  }
});

// PUT /users/batch - ユーザー一括更新（認証必須、管理者のみ）
usersRouter.put("/batch", requireAuth, async (c) => {
  console.log('Entering PUT /users/batch handler'); // ここにログを追加
  try {
    const auth = c.env.auth as any;

    // 管理者のみが利用可能
    if (auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('Forbidden: only admins can update users in batch', 'FORBIDDEN'),
        403
      );
    }

    const usersToUpdate = await c.req.json();

    if (!Array.isArray(usersToUpdate)) {
      return c.json(
        createErrorResponse('Request body must be an array of users', 'VALIDATION_ERROR'),
        400
      );
    }

    const db = getDb(c);
    const updatedResults = [];
    const errors = [];

    // デバッグログ: データベース内の全ユーザーIDを取得
    const allUserIdsInDb = (await db.select({ id: users.id }).from(users).all()).map(u => u.id);
    console.log('All User IDs currently in DB:', allUserIdsInDb);

    for (const userData of usersToUpdate) {
      const id = userData.id;
      if (!id) {
        errors.push({ user: userData, error: 'User ID is required' });
        continue;
      }

      // デバッグログ: ユーザーが存在するかを明示的に確認
      const existingUser = await db.select().from(users).where(eq(users.id, id)).get();
      console.log(`Checking user existence for ID: ${id}. Found: ${!!existingUser}`);
      if (!existingUser) {
        errors.push({ user: userData, error: 'User not found' });
        continue;
      }

      const updateData: Record<string, any> = {};

      // 更新可能なフィールドを限定
      const allowedFields = ['name', 'email', 'handle', 'role', 'bio', 'location', 'website', 'photoUrl', 'bannerUrl', 'isSuspended', 'isVerified', 'settings'];

      for (const field of allowedFields) {
        if (userData[field] !== undefined) {
          updateData[field] = userData[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        errors.push({ user: userData, error: 'No valid fields to update' });
        continue;
      }
      
      // emailのバリデーション
      if (updateData.email && !isValidEmail(updateData.email)) {
        errors.push({ user: userData, error: 'Invalid email format' });
        continue;
      }

      // デバッグログ: 更新対象のIDと更新データを確認
      console.log('Attempting to update user:', { id, updateData });

      try {
        const result = await db.update(users)
          .set({ ...updateData, updatedAt: new Date().toISOString() })
          .where(eq(users.id, id))
          .returning()
          .get();
        
        // デバッグログ: db.updateの結果を確認
        console.log('db.update result for ID:', id, result);

        if (result) {
          updatedResults.push(result);
        } else {
          // デバッグログ: 更新に失敗したユーザーのIDと結果を確認
          console.log('User not found or no changes made for ID:', id, result);
          errors.push({ user: userData, error: 'User not found or no changes made' });
        }
      } catch (error: any) {
        console.error('Error updating user with ID:', id, error);
        errors.push({ user: userData, error: getErrorMessage(error) });
      }
    }

    if (errors.length > 0) {
      // エラーがある場合は一部成功として200を返し、詳細を伝える
      return c.json(
        {
          success: updatedResults.length > 0,
          message: 'Batch update completed with some errors',
          updatedCount: updatedResults.length,
          errorCount: errors.length,
          updatedUsers: updatedResults,
          errors: errors,
        },
        200
      );
    } else {
      return c.json(
        {
          success: true,
          message: 'All users updated successfully',
          updatedCount: updatedResults.length,
          updatedUsers: updatedResults,
        },
        200
      );
    }
  } catch (error: unknown) {
    console.error('Batch update error:', error);
    const message = getErrorMessage(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return c.json(createErrorResponse(message, 'USER_BATCH_UPDATE_ERROR', { stack }), 500);
  }
});
