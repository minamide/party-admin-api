import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { lists, listMembers } from '../db/schema';
import { eq } from 'drizzle-orm';

export const listsRouter = new Hono<{ Bindings: CloudflareBindings }>();

listsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(lists).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

listsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(lists).values({
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      name: body.name,
      description: body.description || null,
      isPrivate: body.isPrivate ? 1 : 0,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

listsRouter.get("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(lists).where(eq(lists.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'リストが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

listsRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(lists)
      .set({
        name: body.name,
        description: body.description,
        isPrivate: body.isPrivate ? 1 : 0,
      })
      .where(eq(lists.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

listsRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(lists).where(eq(lists.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

listsRouter.get("/:id/members", async (c) => {
  const listId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(listMembers)
      .where(eq(listMembers.listId, listId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
