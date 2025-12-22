import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { reposts } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const repostsRouter = new Hono<{ Bindings: CloudflareBindings }>();

repostsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(reposts).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

repostsRouter.delete("/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
