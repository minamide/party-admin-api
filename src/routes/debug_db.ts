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
