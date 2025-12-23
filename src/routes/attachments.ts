import { Hono } from "hono";
import { postAttachments, postMediaVersions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';

export const attachmentsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Attachments
attachmentsRouter.get("/:postId", async (c) => {
  try {
    const postId = c.req.param('postId');
    const db = getDb(c);
    const result = await db.select().from(postAttachments)
      .where(eq(postAttachments.postId, postId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ATTACHMENTS_LIST_ERROR'), 500);
  }
});

attachmentsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['postId', 'mediaUrl', 'type']);
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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ATTACHMENT_CREATE_ERROR'), 400);
  }
});

attachmentsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    await db.delete(postAttachments).where(eq(postAttachments.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ATTACHMENT_DELETE_ERROR'), 400);
  }
});

// Media Versions
attachmentsRouter.get("/:postId/versions", async (c) => {
  try {
    const postId = c.req.param('postId');
    const db = getDb(c);
    const result = await db.select().from(postMediaVersions)
      .where(eq(postMediaVersions.postId, postId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MEDIA_VERSIONS_LIST_ERROR'), 500);
  }
});

attachmentsRouter.post("/versions", async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['postId', 'url']);
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
    const result = await db.insert(postMediaVersions).values({
      id: crypto.randomUUID(),
      postId: body.postId,
      versionName: body.versionName || 'original',
      url: body.url,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'MEDIA_VERSION_CREATE_ERROR'), 400);
  }
});
