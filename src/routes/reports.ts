import { Hono } from "hono";
import { reports } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const reportsRouter = new Hono<{ Bindings: CloudflareBindings }>();

reportsRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const result = await db.select().from(reports).all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'REPORTS_LIST_ERROR'), 500);
  }
});

reportsRouter.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['reporterId', 'targetId', 'reason']);
    if (!validation.valid) {
      return c.json(
        createErrorResponse(
          `Missing required fields: ${validation.missing?.join(', ')}`,
          'VALIDATION_ERROR',
          { missing: validation.missing }
        ),
        400
      );
    }
    const auth = c.env.auth as any;
    // Only allow user to report as themselves (unless admin)
    if (body.reporterId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    const result = await db.insert(reports).values({
      id: crypto.randomUUID(),
      reporterId: body.reporterId,
      targetId: body.targetId,
      reason: body.reason,
      status: 'pending',
    }).returning().get();
    return c.json(result, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'REPORT_CREATE_ERROR'), 400);
  }
});

reportsRouter.put("/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    
    // Only admins can update report status
    if (auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    const result = await db.update(reports)
      .set({ status: body.status })
      .where(eq(reports.id, id))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'REPORT_UPDATE_ERROR'), 400);
  }
});
