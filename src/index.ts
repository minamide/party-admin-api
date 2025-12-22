import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { users } from './db/schema';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/users", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(users).all();
  return c.json(result);
});

app.post("/users", async (c) => {
  const { name, email } = await c.req.json();
  const db = drizzle(c.env.DB);
  const result = await db.insert(users).values({ name, email }).returning().get();
  return c.json(result);
});

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});


export default app;
