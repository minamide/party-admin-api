import { Hono } from 'hono';
import { relActivityPlaceTypes, mActivityTypes } from '../db/schema';
import { getDb } from '../utils/db';

export const debugRouter = new Hono<{ Bindings: CloudflareBindings }>();

debugRouter.get('/rel_activity_place_types', async (c) => {
  try {
    const db = getDb(c);
    const rows = await db.select().from(relActivityPlaceTypes).all();
    return c.json(rows, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

debugRouter.get('/m_activity_types', async (c) => {
  try {
    const db = getDb(c);
    const rows = await db.select().from(mActivityTypes).all();
    return c.json(rows, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

debugRouter.get('/types_for_place/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const { eq } = await import('drizzle-orm');
    const rels = await db.select().from(relActivityPlaceTypes).where(eq(relActivityPlaceTypes.placeId, id)).all();
    const typeCodes = rels.map(r => (r as any).type_code || (r as any).typeCode);
    let types = [];
    if (typeCodes.length) {
      const all = await db.select().from(mActivityTypes).all();
      types = all.filter((t:any) => typeCodes.includes(t.typeCode || t.type_code));
    }
    return c.json({ rels, typeCodes, types }, 200);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /debug/exec-insert-rel-group-member
debugRouter.post('/exec-insert-rel-group-member', async (c) => {
  try {
    const body: any = await c.req.json();
    const { groupId, volunteerId, role } = body;
    if (!groupId || !volunteerId) {
      return c.json({ error: 'groupId and volunteerId required' }, 400);
    }
    const db = getDb(c);
    const { sql } = await import('drizzle-orm');
    try {
      const res = await db.run(sql`INSERT INTO rel_group_members (group_id, volunteer_id, role, created_at) VALUES (${groupId}, ${volunteerId}, ${role || null}, CURRENT_TIMESTAMP)`);
      return c.json({ success: true, results: res.results }, 200);
    } catch (err: any) {
      return c.json({ success: false, error: String(err), details: err }, 500);
    }
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

debugRouter.get('/inspect-rel-group', async (c) => {
  try {
    const db = getDb(c);
    const { sql } = await import('drizzle-orm');
    const tableInfo = await db.run(sql`PRAGMA table_info('rel_group_members')`);
    const fkList = await db.run(sql`PRAGMA foreign_key_list('rel_group_members')`);
    const fkEnabled = await db.run(sql`PRAGMA foreign_keys`);
    return c.json({ tableInfo: tableInfo.results, foreignKeyList: fkList.results, foreignKeysEnabled: fkEnabled.results }, 200);
  } catch (err: any) {
    return c.json({ error: String(err), details: err }, 500);
  }
});

debugRouter.get('/check-volunteer/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const { sql } = await import('drizzle-orm');
    const usersCnt = await db.run(sql`SELECT COUNT(*) as cnt FROM users WHERE id = ${id}`);
    const profilesCnt = await db.run(sql`SELECT COUNT(*) as cnt FROM profiles WHERE id = ${id}`);
    return c.json({ users: usersCnt.results, profiles: profilesCnt.results }, 200);
  } catch (err: any) {
    return c.json({ error: String(err), details: err }, 500);
  }
});

// POST /debug/reset-rel-group - drops and recreates rel_group_members with correct FKs
debugRouter.post('/reset-rel-group', async (c) => {
  try {
    const db = getDb(c);
    const { sql } = await import('drizzle-orm');
    // Drop and recreate table with desired schema
    await db.run(sql`DROP TABLE IF EXISTS rel_group_members`);
    await db.run(sql`
      CREATE TABLE rel_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT NOT NULL,
        volunteer_id TEXT NOT NULL,
        role TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES t_activity_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rel_group_members_group_id ON rel_group_members(group_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rel_group_members_volunteer_id ON rel_group_members(volunteer_id)`);
    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: String(err), details: err }, 500);
  }
});
