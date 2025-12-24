import { Hono } from "hono";
import { likes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';import { requireAuth } from '../middleware/auth';
export const likesRouter = new Hono<{ Bindings: CloudflareBindings }>();

likesRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'postId']);
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
    // Only allow user to like as themselves (unless admin)
    if (body.userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(likes).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIKE_CREATE_ERROR'), 400);
  }
});

likesRouter.delete("/:userId/:postId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const postId = c.req.param('postId');
    const auth = c.env.auth as any;
    
    // Only allow user to unlike as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIKE_DELETE_ERROR'), 400);
  }
});
