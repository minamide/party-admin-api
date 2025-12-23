import { Hono } from "hono";
import { notifications } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const notificationsRouter = new Hono<{ Bindings: CloudflareBindings }>();

notificationsRouter.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'NOTIFICATIONS_LIST_ERROR'), 500);
  }
});

notificationsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['recipientId', 'type']);
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
    const db = getDb(c);
    const result = await db.insert(notifications).values({
      id: crypto.randomUUID(),
      recipientId: body.recipientId,
      type: body.type,
      actorIds: JSON.stringify(body.actorIds || []),
      resourceId: body.resourceId || null,
      contentPreview: body.contentPreview || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'NOTIFICATION_CREATE_ERROR'), 400);
  }
});

notificationsRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);
    const result = await db.update(notifications)
      .set({ isRead: body.isRead ? 1 : 0 })
      .where(eq(notifications.id, id))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'NOTIFICATION_UPDATE_ERROR'), 400);
  }
});
