import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { follows, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const followsRouter = new Hono<{ Bindings: CloudflareBindings }>();

followsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(follows).values({
      followerId: body.followerId,
      followingId: body.followingId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

followsRouter.delete("/:followerId/:followingId", async (c) => {
  const followerId = c.req.param('followerId');
  const followingId = c.req.param('followingId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

followsRouter.get("/:userId/followers", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

followsRouter.get("/:userId/following", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
