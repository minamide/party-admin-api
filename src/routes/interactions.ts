import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { blockedUsers, mutedUsers, pollVotes } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const interactionsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Blocked Users
interactionsRouter.post("/blocked", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(blockedUsers).values({
      userId: body.userId,
      targetId: body.targetId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

interactionsRouter.delete("/blocked/:userId/:targetId", async (c) => {
  const userId = c.req.param('userId');
  const targetId = c.req.param('targetId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(blockedUsers)
      .where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.targetId, targetId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Muted Users
interactionsRouter.post("/muted", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(mutedUsers).values({
      userId: body.userId,
      targetId: body.targetId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

interactionsRouter.delete("/muted/:userId/:targetId", async (c) => {
  const userId = c.req.param('userId');
  const targetId = c.req.param('targetId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(mutedUsers)
      .where(and(eq(mutedUsers.userId, userId), eq(mutedUsers.targetId, targetId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Poll Votes
interactionsRouter.post("/polls", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(pollVotes).values({
      userId: body.userId,
      postId: body.postId,
      optionIndex: body.optionIndex,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

interactionsRouter.delete("/polls/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(pollVotes)
      .where(and(eq(pollVotes.userId, userId), eq(pollVotes.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
