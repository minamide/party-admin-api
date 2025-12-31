import { Hono } from "hono";
import { censusMesh2020 } from '../db/schema';
import { eq, and, gte, lte, like, sql } from 'drizzle-orm';
import { getDb } from '../utils/db';
import { getErrorMessage, createErrorResponse } from '../utils/errors';

export const censusMeshRouter = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * GET /census-mesh/:keyCode
 * 特定のメッシュコードのデータを取得
 */
censusMeshRouter.get("/:keyCode", async (c) => {
  try {
    const keyCode = c.req.param('keyCode');
    const db = getDb(c);
    
    const result = await db.select()
      .from(censusMesh2020)
      .where(eq(censusMesh2020.keyCode, keyCode))
      .get();
    
    if (!result) {
      return c.json(
        createErrorResponse('メッシュデータが見つかりません', 'NOT_FOUND'),
        404
      );
    }
    
    return c.json(result, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CENSUS_MESH_GET_ERROR'), 500);
  }
});

/**
 * GET /census-mesh
 * クエリパラメータでメッシュデータを検索
 * - keyCodePrefix: メッシュコードの前方一致検索
 * - minPopulation: 最小人口
 * - maxPopulation: 最大人口
 * - minHouseholds: 最小世帯数
 * - maxHouseholds: 最大世帯数
 * - limit: 取得件数上限（デフォルト: 100, 最大: 1000）
 * - offset: オフセット（ページネーション用）
 */
censusMeshRouter.get("/", async (c) => {
  try {
    const db = getDb(c);
    const keyCodePrefix = c.req.query('keyCodePrefix');
    const minPopulation = c.req.query('minPopulation');
    const maxPopulation = c.req.query('maxPopulation');
    const minHouseholds = c.req.query('minHouseholds');
    const maxHouseholds = c.req.query('maxHouseholds');
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');
    
    const limit = Math.min(parseInt(limitParam || '100'), 1000);
    const offset = parseInt(offsetParam || '0');
    
    // クエリ条件を構築
    const conditions = [];
    
    if (keyCodePrefix) {
      conditions.push(like(censusMesh2020.keyCode, `${keyCodePrefix}%`));
    }
    
    if (minPopulation) {
      conditions.push(gte(censusMesh2020.t001101001, parseInt(minPopulation)));
    }
    
    if (maxPopulation) {
      conditions.push(lte(censusMesh2020.t001101001, parseInt(maxPopulation)));
    }
    
    if (minHouseholds) {
      conditions.push(gte(censusMesh2020.t001101034, parseInt(minHouseholds)));
    }
    
    if (maxHouseholds) {
      conditions.push(lte(censusMesh2020.t001101034, parseInt(maxHouseholds)));
    }
    
    let query = db.select().from(censusMesh2020);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query
      .limit(limit)
      .offset(offset)
      .all();
    
    return c.json({
      data: results,
      meta: {
        limit,
        offset,
        count: results.length,
      }
    }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CENSUS_MESH_SEARCH_ERROR'), 500);
  }
});

/**
 * GET /census-mesh/summary/:keyCodePrefix
 * 特定のメッシュコード前綴（都道府県や市区町村レベル）の集計データを取得
 */
censusMeshRouter.get("/summary/:keyCodePrefix", async (c) => {
  try {
    const keyCodePrefix = c.req.param('keyCodePrefix');
    const db = getDb(c);
    
    // SQLiteの集計関数を使用して集計
    const result = await db.select({
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
    .where(like(censusMesh2020.keyCode, `${keyCodePrefix}%`))
    .get();
    
    if (!result || result.meshCount === 0) {
      return c.json(
        createErrorResponse('該当するメッシュデータが見つかりません', 'NOT_FOUND'),
        404
      );
    }
    
    return c.json({
      keyCodePrefix,
      summary: result,
    }, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CENSUS_MESH_SUMMARY_ERROR'), 500);
  }
});

/**
 * GET /census-mesh/statistics/demographics/:keyCode
 * 特定メッシュの詳細な人口統計情報を返す（整形版）
 */
censusMeshRouter.get("/statistics/demographics/:keyCode", async (c) => {
  try {
    const keyCode = c.req.param('keyCode');
    const db = getDb(c);
    
    const data = await db.select()
      .from(censusMesh2020)
      .where(eq(censusMesh2020.keyCode, keyCode))
      .get();
    
    if (!data) {
      return c.json(
        createErrorResponse('メッシュデータが見つかりません', 'NOT_FOUND'),
        404
      );
    }
    
    // データを整形して返す
    const demographics = {
      keyCode: data.keyCode,
      population: {
        total: data.t001101001 || 0,
        male: data.t001101002 || 0,
        female: data.t001101003 || 0,
      },
      ageGroups: {
        age0to14: {
          total: data.t001101004 || 0,
          male: data.t001101005 || 0,
          female: data.t001101006 || 0,
        },
        age15to64: {
          total: data.t001101010 || 0,
          male: data.t001101011 || 0,
          female: data.t001101012 || 0,
        },
        age65Plus: {
          total: data.t001101019 || 0,
          male: data.t001101020 || 0,
          female: data.t001101021 || 0,
        },
        age75Plus: {
          total: data.t001101022 || 0,
          male: data.t001101023 || 0,
          female: data.t001101024 || 0,
        },
      },
      foreigners: {
        total: data.t001101031 || 0,
        male: data.t001101032 || 0,
        female: data.t001101033 || 0,
      },
      households: {
        total: data.t001101034 || 0,
        general: data.t001101035 || 0,
        singlePerson: data.t001101036 || 0,
        twoPerson: data.t001101037 || 0,
        threePerson: data.t001101038 || 0,
        fourPerson: data.t001101039 || 0,
        fivePerson: data.t001101040 || 0,
        sixPerson: data.t001101041 || 0,
        sevenPlusPersons: data.t001101042 || 0,
        nuclear: data.t001101044 || 0,
        elderly: data.t001101049 || 0,
      },
    };
    
    return c.json(demographics, 200);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return c.json(createErrorResponse(message, 'CENSUS_MESH_DEMOGRAPHICS_ERROR'), 500);
  }
});
