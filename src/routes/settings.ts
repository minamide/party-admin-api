import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export const settingsRouter = new Hono<{ Bindings: CloudflareBindings }>();

settingsRouter.get("/:userId", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get();
    return result ? c.json(result) : c.json({ error: '設定が見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

settingsRouter.put("/:userId", async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(userSettings)
      .set({
        preferences: body.preferences ? JSON.stringify(body.preferences) : null,
        notifications: body.notifications ? JSON.stringify(body.notifications) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, userId))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
