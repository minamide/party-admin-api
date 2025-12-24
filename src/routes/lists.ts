import { Hono } from "hono";
import { lists, listMembers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const listsRouter = new Hono<{ Bindings: CloudflareBindings }>();

listsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(lists).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LISTS_LIST_ERROR'), 500);
  }
});

listsRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['name', 'ownerId']);
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
    const auth = c.env.auth as any;
    // Only allow user to create list as themselves (unless admin)
    if (body.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    const result = await db.insert(lists).values({
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      name: body.name,
      description: body.description || null,
      isPrivate: body.isPrivate ? 1 : 0,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_CREATE_ERROR'), 400);
  }
});

listsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(lists).where(eq(lists.id, id)).get();
    if (!result) {
      return c.json(
        createErrorResponse('リストが見つかりません', 'LIST_NOT_FOUND'),
        404
      );
    }
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_GET_ERROR'), 500);
  }
});

listsRouter.put("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    const db = getDb(c);
    
    // Check if list exists and user is owner or admin
    const existing = await db.select().from(lists).where(eq(lists.id, id)).get();
    if (!existing) {
      return c.json(
        createErrorResponse('リストが見つかりません', 'LIST_NOT_FOUND'),
        404
      );
    }
    if (existing.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const result = await db.update(lists)
      .set({
        name: body.name,
        description: body.description,
        isPrivate: body.isPrivate ? 1 : 0,
      })
      .where(eq(lists.id, id))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_UPDATE_ERROR'), 400);
  }
});

listsRouter.delete("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const auth = c.env.auth as any;
    const db = getDb(c);
    
    // Check if list exists and user is owner or admin
    const existing = await db.select().from(lists).where(eq(lists.id, id)).get();
    if (!existing) {
      return c.json(
        createErrorResponse('リストが見つかりません', 'LIST_NOT_FOUND'),
        404
      );
    }
    if (existing.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    await db.delete(lists).where(eq(lists.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_DELETE_ERROR'), 400);
  }
});

listsRouter.get("/:id/members", async (c) => {
  try {
    const listId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select()
      .from(listMembers)
      .where(eq(listMembers.listId, listId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_MEMBERS_LIST_ERROR'), 500);
  }
});
