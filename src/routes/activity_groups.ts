import { Hono } from 'hono';
import { activityGroups, relGroupMembers, users } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const activityGroupsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// GET /activity-groups?memberId=...  -> returns groups (optionally filtered by membership)
activityGroupsRouter.get('/', async (c) => {
  try {
    const memberId = c.req.query('memberId');
    const db = getDb(c);

    if (memberId) {
      const rels = await db.select().from(relGroupMembers).where(eq(relGroupMembers.volunteerId, memberId)).all();
      const groupIds = rels.map((r: any) => r.groupId).filter(Boolean);
      if (groupIds.length === 0) return c.json([], 200);
      const groups = await db.select().from(activityGroups).where(inArray(activityGroups.id, groupIds)).all();
      return c.json(groups, 200);
    }

    const all = await db.select().from(activityGroups).all();
    return c.json(all, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_GROUPS_LIST_ERROR'), 500);
  }
});

// POST /activity-groups - create a new group
activityGroupsRouter.post('/', requireAuth, async (c) => {
  // Robust parse + validation + logging to aid debugging of 400s
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch (parseErr) {
      console.error('activity-groups POST: invalid JSON body', { err: parseErr });
      return c.json(createErrorResponse('Invalid JSON body', 'INVALID_JSON'), 400);
    }

    const auth = (c.env as any).auth;
    try { console.info('activity-groups POST: received', { user: auth?.user?.userId, body }); } catch (_) { }

    const validation = validateRequired(body, ['name']);
    if (!validation.valid) {
      console.warn('activity-groups POST: validation failed', { missing: validation.missing });
      return c.json(createErrorResponse('Missing required fields', 'VALIDATION_ERROR', { missing: validation.missing }), 400);
    }

    const name = String(body.name).trim();
    const prefecture = (body.prefecture ?? body.prefecture_name) ? String(body.prefecture ?? body.prefecture_name).trim() : null;
    const color = (body.color_code ?? body.colorCode) ? String(body.color_code ?? body.colorCode).trim() : null;
    const logo = (body.logo_url ?? body.logoUrl) ? String(body.logo_url ?? body.logoUrl).trim() : null;

    // color code validation (optional field)
    if (color && !/^#([A-Fa-f0-9]{6})$/.test(color)) {
      console.warn('activity-groups POST: invalid color_code', { color });
      return c.json(createErrorResponse('Invalid color_code format', 'VALIDATION_ERROR', { field: 'color_code' }), 400);
    }

    const db = getDb(c);

    // duplicate name check
    const existing = await db.select().from(activityGroups).where(eq(activityGroups.name, name)).get();
    if (existing) {
      console.warn('activity-groups POST: duplicate name', { name });
      return c.json(createErrorResponse('Group with same name already exists', 'DUPLICATE_ERROR'), 409);
    }

    const id = crypto.randomUUID();
    const insertValues: any = {
      id,
      name,
      prefecture,
      colorCode: color ?? null,
      logoUrl: logo ?? null,
    };
    try {
      try { console.info('activity-groups: inserting', insertValues); } catch (_) {}
      const created = await db.insert(activityGroups).values(insertValues).returning().get();
      
      // Auto-add creator as admin member
      const auth = (c.env as any).auth;
      const creatorId = auth?.user?.userId;
      if (creatorId) {
        try {
          // Check table schema to decide whether to include created_at
          let hasCreatedAt = false;
          try {
            const pragma = await db.run(sql`PRAGMA table_info('rel_group_members')`);
            const tableInfo = Array.isArray((pragma as any)?.results) ? (pragma as any).results : [];
            hasCreatedAt = tableInfo.some((col: any) => col.name === 'created_at');
            console.info('rel_group_members table_info (auto-add):', { pragma: tableInfo });
          } catch (_) {
            // ignore
          }

          if (hasCreatedAt) {
            await db.run(
              sql`INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at) VALUES (${id}, ${creatorId}, 'admin', CURRENT_TIMESTAMP)`
            );
          } else {
            await db.run(
              sql`INSERT INTO rel_group_members (group_id, volunteer_id, role) VALUES (${id}, ${creatorId}, 'admin')`
            );
          }
        } catch (err: any) {
          console.error('rel_group_members auto-add failed', {
            sql: 'INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at?) VALUES (?, ?, ?, CURRENT_TIMESTAMP?)',
            params: [id, creatorId, 'admin'],
            error: getErrorMessage(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        }
      }
      
      return c.json(created, 201);
    } catch (dbErr) {
      try { console.error('activity-groups: insert failed', { err: dbErr, insertValues }); } catch (_) {}
      throw dbErr;
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('activity-groups POST: unexpected error', { message, error });
    return c.json(createErrorResponse(message, 'ACTIVITY_GROUP_CREATE_ERROR'), 400);
  }
});

// GET /activity-groups/:id/members -> returns group members (joins to users when available)
activityGroupsRouter.get('/:id/members', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);

    const rels = await db.select().from(relGroupMembers).where(eq(relGroupMembers.groupId, id)).all();
    const volunteerIds = rels.map((r: any) => r.volunteerId).filter(Boolean);
    if (volunteerIds.length === 0) return c.json([], 200);

    const memberUsers = await db.select().from(users).where(inArray(users.id, volunteerIds)).all();

    // merge role info from rels
    const roleMap: Record<string, any> = {};
    for (const r of rels) {
      const vid = r.volunteerId;
      roleMap[vid] = { role: r.role };
    }

    // Map users by id for quick lookup
    const userMap: Record<string, any> = {};
    for (const u of memberUsers) {
      userMap[u.id] = u;
    }

    // Ensure we return an entry for every relation even if the user row is missing
    const merged = volunteerIds.map((vid: string) => {
      const u = userMap[vid];
      return {
        id: vid,
        name: u?.name ?? null,
        email: u?.email ?? null,
        role: roleMap[vid]?.role ?? null,
      };
    });

    return c.json(merged, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_GROUP_MEMBERS_LIST_ERROR'), 500);
  }
});

// GET /activity-groups/:id -> returns a single group
activityGroupsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const group = await db.select().from(activityGroups).where(eq(activityGroups.id, id)).get();
    if (!group) return c.json(createErrorResponse('Group not found', 'NOT_FOUND'), 404);
    return c.json(group, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_GROUP_GET_ERROR'), 500);
  }
});

// PUT /activity-groups/:id -> update a group
activityGroupsRouter.put('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const db = getDb(c);

    // Check if group exists
    const existing = await db.select().from(activityGroups).where(eq(activityGroups.id, id)).get();
    if (!existing) return c.json(createErrorResponse('Group not found', 'NOT_FOUND'), 404);

    // Update fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.prefecture !== undefined) updateData.prefecture = body.prefecture;
    if (body.color_code !== undefined) updateData.colorCode = body.color_code;
    if (body.colorCode !== undefined) updateData.colorCode = body.colorCode;
    if (body.logo_url !== undefined) updateData.logoUrl = body.logo_url;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;

    if (Object.keys(updateData).length === 0) {
      return c.json(existing, 200);
    }

    await db.update(activityGroups).set(updateData).where(eq(activityGroups.id, id)).run();
    const updated = await db.select().from(activityGroups).where(eq(activityGroups.id, id)).get();
    return c.json(updated, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_GROUP_UPDATE_ERROR'), 500);
  }
});

export default activityGroupsRouter;
