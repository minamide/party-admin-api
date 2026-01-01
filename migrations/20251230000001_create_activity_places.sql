
-- ========================================
-- 活動場所管理テーブル（複数写真サポート）
-- ========================================
-- 活動場所の主テーブル
CREATE TABLE IF NOT EXISTS activity_places (
    -- 主キー: UUID を想定
    id TEXT NOT NULL PRIMARY KEY,
    -- 場所名（例: 駅前活動拠点A）
    name TEXT NOT NULL,
    -- 表示用住所（都道府県＋市区町村＋番地など）
    address TEXT,
    -- 市区町村コード（`m_cities.city_code` を参照可能）
    city_code TEXT,
    -- 緯度（REAL） 例: 35.6627
    latitude REAL,
    -- 経度（REAL） 例: 139.7314
    longitude REAL,
    -- GeoJSON を格納する場合に使用（任意）。点・ポリゴン等を文字列で保存
    location_geojson TEXT,
    -- 活動半径（メートル）。検索時の目安や表示に使用
    radius_m INTEGER NOT NULL DEFAULT 50,
    -- 収容人数（任意）
    capacity INTEGER,
    -- 活動種別の配列を JSON 文字列で保持（例: ["街宣","チラシ配り"]）
    activity_types TEXT, -- JSON array
    -- 管理者向け備考
    notes TEXT,
    -- 写真数のキャッシュ（`activity_place_photos` の件数）
    photo_count INTEGER NOT NULL DEFAULT 0,
    -- 有効フラグ: 1=有効, 0=無効（ソフトデリートや非表示に利用）
    is_active INTEGER NOT NULL DEFAULT 1,
    -- レコード作成者（ユーザーID 等）
    created_by TEXT,
    -- 作成/更新日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 外部キー: 存在する場合は市区町村マスターと紐付け
    FOREIGN KEY (city_code) REFERENCES m_cities(city_code)
);

-- 活動場所に紐づく写真テーブル（複数アップロードをサポート）
CREATE TABLE IF NOT EXISTS activity_place_photos (
    -- 主キー: UUID
    id TEXT NOT NULL PRIMARY KEY,
    -- 紐付く活動場所の ID
    place_id TEXT NOT NULL,
    -- 外部ストレージに保存した画像の公開 URL
    url TEXT NOT NULL,
    -- 元ファイル名（任意）
    filename TEXT,
    -- 画像メタ情報を JSON で保持（例: {"width":1024,"height":768}）
    metadata TEXT, -- JSON (width/height/origin/...)
    -- 表示順序（昇順）
    sort_order INTEGER NOT NULL DEFAULT 0,
    -- 代表画像フラグ 1=代表
    is_primary INTEGER NOT NULL DEFAULT 0,
    -- 登録日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- ON DELETE CASCADE で場所削除時に写真も削除
    FOREIGN KEY (place_id) REFERENCES activity_places(id) ON DELETE CASCADE
);

-- インデックス: 位置検索と写真参照を高速化
CREATE INDEX IF NOT EXISTS idx_activity_places_city_code ON activity_places(city_code);
CREATE INDEX IF NOT EXISTS idx_activity_places_latitude ON activity_places(latitude);
CREATE INDEX IF NOT EXISTS idx_activity_places_longitude ON activity_places(longitude);
CREATE INDEX IF NOT EXISTS idx_activity_place_photos_place_id ON activity_place_photos(place_id);

-- ========================================
-- 活動種別マスターと関連テーブル
-- - 活動種別の日本語ラベルを保持するマスター
-- - 多対多の紐付けは中間テーブルで管理（複数選択サポート）
-- ========================================
CREATE TABLE IF NOT EXISTS m_activity_types (
        -- 種別コード（例: 'street','leaflet','poster'）
        type_code TEXT PRIMARY KEY,
        -- 日本語表示名
        label_ja TEXT NOT NULL,
        -- 英語等の表示名（任意）
        label_en TEXT,
        -- 表示順序
        sort_order INTEGER DEFAULT 100,
        -- 有効フラグ
        is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rel_activity_place_types (
        -- 活動場所の ID
        place_id TEXT NOT NULL,
        -- 種別コード
        type_code TEXT NOT NULL,
        PRIMARY KEY (place_id, type_code),
        FOREIGN KEY (place_id) REFERENCES activity_places(id) ON DELETE CASCADE,
        FOREIGN KEY (type_code) REFERENCES m_activity_types(type_code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_m_activity_types_sort ON m_activity_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_rel_activity_place_types_type_code ON rel_activity_place_types(type_code);
CREATE INDEX IF NOT EXISTS idx_rel_activity_place_types_place_id ON rel_activity_place_types(place_id);

-- 初期データ（日本語ラベル）
INSERT OR IGNORE INTO m_activity_types(type_code,label_ja,sort_order,is_active) VALUES
    ('street','街宣',10,1),
    ('leaflet','チラシ配り',20,1),
    ('poster','ポスター掲示',30,1),
    ('stall','街頭ブース',40,1);
