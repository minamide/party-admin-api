import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { reports } from '../db/schema';
import { eq } from 'drizzle-orm';

export const reportsRouter = new Hono<{ Bindings: CloudflareBindings }>();

reportsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(reports).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

reportsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(reports).values({
      id: crypto.randomUUID(),
      reporterId: body.reporterId,
      targetId: body.targetId,
      reason: body.reason,
      status: 'pending',
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

reportsRouter.put("/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(reports)
      .set({ status: body.status })
      .where(eq(reports.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
