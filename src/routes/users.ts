import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const usersRouter = new Hono<{ Bindings: CloudflareBindings }>();

usersRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(users).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

usersRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(users).values({
      id: body.id,
      name: body.name,
      email: body.email || null,
      handle: body.handle,
      role: body.role || 'user',
      bio: body.bio || null,
      photoUrl: body.photoUrl || null,
      bannerUrl: body.bannerUrl || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

usersRouter.get("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'ユーザーが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

usersRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(users)
      .set({
        name: body.name,
        email: body.email,
        bio: body.bio,
        photoUrl: body.photoUrl,
        bannerUrl: body.bannerUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

usersRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
