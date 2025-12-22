import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { bookmarks } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const bookmarksRouter = new Hono<{ Bindings: CloudflareBindings }>();

bookmarksRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(bookmarks).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

bookmarksRouter.delete("/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

bookmarksRouter.get("/:userId", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
