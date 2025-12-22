import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { drafts } from '../db/schema';
import { eq } from 'drizzle-orm';

export const draftsRouter = new Hono<{ Bindings: CloudflareBindings }>();

draftsRouter.get("/:userId", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(drafts)
      .where(eq(drafts.userId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

draftsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(drafts).values({
      id: crypto.randomUUID(),
      userId: body.userId,
      content: body.content,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

draftsRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(drafts)
      .set({
        content: body.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(drafts.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

draftsRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(drafts).where(eq(drafts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
