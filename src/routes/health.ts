import { Hono } from "hono";

export const healthRouter = new Hono<{ Bindings: CloudflareBindings }>();

healthRouter.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});
