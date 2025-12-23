import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';

/**
 * Get Drizzle ORM instance from Hono context
 * @param c - Hono context
 * @returns Drizzle ORM database instance
 */
export const getDb = (c: Context<{ Bindings: CloudflareBindings }>) => {
  return drizzle(c.env.DB);
};
