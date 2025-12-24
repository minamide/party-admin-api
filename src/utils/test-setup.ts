import { Miniflare } from 'miniflare';
import { DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

let mf: Miniflare;
let db: DrizzleD1Database<typeof schema>;

export async function setupD1() {
  // Miniflare インスタンスを作成
  mf = new Miniflare({
    // D1 データベースをシミュレート
    modules: true,
    script: '',
    bindings: {
      DB: {
        type: 'd1',
        database_id: 'test-db',
      },
    },
  });

  // Miniflare から D1 バインディングを取得
  const ns = await mf.getNamespace('DB');
  
  // Drizzle ORM を初期化
  db = drizzle(ns as any, { schema });

  return db;
}

export async function teardownD1() {
  if (mf) {
    await mf.dispose();
  }
}

export function getDb() {
  return db;
}
