import { Hono } from "hono";
import { follows, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';import { requireAuth } from '../middleware/auth';
export const followsRouter = new Hono<{ Bindings: CloudflareBindings }>();

followsRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['followerId', 'followingId']);
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
    // Only allow user to follow as themselves (unless admin)
    if (body.followerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(follows).values({
      followerId: body.followerId,
      followingId: body.followingId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'FOLLOW_CREATE_ERROR'), 400);
  }
});

followsRouter.delete("/:followerId/:followingId", requireAuth, async (c) => {
  try {
    const followerId = c.req.param('followerId');
    const followingId = c.req.param('followingId');
    const auth = c.env.auth as any;
    
    // Only allow user to unfollow as themselves (unless admin)
    if (followerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'FOLLOW_DELETE_ERROR'), 400);
  }
});

followsRouter.get("/:userId/followers", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'FOLLOWERS_LIST_ERROR'), 500);
  }
});

followsRouter.get("/:userId/following", async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c);
    const result = await db.select({ 
      id: users.id, 
      name: users.name, 
      handle: users.handle,
      photoUrl: users.photoUrl
    })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'FOLLOWING_LIST_ERROR'), 500);
  }
});
