import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { likes } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const likesRouter = new Hono<{ Bindings: CloudflareBindings }>();

likesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(likes).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

likesRouter.delete("/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
