-- Recreate activity_places and related tables (re-apply after drop)

-- 活動場所の主テーブル
CREATE TABLE IF NOT EXISTS activity_places (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city_code TEXT,
    latitude REAL,
    longitude REAL,
    location_geojson TEXT,
    radius_m INTEGER NOT NULL DEFAULT 50,
    capacity INTEGER,
    activity_types TEXT,
    notes TEXT,
    photo_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_code) REFERENCES m_cities(city_code)
);

CREATE TABLE IF NOT EXISTS activity_place_photos (
    id TEXT NOT NULL PRIMARY KEY,
    place_id TEXT NOT NULL,
    url TEXT NOT NULL,
    filename TEXT,
    metadata TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES activity_places(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_places_city_code ON activity_places(city_code);
CREATE INDEX IF NOT EXISTS idx_activity_places_latitude ON activity_places(latitude);
CREATE INDEX IF NOT EXISTS idx_activity_places_longitude ON activity_places(longitude);
CREATE INDEX IF NOT EXISTS idx_activity_place_photos_place_id ON activity_place_photos(place_id);

CREATE TABLE IF NOT EXISTS m_activity_types (
        type_code TEXT PRIMARY KEY,
        label_ja TEXT NOT NULL,
        label_en TEXT,
        sort_order INTEGER DEFAULT 100,
        is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rel_activity_place_types (
        place_id TEXT NOT NULL,
        type_code TEXT NOT NULL,
        PRIMARY KEY (place_id, type_code),
        FOREIGN KEY (place_id) REFERENCES activity_places(id) ON DELETE CASCADE,
        FOREIGN KEY (type_code) REFERENCES m_activity_types(type_code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_m_activity_types_sort ON m_activity_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_rel_activity_place_types_type_code ON rel_activity_place_types(type_code);
CREATE INDEX IF NOT EXISTS idx_rel_activity_place_types_place_id ON rel_activity_place_types(place_id);

INSERT OR IGNORE INTO m_activity_types(type_code,label_ja,sort_order,is_active) VALUES
    ('street','街宣',10,1),
    ('leaflet','チラシ配り',20,1),
    ('poster','ポスター掲示',30,1),
    ('stall','街頭ブース',40,1);
