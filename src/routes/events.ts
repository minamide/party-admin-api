import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { eventAttendances } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const eventsRouter = new Hono<{ Bindings: CloudflareBindings }>();

eventsRouter.post("/attendances", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(eventAttendances).values({
      eventId: body.eventId,
      userId: body.userId,
      status: body.status || 'going',
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

eventsRouter.put("/attendances/:eventId/:userId", async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(eventAttendances)
      .set({ status: body.status })
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

eventsRouter.delete("/attendances/:eventId/:userId", async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(eventAttendances)
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

eventsRouter.get("/:eventId/attendees", async (c) => {
  const eventId = c.req.param('eventId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(eventAttendances)
      .where(eq(eventAttendances.eventId, eventId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
