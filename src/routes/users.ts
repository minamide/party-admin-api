import { Hono } from "hono";
import { users, relGroupMembers, activityGroups } from '../db/schema';
import { eq, and, leftJoin, sql } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired, isValidEmail, isValidHandle } from '../utils/validation';
import { requireAuth, requireRole } from '../middleware/auth';

const safeParseSettings = (value?: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('Failed to parse user settings', { value });
    return {};
  }
};

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
    const result = await db.select({
      user: users,
      group: activityGroups
    })
    .from(users)
    .leftJoin(relGroupMembers, eq(users.id, relGroupMembers.volunteerId))
    .leftJoin(activityGroups, eq(relGroupMembers.groupId, activityGroups.id))
    .all();

    // データをフラット化して返却
    const flattened = result.map(r => ({
      ...r.user,
      groupName: r.group?.name || null,
      groupId: r.group?.id || null
    }));

    return c.json(flattened, 200);
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
    
    // バリデーション
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
      partyNumber: body.partyNumber || body.party_number || null,
      photoUrl: body.photoUrl || null,
      bannerUrl: body.bannerUrl || null,
    }).returning().get();

    // グループ所属の追加
    const groupId = body.groupId || body.group_id;
    if (groupId && groupId !== '未所属') {
      await db.run(
        sql`INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at) VALUES (${groupId}, ${body.id}, ${body.role || 'volunteer'}, CURRENT_TIMESTAMP)`
      );
    }
    
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
    const result = await db.select({
      user: users,
      group: activityGroups
    })
    .from(users)
    .leftJoin(relGroupMembers, eq(users.id, relGroupMembers.volunteerId))
    .leftJoin(activityGroups, eq(relGroupMembers.groupId, activityGroups.id))
    .where(eq(users.id, id))
    .get();
    
    if (!result) {
      return c.json(
        createErrorResponse('ユーザーが見つかりません', 'USER_NOT_FOUND'),
        404
      );
    }
    
    return c.json({
      ...result.user,
      groupName: result.group?.name || null,
      groupId: result.group?.id || null
    }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_GET_ERROR'), 500);
  }
});

// GET /users/handle/:handle - ハンドルでユーザーを取得（認証必須）
usersRouter.get("/handle/:handle", requireAuth, async (c) => {
  try {
    const handle = c.req.param('handle');
    const db = getDb(c);
    const result = await db.select().from(users).where(eq(users.handle, handle)).get();
    
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
// PUT /users/:id - ユーザー更新（認証必須）
usersRouter.put("/:id", requireAuth, async (c) => {
  try {
    const auth = c.env.auth as any;
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    console.log('Profile update request:', {
      userId: id,
      authUserId: auth?.user?.userId,
      authUserRole: auth?.user?.role,
      body: { ...body, photoUrl: body.photoUrl ? '***' : undefined, bannerUrl: body.bannerUrl ? '***' : undefined }
    });

    // 自分のプロフィール、または管理者のみ編集可能
    if (auth?.user?.userId !== id && auth?.user?.role !== 'admin') {
      console.log('Access denied:', {
        requestUserId: auth?.user?.userId,
        targetId: id,
        role: auth?.user?.role
      });
      return c.json(
        createErrorResponse('Forbidden: cannot edit other users', 'FORBIDDEN'),
        403
      );
    }

    // メールアドレスのバリデーション
    if (body.email && !isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    // ハンドルのバリデーション（変更の場合のみ）
    if (body.handle && !isValidHandle(body.handle)) {
      return c.json(
        createErrorResponse(
          'Handle must be 3-30 characters, alphanumeric and underscore only',
          'INVALID_HANDLE'
        ),
        400
      );
    }

    // 更新対象のフィールドのみ設定
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    // snake_case と camelCase の両方をサポート
    if (body.photo_url !== undefined) {
      updateData.photoUrl = body.photo_url || null;
    } else if (body.photoUrl !== undefined) {
      updateData.photoUrl = body.photoUrl || null;
    }

    if (body.banner_url !== undefined) {
      updateData.bannerUrl = body.banner_url || null;
    } else if (body.bannerUrl !== undefined) {
      updateData.bannerUrl = body.bannerUrl || null;
    }

    if (body.party_number !== undefined) {
      updateData.partyNumber = body.party_number || null;
    } else if (body.partyNumber !== undefined) {
      updateData.partyNumber = body.partyNumber || null;
    }

    // 管理者のみロールの変更が可能
    if (auth?.user?.role === 'admin' && body.role !== undefined) {
      updateData.role = body.role;
    }

    const allowedFields = ['name', 'email', 'handle', 'bio', 'location', 'website'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    const userBefore = await db.select().from(users).where(eq(users.id, id)).get();
    const existingSettings = safeParseSettings(userBefore?.settings);
    const nextSettings = { ...existingSettings };
    let settingsChanged = false;
    if (body.selectedGroupId !== undefined) {
      const normalized = body.selectedGroupId ? String(body.selectedGroupId) : null;
      if (nextSettings.selectedGroupId !== normalized) {
        nextSettings.selectedGroupId = normalized;
        settingsChanged = true;
      }
    }

    if (settingsChanged) {
      updateData.settings = JSON.stringify(nextSettings);
    }

    // グループ所属の更新
    if (body.groupId !== undefined || body.group_id !== undefined) {
      const newGroupId = body.groupId || body.group_id;
      // 既存の所属を一旦削除（1ユーザー1グループ運用を想定）
      await db.delete(relGroupMembers).where(eq(relGroupMembers.volunteerId, id)).run();
      
      if (newGroupId && newGroupId !== '未所属') {
        let pragmaRes: any = null;
        try {
          pragmaRes = await db.run(sql`PRAGMA table_info('rel_group_members')`);
          console.info('rel_group_members table_info:', { pragma: pragmaRes.results });
        } catch (pErr) {
          console.warn('Failed to read PRAGMA table_info for rel_group_members', { err: getErrorMessage(pErr) });
        }
        const roleValue = body.role || 'volunteer';
        try {
          const tableInfo = Array.isArray((pragmaRes as any)?.results) ? (pragmaRes as any).results : [];
          const hasCreatedAt = tableInfo.some((col: any) => col.name === 'created_at');

          // Log foreign_keys pragma and existence of target group for debugging
          try {
            const fk = await db.run(sql`PRAGMA foreign_keys`);
            console.info('PRAGMA foreign_keys:', fk.results);
          } catch (fkErr) {
            console.warn('Failed to read PRAGMA foreign_keys', { err: getErrorMessage(fkErr) });
          }

          try {
            const groupCheck = await db.run(sql`SELECT COUNT(*) as cnt FROM t_activity_groups WHERE id = ${newGroupId}`);
            console.info('t_activity_groups existence check:', { results: groupCheck.results });
          } catch (gErr) {
            console.warn('Failed to check t_activity_groups existence', { err: getErrorMessage(gErr) });
          }

          if (hasCreatedAt) {
            await db.run(
              sql`INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at) VALUES (${newGroupId}, ${id}, ${roleValue}, CURRENT_TIMESTAMP)`
            );
          } else {
            await db.run(
              sql`INSERT INTO rel_group_members (group_id, volunteer_id, role) VALUES (${newGroupId}, ${id}, ${roleValue})`
            );
          }
        } catch (err: any) {
          console.error('rel_group_members insert failed full error:', err);
          console.error('rel_group_members insert failed details', {
            sql: 'INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            params: [newGroupId, id, roleValue],
            errorMessage: getErrorMessage(err),
            stack: err instanceof Error ? err.stack : undefined,
            results: (err && (err as any).results) ? (err as any).results : undefined,
          });
          throw err;
        }
      }
    }

    console.log('Updating user with data:', {
      id,
      updateData: {
        ...updateData,
        photoUrl: updateData.photoUrl ? '***' : undefined,
        bannerUrl: updateData.bannerUrl ? '***' : undefined,
      },
      selectedGroupId: body.selectedGroupId ?? null,
    });

    console.log('User settings before update:', { selectedGroupId: existingSettings.selectedGroupId ?? null });
    console.log('User state before update:', { 
      id, 
      nameBefore: userBefore?.name,
      bioBefore: userBefore?.bio,
      exists: !!userBefore
    });

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning()
      .get();

    console.log('Update result:', { 
      id,
      success: !!result,
      name: result?.name,
      bio: result?.bio,
      location: result?.location,
      website: result?.website,
      updatedAt: result?.updatedAt
    });

    // Update 後の状態を確認
    const userAfter = await db.select().from(users).where(eq(users.id, id)).get();
    console.log('User state after update:', { 
      id, 
      nameAfter: userAfter?.name,
      bioAfter: userAfter?.bio,
      exists: !!userAfter
    });

    if (!result) {
      return c.json(
        createErrorResponse('ユーザーが見つかりません', 'USER_NOT_FOUND'),
        404
      );
    }
    
    return c.json({
      success: true,
      data: result,
      message: 'User profile updated successfully'
    }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('Profile update error:', { error: message, stack: error instanceof Error ? error.stack : undefined });
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
