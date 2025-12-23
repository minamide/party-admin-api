import { Hono } from "hono";
import { reposts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const repostsRouter = new Hono<{ Bindings: CloudflareBindings }>();

repostsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'postId']);
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
    await db.insert(reposts).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'REPOST_CREATE_ERROR'), 400);
  }
});

repostsRouter.delete("/:userId/:postId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const postId = c.req.param('postId');
    const db = getDb(c);
    await db.delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'REPOST_DELETE_ERROR'), 400);
  }
});
