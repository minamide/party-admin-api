import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { communityMembers, listMembers, listSubscribers } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const membersRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Community Members
membersRouter.post("/community", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(communityMembers).values({
      userId: body.userId,
      communityId: body.communityId,
      role: body.role || 'member',
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

membersRouter.delete("/community/:userId/:communityId", async (c) => {
  const userId = c.req.param('userId');
  const communityId = c.req.param('communityId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(communityMembers)
      .where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// List Members
membersRouter.post("/list", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(listMembers).values({
      listId: body.listId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

membersRouter.delete("/list/:listId/:userId", async (c) => {
  const listId = c.req.param('listId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(listMembers)
      .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// List Subscribers
membersRouter.post("/subscriber", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(listSubscribers).values({
      listId: body.listId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

membersRouter.delete("/subscriber/:listId/:userId", async (c) => {
  const listId = c.req.param('listId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(listSubscribers)
      .where(and(eq(listSubscribers.listId, listId), eq(listSubscribers.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
