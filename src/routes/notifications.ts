import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { notifications } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const notificationsRouter = new Hono<{ Bindings: CloudflareBindings }>();

notificationsRouter.get("/:userId", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

notificationsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(notifications).values({
      id: crypto.randomUUID(),
      recipientId: body.recipientId,
      type: body.type,
      actorIds: JSON.stringify(body.actorIds || []),
      resourceId: body.resourceId || null,
      contentPreview: body.contentPreview || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

notificationsRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(notifications)
      .set({ isRead: body.isRead ? 1 : 0 })
      .where(eq(notifications.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
