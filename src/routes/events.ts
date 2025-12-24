import { Hono } from "hono";
import { eventAttendances } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const eventsRouter = new Hono<{ Bindings: CloudflareBindings }>();

eventsRouter.post("/attendances", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['eventId', 'userId']);
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
    // Only allow user to register as themselves (unless admin)
    if (body.userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    const db = getDb(c);
    await db.insert(eventAttendances).values({
      eventId: body.eventId,
      userId: body.userId,
      status: body.status || 'going',
    });
    return c.json({ success: true }, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'EVENT_ATTENDANCE_CREATE_ERROR'), 400);
  }
});

eventsRouter.put("/attendances/:eventId/:userId", requireAuth, async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    
    // Only allow user to update as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    const result = await db.update(eventAttendances)
      .set({ status: body.status })
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)))
      .returning()
      .get();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'EVENT_ATTENDANCE_UPDATE_ERROR'), 400);
  }
});

eventsRouter.delete("/attendances/:eventId/:userId", requireAuth, async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const userId = c.req.param('userId');
    const auth = c.env.auth as any;
    
    // Only allow user to cancel as themselves (unless admin)
    if (userId !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(
        createErrorResponse('権限がありません', 'FORBIDDEN'),
        403
      );
    }
    
    const db = getDb(c);
    await db.delete(eventAttendances)
      .where(and(eq(eventAttendances.eventId, eventId), eq(eventAttendances.userId, userId)));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'EVENT_ATTENDANCE_DELETE_ERROR'), 400);
  }
});

eventsRouter.get("/:eventId/attendees", async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const db = getDb(c);
    const result = await db.select()
      .from(eventAttendances)
      .where(eq(eventAttendances.eventId, eventId))
      .all();
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'EVENT_ATTENDEES_LIST_ERROR'), 500);
  }
});
