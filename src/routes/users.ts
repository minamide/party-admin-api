import { Hono } from "hono";
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired, isValidEmail, isValidHandle } from '../utils/validation';

export const usersRouter = new Hono<{ Bindings: CloudflareBindings }>();

usersRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(users).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USERS_LIST_ERROR'), 500);
  }
});

usersRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    
    // Validation
    const validation = validateRequired(body, ['id', 'name', 'handle']);
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

    if (!isValidHandle(body.handle)) {
      return c.json(
        createErrorResponse(
          'Handle must be 3-30 characters, alphanumeric and underscore only',
          'INVALID_HANDLE'
        ),
        400
      );
    }

    if (body.email && !isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

    const db = getDb(c);
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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_CREATE_ERROR'), 400);
  }
});

usersRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(users).where(eq(users.id, id)).get();
    
    if (!result) {
      return c.json(
        createErrorResponse('ユーザーが見つかりません', 'USER_NOT_FOUND'),
        404
      );
    }
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_GET_ERROR'), 500);
  }
});

usersRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    if (body.email && !isValidEmail(body.email)) {
      return c.json(
        createErrorResponse('Invalid email format', 'INVALID_EMAIL'),
        400
      );
    }

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
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_UPDATE_ERROR'), 400);
  }
});

usersRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'USER_DELETE_ERROR'), 400);
  }
});
