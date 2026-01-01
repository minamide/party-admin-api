-- ========================================
-- 活動場所関連テーブルのダウン（ロールバック）マイグレーション
-- 実行すると activity_places 関連のテーブル・インデックスを削除します
-- ========================================
-- Rel テーブルは外部キー参照があるため先に削除
DROP INDEX IF EXISTS idx_rel_activity_place_types_type_code;
DROP INDEX IF EXISTS idx_rel_activity_place_types_place_id;
DROP TABLE IF EXISTS rel_activity_place_types;

-- マスター（活動種別）
DROP INDEX IF EXISTS idx_m_activity_types_sort;
DROP TABLE IF EXISTS m_activity_types;

-- 写真テーブル
DROP INDEX IF EXISTS idx_activity_place_photos_place_id;
DROP TABLE IF EXISTS activity_place_photos;

-- 活動場所本体
DROP INDEX IF EXISTS idx_activity_places_city_code;
DROP INDEX IF EXISTS idx_activity_places_latitude;
DROP INDEX IF EXISTS idx_activity_places_longitude;
DROP TABLE IF EXISTS activity_places;

-- 注意: このファイルはダウンマイグレーションです。実行前にバックアップを取得してください。
