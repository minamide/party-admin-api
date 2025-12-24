import { Hono } from "hono";
import { userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const settingsRouter = new Hono<{ Bindings: CloudflareBindings }>();

settingsRouter.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get();
    if (!result) {
      return c.json(
        createErrorResponse('設定が見つかりません', 'SETTINGS_NOT_FOUND'),
        404
      );
    }
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'SETTINGS_GET_ERROR'), 500);
  }
});

settingsRouter.put("/:userId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    
    // Only allow user to update their own settings (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    const result = await db.update(userSettings)
      .set({
        preferences: body.preferences ? JSON.stringify(body.preferences) : null,
        notifications: body.notifications ? JSON.stringify(body.notifications) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, userId))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'SETTINGS_UPDATE_ERROR'), 400);
  }
});
