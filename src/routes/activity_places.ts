import { Hono } from 'hono';
import { activityPlaces, activityPlacePhotos, mActivityTypes, relActivityPlaceTypes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';

export const activityPlacesRouter = new Hono<{ Bindings: CloudflareBindings }>();

// List with optional city_code filter
activityPlacesRouter.get('/', async (c) => {
  try {
    const db = getDb(c);
    const city = c.req.query('city_code');
    let result;
    if (city) {
      result = await db.select().from(activityPlaces).where(eq(activityPlaces.cityCode, city)).all();
    } else {
      result = await db.select().from(activityPlaces).all();
    }
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_PLACES_LIST_ERROR'), 500);
  }
});

// Create
activityPlacesRouter.post('/', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = validateRequired(body, ['name']);
    if (!validation.valid) {
      return c.json(createErrorResponse('Missing required fields', 'VALIDATION_ERROR', { missing: validation.missing }), 400);
    }
    const auth = c.env.auth as any;
    const db = getDb(c);
    const id = crypto.randomUUID();

    const created = await db.insert(activityPlaces).values({
      id,
      name: body.name,
      address: body.address || null,
      cityCode: body.city_code || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      locationGeojson: body.location_geojson || null,
      radiusM: body.radius_m ?? 50,
      capacity: body.capacity ?? null,
      activityTypes: body.activity_types ? JSON.stringify(body.activity_types) : null,
      notes: body.notes || null,
      photoCount: 0,
      isActive: body.is_active ?? 1,
      createdBy: auth.user.userId,
    }).returning().get();

    // Persist relation entries if activity type codes provided
    if (Array.isArray(body.type_codes) && body.type_codes.length > 0) {
      for (const code of body.type_codes) {
        try { await db.insert(relActivityPlaceTypes).values({ placeId: id, typeCode: code }); } catch (_) { }
      }
    }

    return c.json(created, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_PLACE_CREATE_ERROR'), 400);
  }
});

// Get single including photos and types
activityPlacesRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c);
    const place = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!place) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);

    const photos = await db.select().from(activityPlacePhotos).where(eq(activityPlacePhotos.placeId, id)).all();
    const rels = await db.select().from(relActivityPlaceTypes).where(eq(relActivityPlaceTypes.placeId, id)).all();
    const typeCodes = rels.map(r => (r as any).type_code || (r as any).typeCode);
    const types = typeCodes.length ? await db.select().from(mActivityTypes).where(mActivityTypes.typeCode.in(typeCodes)).all() : [];

    return c.json({ place, photos, types }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_PLACE_GET_ERROR'), 500);
  }
});

// Update
activityPlacesRouter.put('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const auth = c.env.auth as any;
    const db = getDb(c);

    const existing = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!existing) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);
    if (existing.createdBy !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(createErrorResponse('権限がありません', 'FORBIDDEN'), 403);
    }

    const updated = await db.update(activityPlaces).set({
      name: body.name ?? existing.name,
      address: body.address ?? existing.address,
      cityCode: body.city_code ?? existing.cityCode,
      latitude: body.latitude ?? existing.latitude,
      longitude: body.longitude ?? existing.longitude,
      locationGeojson: body.location_geojson ?? existing.locationGeojson,
      radiusM: body.radius_m ?? existing.radiusM,
      capacity: body.capacity ?? existing.capacity,
      activityTypes: body.activity_types ? JSON.stringify(body.activity_types) : existing.activityTypes,
      notes: body.notes ?? existing.notes,
      isActive: body.is_active ?? existing.isActive,
    }).where(eq(activityPlaces.id, id)).returning().get();

    // Update rel_activity_place_types if type_codes provided
    if (Array.isArray(body.type_codes)) {
      // remove existing
      await db.delete(relActivityPlaceTypes).where(eq(relActivityPlaceTypes.placeId, id));
      for (const code of body.type_codes) {
        try { await db.insert(relActivityPlaceTypes).values({ placeId: id, typeCode: code }); } catch (_) { }
      }
    }

    return c.json(updated, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_PLACE_UPDATE_ERROR'), 400);
  }
});

// Delete
activityPlacesRouter.delete('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const auth = c.env.auth as any;
    const db = getDb(c);

    const existing = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!existing) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);
    if (existing.createdBy !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(createErrorResponse('権限がありません', 'FORBIDDEN'), 403);
    }

    await db.delete(activityPlaces).where(eq(activityPlaces.id, id));
    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'ACTIVITY_PLACE_DELETE_ERROR'), 400);
  }
});
