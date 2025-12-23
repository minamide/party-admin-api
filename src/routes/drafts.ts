import { Hono } from "hono";
import { drafts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const draftsRouter = new Hono<{ Bindings: CloudflareBindings }>();

draftsRouter.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select().from(drafts)
      .where(eq(drafts.userId, userId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'DRAFTS_LIST_ERROR'), 500);
  }
});

draftsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'content']);
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
    const result = await db.insert(drafts).values({
      id: crypto.randomUUID(),
      userId: body.userId,
      content: body.content,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'DRAFT_CREATE_ERROR'), 400);
  }
});

draftsRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);
    const result = await db.update(drafts)
      .set({
        content: body.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(drafts.id, id))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'DRAFT_UPDATE_ERROR'), 400);
  }
});

draftsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    await db.delete(drafts).where(eq(drafts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'DRAFT_DELETE_ERROR'), 400);
  }
});
