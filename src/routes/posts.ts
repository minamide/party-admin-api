import { Hono } from "hono";
import { posts, likes, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const postsRouter = new Hono<{ Bindings: CloudflareBindings }>();

postsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(posts).orderBy(desc(posts.createdAt)).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POSTS_LIST_ERROR'), 500);
  }
});

postsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    
    // Validation
    const validation = validateRequired(body, ['authorId']);
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
    const result = await db.insert(posts).values({
      id: crypto.randomUUID(),
      authorId: body.authorId,
      communityId: body.communityId || null,
      content: body.content || null,
      media: body.media ? JSON.stringify(body.media) : null,
      hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
      type: body.type || 'text',
      visibility: body.visibility || 'public',
    }).returning().get();
    
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_CREATE_ERROR'), 400);
  }
});

postsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(posts).where(eq(posts.id, id)).get();
    
    if (!result) {
      return c.json(
        createErrorResponse('投稿が見つかりません', 'POST_NOT_FOUND'),
        404
      );
    }
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_GET_ERROR'), 500);
  }
});

postsRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    const result = await db.update(posts)
      .set({
        content: body.content,
        media: body.media ? JSON.stringify(body.media) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning()
      .get();
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_UPDATE_ERROR'), 400);
  }
});

postsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    
    await db.delete(posts).where(eq(posts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_DELETE_ERROR'), 400);
  }
});

postsRouter.get("/:id/likes", async (c) => {
  try {
    const postId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(likes)
      .innerJoin(users, eq(likes.userId, users.id))
      .where(eq(likes.postId, postId))
      .all();
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POST_LIKES_ERROR'), 500);
  }
});
