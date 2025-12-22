import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { posts, likes, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const postsRouter = new Hono<{ Bindings: CloudflareBindings }>();

postsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(posts).orderBy(desc(posts.createdAt)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

postsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(posts).values({
      id: crypto.randomUUID(),
      authorId: body.authorId,
      communityId: body.communityId || null,
      content: body.content || null,
      media: body.media ? JSON.stringify(body.media) : null,
      hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
      type: body.type || 'text',
      visibility: body.visibility || 'public',
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

postsRouter.get("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(posts).where(eq(posts.id, id)).get();
    return result ? c.json(result) : c.json({ error: '投稿が見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

postsRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(posts)
      .set({
        content: body.content,
        media: body.media ? JSON.stringify(body.media) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

postsRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(posts).where(eq(posts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

postsRouter.get("/:id/likes", async (c) => {
  const postId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(likes)
      .innerJoin(users, eq(likes.userId, users.id))
      .where(eq(likes.postId, postId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
