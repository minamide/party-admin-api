import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { 
  users, posts, communities, lists, conversations, messages, 
  notifications, reports, hashtags, auditLogs, follows, likes, 
  reposts, bookmarks, communityMembers, listMembers, listSubscribers,
  conversationParticipants, mutedUsers, blockedUsers, pollVotes,
  eventAttendances, drafts, userSettings, reportDetails, 
  postAttachments, postMediaVersions
} from './db/schema';
import { eq, desc, and } from 'drizzle-orm';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== USERS ====================
app.get("/users", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(users).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/users", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
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
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/users/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'ユーザーが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/users/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
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
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/users/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== POSTS ====================
app.get("/posts", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(posts).orderBy(desc(posts.createdAt)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/posts", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
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
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/posts/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(posts).where(eq(posts.id, id)).get();
    return result ? c.json(result) : c.json({ error: '投稿が見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/posts/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(posts)
      .set({
        content: body.content,
        media: body.media ? JSON.stringify(body.media) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/posts/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(posts).where(eq(posts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/users/:id/posts", async (c) => {
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(posts)
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== COMMUNITIES ====================
app.get("/communities", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(communities).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/communities", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(communities).values({
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      name: body.name,
      description: body.description || null,
      iconUrl: body.iconUrl || null,
      bannerUrl: body.bannerUrl || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/communities/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(communities).where(eq(communities.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'コミュニティが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/communities/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(communities)
      .set({
        name: body.name,
        description: body.description,
        iconUrl: body.iconUrl,
        bannerUrl: body.bannerUrl,
      })
      .where(eq(communities.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/communities/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(communities).where(eq(communities.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== LISTS ====================
app.get("/lists", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(lists).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/lists", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(lists).values({
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      name: body.name,
      description: body.description || null,
      isPrivate: body.isPrivate ? 1 : 0,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/lists/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(lists).where(eq(lists.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'リストが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/lists/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(lists)
      .set({
        name: body.name,
        description: body.description,
        isPrivate: body.isPrivate ? 1 : 0,
      })
      .where(eq(lists.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/lists/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(lists).where(eq(lists.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== CONVERSATIONS & MESSAGES ====================
app.get("/conversations", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/conversations", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(conversations).values({
      id: crypto.randomUUID(),
      groupName: body.groupName || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/messages", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: body.conversationId,
      senderId: body.senderId,
      content: body.content,
      media: body.media ? JSON.stringify(body.media) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/messages/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(messages).where(eq(messages.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== NOTIFICATIONS ====================
app.get("/notifications/:userId", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/notifications", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(notifications).values({
      id: crypto.randomUUID(),
      recipientId: body.recipientId,
      type: body.type,
      actorIds: JSON.stringify(body.actorIds || []),
      resourceId: body.resourceId || null,
      contentPreview: body.contentPreview || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put("/notifications/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(notifications)
      .set({ isRead: body.isRead ? 1 : 0 })
      .where(eq(notifications.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== REPORTS ====================
app.get("/reports", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(reports).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/reports", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(reports).values({
      id: crypto.randomUUID(),
      reporterId: body.reporterId,
      targetId: body.targetId,
      reason: body.reason,
      status: 'pending',
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put("/reports/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(reports)
      .set({ status: body.status })
      .where(eq(reports.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== FOLLOWS ====================
app.post("/follows", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(follows).values({
      followerId: body.followerId,
      followingId: body.followingId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/follows/:followerId/:followingId", async (c) => {
  const followerId = c.req.param('followerId');
  const followingId = c.req.param('followingId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/users/:id/followers", async (c) => {
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
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
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/users/:id/following", async (c) => {
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
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
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== LIKES ====================
app.post("/likes", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(likes).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/likes/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/posts/:id/likes", async (c) => {
  const postId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
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
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== REPOSTS ====================
app.post("/reposts", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(reposts).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/reposts/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== BOOKMARKS ====================
app.post("/bookmarks", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(bookmarks).values({
      userId: body.userId,
      postId: body.postId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/bookmarks/:userId/:postId", async (c) => {
  const userId = c.req.param('userId');
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/users/:id/bookmarks", async (c) => {
  const userId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== COMMUNITY MEMBERS ====================
app.post("/community-members", async (c) => {
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

app.delete("/community-members/:userId/:communityId", async (c) => {
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

app.get("/communities/:id/members", async (c) => {
  const communityId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(communityMembers)
      .where(eq(communityMembers.communityId, communityId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== LIST MEMBERS ====================
app.post("/list-members", async (c) => {
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

app.delete("/list-members/:listId/:userId", async (c) => {
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

app.get("/lists/:id/members", async (c) => {
  const listId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(listMembers)
      .where(eq(listMembers.listId, listId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== LIST SUBSCRIBERS ====================
app.post("/list-subscribers", async (c) => {
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

app.delete("/list-subscribers/:listId/:userId", async (c) => {
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

// ==================== CONVERSATION PARTICIPANTS ====================
app.post("/conversation-participants", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(conversationParticipants).values({
      conversationId: body.conversationId,
      userId: body.userId,
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/conversation-participants/:conversationId/:userId", async (c) => {
  const conversationId = c.req.param('conversationId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/conversations/:id/participants", async (c) => {
  const conversationId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== BLOCKED/MUTED USERS ====================
app.post("/blocked-users", async (c) => {
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

app.delete("/blocked-users/:userId/:targetId", async (c) => {
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

app.post("/muted-users", async (c) => {
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

app.delete("/muted-users/:userId/:targetId", async (c) => {
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

// ==================== POLL VOTES ====================
app.post("/poll-votes", async (c) => {
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

app.delete("/poll-votes/:userId/:postId", async (c) => {
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

// ==================== EVENT ATTENDANCES ====================
app.post("/event-attendances", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    await db.insert(eventAttendances).values({
      eventId: body.eventId,
      userId: body.userId,
      status: body.status || 'going',
    });
    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put("/event-attendances/:eventId/:userId", async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(eventAttendances)
      .set({ status: body.status })
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/event-attendances/:eventId/:userId", async (c) => {
  const eventId = c.req.param('eventId');
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(eventAttendances)
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get("/events/:id/attendees", async (c) => {
  const eventId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select()
      .from(eventAttendances)
      .where(eq(eventAttendances.eventId, eventId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== DRAFTS ====================
app.get("/users/:userId/drafts", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(drafts)
      .where(eq(drafts.userId, userId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/drafts", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(drafts).values({
      id: crypto.randomUUID(),
      userId: body.userId,
      content: body.content,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.put("/drafts/:id", async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(drafts)
      .set({
        content: body.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(drafts.id, id))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/drafts/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(drafts).where(eq(drafts.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== POST ATTACHMENTS ====================
app.get("/posts/:postId/attachments", async (c) => {
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(postAttachments)
      .where(eq(postAttachments.postId, postId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/attachments", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(postAttachments).values({
      id: crypto.randomUUID(),
      postId: body.postId,
      mediaUrl: body.mediaUrl,
      type: body.type,
      width: body.width || null,
      height: body.height || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete("/attachments/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(postAttachments).where(eq(postAttachments.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== POST MEDIA VERSIONS ====================
app.get("/attachments/:id/versions", async (c) => {
  const attachmentId = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(postMediaVersions)
      .where(eq(postMediaVersions.attachmentId, attachmentId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/media-versions", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(postMediaVersions).values({
      id: crypto.randomUUID(),
      attachmentId: body.attachmentId,
      url: body.url,
      quality: body.quality || 'original',
      format: body.format || 'jpg',
      size: body.size || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== HASHTAGS ====================
app.get("/hashtags", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(hashtags).orderBy(desc(hashtags.count)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/hashtags/:tag", async (c) => {
  const tag = c.req.param('tag');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(hashtags).where(eq(hashtags.tag, tag)).get();
    return result ? c.json(result) : c.json({ error: 'ハッシュタグが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== USER SETTINGS ====================
app.get("/users/:userId/settings", async (c) => {
  const userId = c.req.param('userId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get();
    return result ? c.json(result) : c.json({ error: '設定が見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put("/users/:userId/settings", async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.update(userSettings)
      .set({
        preferences: body.preferences ? JSON.stringify(body.preferences) : null,
        notifications: body.notifications ? JSON.stringify(body.notifications) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, userId))
      .returning()
      .get();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ==================== HEALTH CHECK ====================
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
