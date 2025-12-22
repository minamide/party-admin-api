import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { postAttachments, postMediaVersions } from '../db/schema';
import { eq } from 'drizzle-orm';

export const attachmentsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Attachments
attachmentsRouter.get("/:postId", async (c) => {
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

attachmentsRouter.post("/", async (c) => {
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

attachmentsRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(postAttachments).where(eq(postAttachments.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// Media Versions
attachmentsRouter.get("/:postId/versions", async (c) => {
  const postId = c.req.param('postId');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(postMediaVersions)
      .where(eq(postMediaVersions.postId, postId))
      .all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

attachmentsRouter.post("/versions", async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  try {
    const result = await db.insert(postMediaVersions).values({
      id: crypto.randomUUID(),
      postId: body.postId,
      versionName: body.versionName || 'original',
      url: body.url,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});
