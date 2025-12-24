import { Hono } from "hono";
import { communities, communityMembers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const communitiesRouter = new Hono<{ Bindings: CloudflareBindings }>();

communitiesRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(communities).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITIES_LIST_ERROR'), 500);
  }
});

communitiesRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['name', 'ownerId']);
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
    // Only allow user to create community as themselves (unless admin)
    if (body.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    const result = await db.insert(communities).values({
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      name: body.name,
      description: body.description || null,
      iconUrl: body.iconUrl || null,
      bannerUrl: body.bannerUrl || null,
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_CREATE_ERROR'), 400);
  }
});

communitiesRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const result = await db.select().from(communities).where(eq(communities.id, id)).get();
    if (!result) {
      return c.json(
        createErrorResponse('コミュニティが見つかりません', 'COMMUNITY_NOT_FOUND'),
        404
      );
    }
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_GET_ERROR'), 500);
  }
});

communitiesRouter.put("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    const db = getDb(c);
    
    // Check if community exists and user is owner or admin
    const existing = await db.select().from(communities).where(eq(communities.id, id)).get();
    if (!existing) {
      return c.json(
        createErrorResponse('コミュニティが見つかりません', 'COMMUNITY_NOT_FOUND'),
        404
      );
    }
    if (existing.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
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
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_UPDATE_ERROR'), 400);
  }
});

communitiesRouter.delete("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const auth = c.env.auth as any;
    const db = getDb(c);
    
    // Check if community exists and user is owner or admin
    const existing = await db.select().from(communities).where(eq(communities.id, id)).get();
    if (!existing) {
      return c.json(
        createErrorResponse('コミュニティが見つかりません', 'COMMUNITY_NOT_FOUND'),
        404
      );
    }
    if (existing.ownerId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    await db.delete(communities).where(eq(communities.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_DELETE_ERROR'), 400);
  }
});

communitiesRouter.get("/:id/members", async (c) => {
  try {
    const communityId = c.req.param('id');
    const db = getDb(c);
    const result = await db.select()
      .from(communityMembers)
      .where(eq(communityMembers.communityId, communityId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'COMMUNITY_MEMBERS_LIST_ERROR'), 500);
  }
});
