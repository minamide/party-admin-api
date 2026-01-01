import { Hono } from 'hono';
import { mPrefectures } from '../db/schema-election';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';

export const prefecturesRouter = new Hono<{ Bindings: CloudflareBindings }>();

// GET /prefectures -> returns all prefectures
prefecturesRouter.get('/', async (c) => {
  try {
    const db = getDb(c);
    const all = await db.select().from(mPrefectures).all();
    return c.json(all, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'PREFECTURES_LIST_ERROR'), 500);
  }
});
