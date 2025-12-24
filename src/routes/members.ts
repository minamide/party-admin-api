import { Hono } from "hono";
import { communityMembers, listMembers, listSubscribers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const membersRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Community Members
membersRouter.post("/community", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'communityId']);
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
    // Only allow user to join as themselves (unless admin)
    if (body.userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(communityMembers).values({
      userId: body.userId,
      communityId: body.communityId,
      role: body.role || 'member',
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_MEMBER_CREATE_ERROR'), 400);
  }
});

membersRouter.delete("/community/:userId/:communityId", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const communityId = c.req.param('communityId');
    const auth = c.env.auth as any;
    
    // Only allow user to leave as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_MEMBER_DELETE_ERROR'), 400);
  }
});

// List Members
membersRouter.post("/list", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['listId', 'userId']);
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
    // Only allow user to add as themselves (unless admin)
    if (body.userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(listMembers).values({
      listId: body.listId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_MEMBER_CREATE_ERROR'), 400);
  }
});

membersRouter.delete("/list/:listId/:userId", requireAuth, async (c) => {
  try {
    const listId = c.req.param('listId');
    const userId = c.req.param('userId');
    const auth = c.env.auth as any;
    
    // Only allow user to remove as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(listMembers)
      .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_MEMBER_DELETE_ERROR'), 400);
  }
});

// List Subscribers
membersRouter.post("/subscriber", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['listId', 'userId']);
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
    // Only allow user to subscribe as themselves (unless admin)
    if (body.userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(listSubscribers).values({
      listId: body.listId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_SUBSCRIBER_CREATE_ERROR'), 400);
  }
});

membersRouter.delete("/subscriber/:listId/:userId", requireAuth, async (c) => {
  try {
    const listId = c.req.param('listId');
    const userId = c.req.param('userId');
    const auth = c.env.auth as any;
    
    // Only allow user to unsubscribe as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(listSubscribers)
      .where(and(eq(listSubscribers.listId, listId), eq(listSubscribers.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'LIST_SUBSCRIBER_DELETE_ERROR'), 400);
  }
});
