import { Hono } from "hono";
import { hashtags } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const hashtagsRouter = new Hono<{ Bindings: CloudflareBindings }>();

hashtagsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(hashtags).orderBy(desc(hashtags.count)).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'HASHTAGS_LIST_ERROR'), 500);
  }
});

hashtagsRouter.get("/:tag", async (c) => {
  try {
    const tag = c.req.param('tag');
    const db = getDb(c);
    const result = await db.select().from(hashtags).where(eq(hashtags.tag, tag)).get();
    if (!result) {
      return c.json(
        createErrorResponse('ハッシュタグが見つかりません', 'HASHTAG_NOT_FOUND'),
        404
      );
    }
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'HASHTAG_GET_ERROR'), 500);
  }
});
