import { Hono } from 'hono';
import { meshStatistics, censusMesh2020 } from '../db/schema';
import { eq, inArray, like } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';
import { sql } from 'drizzle-orm';

export const statisticsRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * Get household statistics for a specific mesh code
 * 优先: ローカルの census_mesh_2020 から取得（静的データ）
 */
statisticsRouter.get('/mesh/:meshCode', async (c) => {
    const meshCode = c.req.param('meshCode');
    try {
        const db = getDb(c);

        const codeLen = meshCode.length;

        // 0) 短すぎるコードは 400
        if (codeLen < 4) {
            return c.json(createErrorResponse('meshCode must be at least 4 digits', 'VALIDATION_ERROR'), 400);
        }

        // A) 4〜7桁: 前方一致で集計（合計値を返す）
        if (codeLen >= 4 && codeLen <= 7) {
            const summary = await db.select({
                totalPopulation: sql<number>`SUM(COALESCE(${censusMesh2020.t001101001}, 0))`,
                totalHouseholds: sql<number>`SUM(COALESCE(${censusMesh2020.t001101034}, 0))`,
                totalMale: sql<number>`SUM(COALESCE(${censusMesh2020.t001101002}, 0))`,
                totalFemale: sql<number>`SUM(COALESCE(${censusMesh2020.t001101003}, 0))`,
                totalAge0to14: sql<number>`SUM(COALESCE(${censusMesh2020.t001101004}, 0))`,
                totalAge15to64: sql<number>`SUM(COALESCE(${censusMesh2020.t001101010}, 0))`,
                totalAge65Plus: sql<number>`SUM(COALESCE(${censusMesh2020.t001101019}, 0))`,
                totalAge75Plus: sql<number>`SUM(COALESCE(${censusMesh2020.t001101022}, 0))`,
                totalForeigners: sql<number>`SUM(COALESCE(${censusMesh2020.t001101031}, 0))`,
                meshCount: sql<number>`COUNT(*)`,
            })
            .from(censusMesh2020)
            .where(like(censusMesh2020.keyCode, `${meshCode}%`))
            .get();

            if (!summary || summary.meshCount === 0) {
                return c.json(createErrorResponse('該当データがありません (local dataset)', 'NOT_FOUND'), 404);
            }

            return c.json({
                keyCodePrefix: meshCode,
                summary,
                source: 'local-aggregate',
            }, 200);
        }
        // B) 8桁以上: 完全一致で単一メッシュを取得。見つからなければ前方一致で集計を返す。
        try {
            const local = await db.select({
                meshCode: censusMesh2020.keyCode,
                households: censusMesh2020.t001101034,
                population: censusMesh2020.t001101001,
            })
            .from(censusMesh2020)
            .where(eq(censusMesh2020.keyCode, meshCode))
            .get();

            if (local) {
                return c.json({
                    meshCode: local.meshCode,
                    households: local.households ?? 0,
                    population: local.population ?? 0,
                    source: 'local',
                }, 200);
            }
        } catch (e) {
            console.warn('[MESH_STATS] Local lookup failed:', e);
        }

        // 2) 旧キャッシュテーブルに残っていれば返す（後方互換）
        try {
            const cached = await db.select().from(meshStatistics).where(eq(meshStatistics.meshCode, meshCode)).get();
            if (cached) {
                return c.json({ ...cached, source: 'cache' }, 200);
            }
        } catch (e) {
            console.warn('[MESH_STATS] Cache fetch failed:', e);
        }

        // 2.5) 8桁以上で完全一致が無い場合、前方一致で集計を返す（便宜的フォールバック）
        if (codeLen >= 8) {
            const summary = await db.select({
                totalPopulation: sql<number>`SUM(COALESCE(${censusMesh2020.t001101001}, 0))`,
                totalHouseholds: sql<number>`SUM(COALESCE(${censusMesh2020.t001101034}, 0))`,
                totalMale: sql<number>`SUM(COALESCE(${censusMesh2020.t001101002}, 0))`,
                totalFemale: sql<number>`SUM(COALESCE(${censusMesh2020.t001101003}, 0))`,
                totalAge0to14: sql<number>`SUM(COALESCE(${censusMesh2020.t001101004}, 0))`,
                totalAge15to64: sql<number>`SUM(COALESCE(${censusMesh2020.t001101010}, 0))`,
                totalAge65Plus: sql<number>`SUM(COALESCE(${censusMesh2020.t001101019}, 0))`,
                totalAge75Plus: sql<number>`SUM(COALESCE(${censusMesh2020.t001101022}, 0))`,
                totalForeigners: sql<number>`SUM(COALESCE(${censusMesh2020.t001101031}, 0))`,
                meshCount: sql<number>`COUNT(*)`,
            })
            .from(censusMesh2020)
            .where(like(censusMesh2020.keyCode, `${meshCode}%`))
            .get();

            if (summary && summary.meshCount > 0) {
                return c.json({
                    keyCodePrefix: meshCode,
                    summary,
                    source: 'local-aggregate',
                    note: 'fallback prefix aggregate (no exact match)',
                }, 200);
            }
        }

        // 3) ローカルに存在しない場合は 404 を返す（e-Stat には依存しない方針）
        return c.json(createErrorResponse('該当データがありません (local dataset)', 'NOT_FOUND'), 404);
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
        if (!codesStr) {
            c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            c.header('Access-Control-Allow-Origin', '*');
            c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            return c.json({ data: [], missing: [] }, 200);
        }

        const codes = codesStr.split(',').filter(c => c.length > 0);
        if (codes.length === 0) {
            c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            c.header('Access-Control-Allow-Origin', '*');
            c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            return c.json({ data: [], missing: [] }, 200);
        }

        const db = getDb(c);

        // ローカル census_mesh_2020 からまとめて取得
        const localResults = await db.select({
            meshCode: censusMesh2020.keyCode,
            households: censusMesh2020.t001101034,
            population: censusMesh2020.t001101001,
        })
        .from(censusMesh2020)
        .where(inArray(censusMesh2020.keyCode, codes))
        .all();

        const foundSet = new Set(localResults.map(r => r.meshCode));
        const missingCodes = codes.filter(code => !foundSet.has(code));

        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        c.header('Access-Control-Allow-Origin', '*');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        return c.json({
            data: localResults.map(r => ({ ...r, households: r.households ?? 0, population: r.population ?? 0, source: 'local' })),
            missing: missingCodes,
        }, 200);
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error('[MESH_BATCH_STATS_ERROR]:', message);
        return c.json(createErrorResponse(message, 'MESH_BATCH_STATS_ERROR'), 500);
    }
});

/**
 * Batch get mesh statistics (POST variant)
 * Accepts JSON body: { codes: string[] }
 * This complements the GET query-based endpoint and allows larger payloads.
 */
statisticsRouter.post('/mesh_batch', async (c) => {
    try {
        const body = await c.req.json();
        const codes = Array.isArray(body?.codes) ? body.codes.map(String).filter((s: string) => s.length > 0) : [];
        if (codes.length === 0) {
            c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
            c.header('Access-Control-Allow-Origin', '*');
            c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            return c.json({ data: [], missing: [] }, 200);
        }

        const db = getDb(c);

        // DB drivers commonly limit the number of placeholders in an IN() clause.
        // Chunk the requested codes to avoid exceeding that limit and merge results.
        // Conservative chunk size to avoid SQLite/D1 max variable limit errors
        const chunkSize = 100;
        const results: Array<{ meshCode: string; households: number | null; population: number | null; }> = [];

        // Separate codes into exact matches (length >= 8) and prefix matches (length < 8)
        const exactCodes = codes.filter(c => c.length >= 8);
        const prefixCodes = codes.filter(c => c.length >= 4 && c.length < 8);

        // 1) Handle exact matches in chunks
        for (let i = 0; i < exactCodes.length; i += chunkSize) {
            const chunk = exactCodes.slice(i, i + chunkSize);
            try {
                const chunkResults = await db.select({
                    meshCode: censusMesh2020.keyCode,
                    households: censusMesh2020.t001101034,
                    population: censusMesh2020.t001101001,
                })
                .from(censusMesh2020)
                .where(inArray(censusMesh2020.keyCode, chunk))
                .all();
                results.push(...chunkResults);
            } catch (err) {
                console.error('[MESH_BATCH_STATS_ERROR_EXACT_CHUNK]:', err);
            }
        }

        // 2) Handle prefix matches (e.g. 7-digit 5km blocks)
        // We run these sequentially as they are expected to be few for a visible area.
        for (const prefix of prefixCodes) {
            try {
                const prefixResults = await db.select({
                    meshCode: censusMesh2020.keyCode,
                    households: censusMesh2020.t001101034,
                    population: censusMesh2020.t001101001,
                })
                .from(censusMesh2020)
                .where(like(censusMesh2020.keyCode, `${prefix}%`))
                .all();
                results.push(...prefixResults);
            } catch (err) {
                console.error('[MESH_BATCH_STATS_ERROR_PREFIX]:', prefix, err);
            }
        }

        // Deduplicate results by meshCode
        const resultMap = new Map<string, { meshCode: string; households: number | null; population: number | null; }>();
        results.forEach(r => {
            if (r && r.meshCode) resultMap.set(r.meshCode, r as any);
        });

        const foundSet = new Set(resultMap.keys());
        const stillMissing: string[] = [];

        for (const code of codes) {
            if (code.length < 8) {
                // For prefixes, check if any result starts with it
                const found = results.some(r => r.meshCode.startsWith(code));
                if (!found) stillMissing.push(code);
            } else {
                // For exact matches
                if (!foundSet.has(code)) {
                    stillMissing.push(code);
                }
            }
        }

        // Combine exact-match results
        const exactData = Array.from(resultMap.values()).map(r => ({ ...r, households: r.households ?? 0, population: r.population ?? 0, source: 'local' }));
        
        // Note: Frontend now handles aggregation. We only return raw data.
        const allData = exactData;

        c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        c.header('Access-Control-Allow-Origin', '*');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        return c.json({
            data: allData,
            missing: stillMissing,
        }, 200);
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error('[MESH_BATCH_STATS_ERROR_POST]:', message);
        return c.json(createErrorResponse(message, 'MESH_BATCH_STATS_ERROR_POST'), 500);
    }
});

// OPTIONS preflight handler for mesh_batch
statisticsRouter.options('/mesh_batch', async (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return c.text('', 204);
});
