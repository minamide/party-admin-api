import { Hono } from 'hono';
import { activityPlaces, activityPlacePhotos, mActivityTypes, relActivityPlaceTypes } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { validateRequired } from '../utils/validation';
import { requireAuth } from '../middleware/auth';
import { generateJWT } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';

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
    const types = typeCodes.length ? await db.select().from(mActivityTypes).where(inArray(mActivityTypes.typeCode, typeCodes)).all() : [];

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

// Upload photo (server-side upload into R2 `activity-places` bucket)
activityPlacesRouter.post('/:id/photos', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const auth = c.env.auth as any;
    const db = getDb(c);

    const existing = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!existing) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);
    if (existing.createdBy !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(createErrorResponse('権限がありません', 'FORBIDDEN'), 403);
    }

    const form = await c.req.formData();
    const file = form.get('file') as any;
    if (!file || typeof file.arrayBuffer !== 'function') {
      return c.json(createErrorResponse('ファイルが見つかりません', 'NO_FILE'), 400);
    }

    const filename = file.name || 'upload';
    const buffer = await file.arrayBuffer();
    const key = `activity_places/${id}/${uuidv4()}-${filename}`;

    const r2 = (c.env as any).ACTIVITY_PLACES;
    if (!r2) return c.json(createErrorResponse('R2 バケットが未設定です', 'R2_NOT_CONFIGURED'), 500);

    await r2.put(key, buffer, { httpMetadata: { contentType: file.type || 'application/octet-stream' } });

    const photoId = crypto.randomUUID();
    const created = await db.insert(activityPlacePhotos).values({
      id: photoId,
      placeId: id,
      url: `r2://${key}`,
      filename,
      metadata: null,
      sortOrder: 0,
      isPrimary: 0,
    }).returning().get();

    // update photo_count cache
    try {
      const current = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
      const newCount = (current.photoCount ?? 0) + 1;
      await db.update(activityPlaces).set({ photoCount: newCount }).where(eq(activityPlaces.id, id));
    } catch (_e) { }

    return c.json(created, 201);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const errDetails: any = {};
    if (error instanceof Error) {
      errDetails.name = error.name;
      errDetails.message = error.message;
      errDetails.stack = error.stack;
      if ((error as any).cause) errDetails.cause = (error as any).cause;
    } else {
      errDetails.value = error;
    }
    try { console.error('PHOTO_UPLOAD_ERROR', errDetails); } catch (_) { }
    return c.json(createErrorResponse(message, 'PHOTO_UPLOAD_ERROR', errDetails), 500);
  }
});

// Generate signed URL for a photo (short-lived token pointing to R2 proxy)
activityPlacesRouter.get('/:id/photos/:photoId/signed_url', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const photoId = c.req.param('photoId');
    const auth = c.env.auth as any;
    const db = getDb(c);

    const existing = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!existing) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);
    // ownership not strictly required for read, but requireAuth ensures user

    const photo = await db.select().from(activityPlacePhotos).where(eq(activityPlacePhotos.id, photoId)).get();
    if (!photo) return c.json(createErrorResponse('写真が見つかりません', 'NOT_FOUND'), 404);

    const key = (photo.url as string).replace('r2://', '');
    const expires = parseInt(c.req.query('expires') || '300', 10); // seconds
    const secret = (c.env as any).JWT_SECRET;
    if (!secret) return c.json(createErrorResponse('JWT_SECRET 未設定', 'CONFIG_ERROR'), 500);

    // payload contains minimal info: key and requester id
    const payload: any = { userId: auth.user.userId, key };
    const token = await generateJWT(payload, secret, expires);

    const url = `${new URL(c.req.url).origin}/r2/${token}`;
    return c.json({ url, expires_in: expires }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'SIGNED_URL_ERROR'), 500);
  }
});

// Delete photo (remove from R2 and DB)
activityPlacesRouter.delete('/:id/photos/:photoId', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const photoId = c.req.param('photoId');
    const auth = c.env.auth as any;
    const db = getDb(c);

    const existing = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
    if (!existing) return c.json(createErrorResponse('活動場所が見つかりません', 'NOT_FOUND'), 404);
    if (existing.createdBy !== auth.user.userId && auth.user.role !== 'admin') {
      return c.json(createErrorResponse('権限がありません', 'FORBIDDEN'), 403);
    }

    const photo = await db.select().from(activityPlacePhotos).where(eq(activityPlacePhotos.id, photoId)).get();
    if (!photo) return c.json(createErrorResponse('写真が見つかりません', 'NOT_FOUND'), 404);

    const r2 = (c.env as any).ACTIVITY_PLACES;
    if (r2 && typeof photo.url === 'string' && photo.url.startsWith('r2://')) {
      const key = photo.url.replace('r2://', '');
      try { await r2.delete(key); } catch (_) { }
    }

    await db.delete(activityPlacePhotos).where(eq(activityPlacePhotos.id, photoId));

    // decrement photo_count cache
    try {
      const current = await db.select().from(activityPlaces).where(eq(activityPlaces.id, id)).get();
      const newCount = Math.max(0, (current.photoCount ?? 1) - 1);
      await db.update(activityPlaces).set({ photoCount: newCount }).where(eq(activityPlaces.id, id));
    } catch (_e) { }

    return c.json({ success: true }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'PHOTO_DELETE_ERROR'), 500);
  }
});
