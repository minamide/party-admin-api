import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { hashtags } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const hashtagsRouter = new Hono<{ Bindings: CloudflareBindings }>();

hashtagsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(hashtags).orderBy(desc(hashtags.count)).all();
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

hashtagsRouter.get("/:tag", async (c) => {
  const tag = c.req.param('tag');
  const db = drizzle(c.env.DB);
  try {
    const result = await db.select().from(hashtags).where(eq(hashtags.tag, tag)).get();
    return result ? c.json(result) : c.json({ error: 'ハッシュタグが見つかりません' }, 404);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
