import { Hono } from "hono";
import { blockedUsers, mutedUsers, pollVotes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const interactionsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Blocked Users
interactionsRouter.post("/blocked", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'targetId']);
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
    await db.insert(blockedUsers).values({
      userId: body.userId,
      targetId: body.targetId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'BLOCKED_USER_CREATE_ERROR'), 400);
  }
});

interactionsRouter.delete("/blocked/:userId/:targetId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const targetId = c.req.param('targetId');
    const db = getDb(c);
    await db.delete(blockedUsers)
      .where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.targetId, targetId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'BLOCKED_USER_DELETE_ERROR'), 400);
  }
});

// Muted Users
interactionsRouter.post("/muted", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'targetId']);
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
    await db.insert(mutedUsers).values({
      userId: body.userId,
      targetId: body.targetId,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MUTED_USER_CREATE_ERROR'), 400);
  }
});

interactionsRouter.delete("/muted/:userId/:targetId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const targetId = c.req.param('targetId');
    const db = getDb(c);
    await db.delete(mutedUsers)
      .where(and(eq(mutedUsers.userId, userId), eq(mutedUsers.targetId, targetId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MUTED_USER_DELETE_ERROR'), 400);
  }
});

// Poll Votes
interactionsRouter.post("/polls", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['userId', 'postId', 'optionIndex']);
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
    await db.insert(pollVotes).values({
      userId: body.userId,
      postId: body.postId,
      optionIndex: body.optionIndex,
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POLL_VOTE_CREATE_ERROR'), 400);
  }
});

interactionsRouter.delete("/polls/:userId/:postId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const postId = c.req.param('postId');
    const db = getDb(c);
    await db.delete(pollVotes)
      .where(and(eq(pollVotes.userId, userId), eq(pollVotes.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'POLL_VOTE_DELETE_ERROR'), 400);
  }
});
