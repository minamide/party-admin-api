import { Hono } from 'hono';
import { meshStatistics } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { sql } from 'drizzle-orm';

export const statisticsRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * Get household statistics for a specific mesh code
 */
statisticsRouter.get('/mesh/:meshCode', async (c) => {
    const meshCode = c.req.param('meshCode');
    try {
        const db = getDb(c);
        const appId = c.env.ESTAT_APP_ID;

        if (!appId) {
            console.error('[MESH_STATS] Error: ESTAT_APP_ID is not defined');
            return c.json(createErrorResponse('ESTAT_APP_ID not configured', 'CONFIG_ERROR'), 500);
        }

        // 1. Ensure Table exists (Manual Check)
        try {
            await db.run(sql`CREATE TABLE IF NOT EXISTS mesh_statistics (
            mesh_code TEXT PRIMARY KEY, 
            households INTEGER, 
            population INTEGER, 
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        } catch (e) {
            console.error('[MESH_STATS] Table creation failed:', e);
        }

        // 2. Check Cache
        try {
            const cached = await db.select().from(meshStatistics).where(eq(meshStatistics.meshCode, meshCode)).get();
            if (cached) return c.json(cached, 200);
        } catch (e) {
            console.warn('[MESH_STATS] Cache fetch failed (might be first run):', e);
        }

        // 3. Determine statsDataId for 2020 Census (Standard 10-digit IDs)
        // 0003445101: 2020 Census 1km Mesh (Population/Households)
        // 0003448101: 2020 Census 500m Mesh (Population/Households)
        let statsDataId = meshCode.length >= 9 ? '0003448101' : '0003445101';

        // 4. Fetch from e-Stat
        const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${appId}&statsDataId=${statsDataId}&areaCode=${meshCode}&cdCat01=00101`;

        console.log(`[MESH_STATS] Fetching from e-Stat: ${meshCode}`);
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[MESH_STATS] e-Stat API Error: ${response.status} ${response.statusText}`);
            throw new Error(`e-Stat API returned ${response.status}`);
        }

        const data: any = await response.json();

        // Check if e-Stat returned an application error (like invalid appId)
        const resultStatus = data?.GET_STATS_DATA?.RESULT?.STATUS;
        if (resultStatus !== undefined && resultStatus !== 0) {
            const errorMsg = data?.GET_STATS_DATA?.RESULT?.ERROR_MSG || 'e-Stat domain error';
            console.error(`[MESH_STATS] e-Stat Application Error: ${resultStatus} - ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const dataInf = data?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;

        let households = 0;
        if (dataInf) {
            const valObj = Array.isArray(dataInf) ? dataInf[0] : dataInf;
            households = parseInt(valObj['$'], 10) || 0;
        }

        // 5. Save to Cache
        const result = await db.insert(meshStatistics).values({
            meshCode,
            households,
            updatedAt: new Date().toISOString()
        }).onConflictDoUpdate({
            target: meshStatistics.meshCode,
            set: { households, updatedAt: new Date().toISOString() }
        }).returning().get();

        return c.json(result, 200);
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error('[MESH_STATS_ERROR]:', message);
        return c.json(createErrorResponse(message, 'MESH_STATS_ERROR'), 500);
    }
});

/**
 * Batch get mesh statistics
 */
statisticsRouter.get('/mesh_batch', async (c) => {
    try {
        const codesStr = c.req.query('codes');
        if (!codesStr) return c.json({ data: [], missing: [] }, 200);

        const codes = codesStr.split(',').filter(c => c.length > 0);
        if (codes.length === 0) return c.json({ data: [], missing: [] }, 200);

        const db = getDb(c);

        // Ensure Table exists
        try {
            await db.run(sql`CREATE TABLE IF NOT EXISTS mesh_statistics (
                mesh_code TEXT PRIMARY KEY, 
                households INTEGER, 
                population INTEGER, 
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`);
        } catch (e) { }

        // Find existing in cache
        const cachedResults = await db.select().from(meshStatistics).where(inArray(meshStatistics.meshCode, codes)).all();

        const cachedMap = new Map(cachedResults.map(r => [r.meshCode, r]));
        const results = [];
        const missingCodes = [];

        for (const code of codes) {
            if (cachedMap.has(code)) {
                results.push(cachedMap.get(code));
            } else {
                missingCodes.push(code);
            }
        }

        return c.json({
            data: results,
            missing: missingCodes
        }, 200);
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error('[MESH_BATCH_STATS_ERROR]:', message);
        return c.json(createErrorResponse(message, 'MESH_BATCH_STATS_ERROR'), 500);
    }
});
