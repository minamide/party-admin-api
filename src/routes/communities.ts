import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { communities, communityMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const communitiesRouter = new Hono<{ Bindings: CloudflareBindings }>();

communitiesRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(communities).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

communitiesRouter.post("/", async (c) => {
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

communitiesRouter.get("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(communities).where(eq(communities.id, id)).get();
    return result ? c.json(result) : c.json({ error: 'コミュニティが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

communitiesRouter.put("/:id", async (c) => {
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

communitiesRouter.delete("/:id", async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  try {
    await db.delete(communities).where(eq(communities.id, id));
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

communitiesRouter.get("/:id/members", async (c) => {
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
