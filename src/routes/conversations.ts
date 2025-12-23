import { Hono } from "hono";
import { conversations, messages, conversationParticipants } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const conversationsRouter = new Hono<{ Bindings: CloudflareBindings }>();

conversationsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CONVERSATIONS_LIST_ERROR'), 500);
  }
});

conversationsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c);
    const result = await db.insert(conversations).values({
      id: crypto.randomUUID(),
      groupName: body.groupName || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CONVERSATION_CREATE_ERROR'), 400);
  }
});

conversationsRouter.get("/:id/messages", async (c) => {
  try {
    const conversationId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MESSAGES_LIST_ERROR'), 500);
  }
});

conversationsRouter.get("/:id/participants", async (c) => {
  try {
    const conversationId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'PARTICIPANTS_LIST_ERROR'), 500);
  }
});

// Message operations
conversationsRouter.post("/messages", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['conversationId', 'senderId', 'content']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }
    const db = getDb(c);
    const result = await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: body.conversationId,
      senderId: body.senderId,
      content: body.content,
      media: body.media ? JSON.stringify(body.media) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MESSAGE_CREATE_ERROR'), 400);
  }
});

conversationsRouter.delete("/messages/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    await db.delete(messages).where(eq(messages.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MESSAGE_DELETE_ERROR'), 400);
  }
});

// Participant operations
conversationsRouter.post("/participants", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['conversationId', 'userId']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }
    const db = getDb(c);
    await db.insert(conversationParticipants).values({
      conversationId: body.conversationId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'PARTICIPANT_CREATE_ERROR'), 400);
  }
});

conversationsRouter.delete("/participants/:conversationId/:userId", async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const userId = c.req.param('userId');
    const db = getDb(c);
    await db.delete(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'PARTICIPANT_DELETE_ERROR'), 400);
  }
});
