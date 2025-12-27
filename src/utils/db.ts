import { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

/**
 * Get Drizzle ORM instance from Hono context or D1 database
 * @param dbOrContext - Hono context or D1Database instance
 * @returns Drizzle ORM database instance with schema
 */
export const getDb = (dbOrContext: any) => {
  // D1Database instance が直接渡された場合
  if (dbOrContext && typeof dbOrContext.prepare === 'function') {
    return drizzle(dbOrContext, { schema });
  }
  
  // Hono context が渡された場合
  if (dbOrContext && dbOrContext.env && dbOrContext.env.DB) {
    return drizzle(dbOrContext.env.DB, { schema });
  }
  
  throw new Error('Invalid argument: expected D1Database or Hono Context');
};
