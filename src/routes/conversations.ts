import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { conversations, messages, conversationParticipants } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const conversationsRouter = new Hono<{ Bindings: CloudflareBindings }>();

conversationsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

conversationsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(conversations).values({
      id: crypto.randomUUID(),
      groupName: body.groupName || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

conversationsRouter.get("/:id/messages", async (c) => {
  const conversationId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

conversationsRouter.get("/:id/participants", async (c) => {
  const conversationId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Message operations
conversationsRouter.post("/messages", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: body.conversationId,
      senderId: body.senderId,
      content: body.content,
      media: body.media ? JSON.stringify(body.media) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

conversationsRouter.delete("/messages/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(messages).where(eq(messages.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Participant operations
conversationsRouter.post("/participants", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(conversationParticipants).values({
      conversationId: body.conversationId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

conversationsRouter.delete("/participants/:conversationId/:userId", async (c) => {
  const conversationId = c.req.param('conversationId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
