import { Hono } from "hono";
import { bookmarks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const bookmarksRouter = new Hono<{ Bindings: CloudflareBindings }>();

bookmarksRouter.post("/", async (c) => {
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
    await db.insert(bookmarks).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'BOOKMARK_CREATE_ERROR'), 400);
  }
});

bookmarksRouter.delete("/:userId/:postId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const postId = c.req.param('postId');
    const db = getDb(c);
    await db.delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'BOOKMARK_DELETE_ERROR'), 400);
  }
});

bookmarksRouter.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select().from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'BOOKMARKS_LIST_ERROR'), 500);
  }
});
