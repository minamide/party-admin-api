-- マイグレーション: 選挙管理テーブルの追加
-- 作成日時: 2025-12-28
-- 説明: 党員、選挙区、ポスター掲示板管理等に必要なマスターテーブル及びトランザクションテーブルを追加

-- ========================================
-- マスターテーブル (m_* テーブル)
-- ========================================
-- 参照用の基本情報を管理するテーブル群
-- 通常、これらは定期的に更新される参照データを保持

-- 比例区ブロック情報
-- 参院議員比例代表の選挙区ブロック（北海道ブロック、東北ブロック等）を管理
CREATE TABLE "m_proportional_blocks" (
    "block_code" TEXT NOT NULL PRIMARY KEY,
    "block_name" TEXT NOT NULL,
    "num_seats" INTEGER
);

-- 都道府県マスター
-- 日本全国の47都道府県情報を保持
CREATE TABLE "m_prefectures" (
    "pref_code" TEXT NOT NULL PRIMARY KEY,
    "pref_name" TEXT NOT NULL,
    "pref_kana" TEXT,
    "proportional_block_code" TEXT,
    FOREIGN KEY (proportional_block_code) REFERENCES "m_proportional_blocks" (block_code)
);

-- 市区町村マスター
-- 全国の市区町村情報と中心座標を管理
CREATE TABLE "m_cities" (
    "city_code" TEXT NOT NULL PRIMARY KEY,
    "pref_code" TEXT NOT NULL,
    "city_name" TEXT NOT NULL,
    "city_kana" TEXT,
    "center_location" TEXT,
    FOREIGN KEY (pref_code) REFERENCES "m_prefectures" (pref_code)
);

-- 町丁・字マスター
-- 市区町村以下の町丁・字情報を管理
CREATE TABLE "m_towns" (
  key_code TEXT PRIMARY KEY,         -- 町丁・字等コード（最大11桁）
  pref_code TEXT NOT NULL,       -- 都道府県コード（2桁）
  city_code TEXT NOT NULL,     -- 市区町村コード（5桁）

  level INTEGER NOT NULL,            -- 表章単位
  town_name TEXT,                    -- 町丁・字等名

  population INTEGER,                -- 人口総数
  male INTEGER,                      -- 男
  female INTEGER,                    -- 女
  households INTEGER,                -- 世帯総数

  FOREIGN KEY (pref_code) REFERENCES m_prefectures(pref_code),
  FOREIGN KEY (city_code) REFERENCES m_cities(city_code)
);

-- 選挙種別マスター
-- 衆議院選挙、参議院選挙、知事選挙等の選挙区分を定義
CREATE TABLE "m_election_types" (
    "type_code" TEXT NOT NULL PRIMARY KEY,
    "type_name" TEXT NOT NULL
);

-- 選挙区マスター
-- 衆議院、参議院、都道府県議会等の選挙区情報を管理
CREATE TABLE "m_electoral_districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chamber_type_code" TEXT NOT NULL,
    "pref_code" TEXT NOT NULL,
    "district_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    FOREIGN KEY (pref_code) REFERENCES "m_prefectures" (pref_code)
);

-- 政党マスター
-- 政党の基本情報（名称、色コード、ロゴ等）を管理
CREATE TABLE "m_parties" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "color_code" TEXT,
    "logo_url" TEXT,
    "is_active" INTEGER DEFAULT 1
);

-- 支部情報
-- 政党の地域支部（本部、県連、市支部等）の情報を管理
CREATE TABLE "m_branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "party_id" INTEGER,
    "address" TEXT,
    "location" TEXT,
    "phone_number" TEXT,
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES "m_parties" (id)
);

-- ポスター掲示板マスター
-- 全国の公職選挙法で指定されたポスター掲示板の位置情報を管理
CREATE TABLE "m_poster_boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT,
    "address_text" TEXT,
    "location_name" TEXT,
    "voting_district_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postal_code" TEXT,
    "city_code" TEXT,
    FOREIGN KEY (city_code) REFERENCES "m_cities" (city_code)
);

-- 印刷物・チラシ情報
-- ポスター、チラシ、政策チラシ等の印刷物情報を管理
-- 配布期間、種別、画像等を保持
CREATE TABLE "m_printed_materials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "size" TEXT,
    "image_url" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "distribution_start_date" DATE,
    "distribution_end_date" DATE,
    "period_type" TEXT
);

-- ========================================
-- リレーションシップテーブル
-- ========================================
-- 関連情報を管理するテーブル群

-- 市区町村と選挙区の関連テーブル
-- 一つの市区町村が複数の選挙区に跨る場合に対応
-- 選挙区分割情報を保持
CREATE TABLE "rel_city_districts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "city_code" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "is_split" INTEGER DEFAULT 0,
    "note" TEXT,
    FOREIGN KEY (city_code) REFERENCES "m_cities" (city_code),
    FOREIGN KEY (district_id) REFERENCES "m_electoral_districts" (id)
);

-- ========================================
-- トランザクションテーブル (t_* テーブル)
-- ========================================
-- 選挙活動の実績及び動的なデータを管理するテーブル群

-- 活動グループ
-- 街宣活動等を行うボランティアグループの情報を管理
-- 各グループに色コード等の属性を付与
CREATE TABLE "t_activity_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color_code" TEXT,
    "logo_url" TEXT
);

-- グループとメンバーの関連テーブル
-- グループに所属するボランティアの関係を管理
CREATE TABLE "rel_group_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" TEXT NOT NULL,
    "volunteer_id" TEXT NOT NULL,
    "role" TEXT,
    FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id),
    FOREIGN KEY (volunteer_id) REFERENCES "profiles" (id)
);

-- 選挙情報テーブル
-- 個別の選挙イベント情報を管理
-- 投票日、告示日、選挙名等を保持
CREATE TABLE "t_elections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city_code" TEXT NOT NULL,
    "election_type_code" TEXT NOT NULL,
    "electoral_district_id" TEXT,
    "vote_date" DATE NOT NULL,
    "announcement_date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    FOREIGN KEY (city_code) REFERENCES "m_cities" (city_code),
    FOREIGN KEY (election_type_code) REFERENCES "m_election_types" (type_code),
    FOREIGN KEY (electoral_district_id) REFERENCES "m_electoral_districts" (id)
);

-- 活動実績テーブル
-- 街宣、チラシ配り、ポスター掲示等の活動実績を記録
-- ボランティアが行った活動の内容、日時、人数等を管理
CREATE TABLE "t_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "election_id" TEXT,
    "activity_type" TEXT NOT NULL,
    "activity_date" DATETIME NOT NULL,
    "volunteer_id" TEXT,
    "group_id" TEXT,
    "description" TEXT,
    "duration_minutes" INTEGER,
    "count_items" INTEGER,
    "location_details" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES "t_elections" (id),
    FOREIGN KEY (volunteer_id) REFERENCES "profiles" (id),
    FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id)
);

-- ポスター掲示ルート
-- ポスター掲示活動の巡回ルート情報を管理
-- 複数の掲示板を効率的に巡回するためのルート定義
CREATE TABLE "t_poster_routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "election_id" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "color_code" TEXT,
    FOREIGN KEY (election_id) REFERENCES "t_elections" (id)
);

-- ルート割り当てテーブル
-- ボランティア又はグループにルートを割り当てる
-- 誰がどのルートを担当するかを管理
CREATE TABLE "t_route_assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "route_id" TEXT NOT NULL,
    "volunteer_id" TEXT,
    "group_id" TEXT,
    FOREIGN KEY (route_id) REFERENCES "t_poster_routes" (id),
    FOREIGN KEY (volunteer_id) REFERENCES "profiles" (id),
    FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id)
);

-- ポスター掲示実績テーブル
-- ポスター掲示板への実際の掲示状況を記録
-- 掲示日時、担当者、掲示状況等を管理
CREATE TABLE "t_poster_boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "election_id" TEXT NOT NULL,
    "master_board_id" TEXT NOT NULL,
    "board_number" TEXT NOT NULL,
    "route_id" TEXT,
    "is_posted" INTEGER DEFAULT 0,
    "posted_at" DATETIME,
    "posted_by" TEXT,
    "posted_by_group_id" TEXT,
    "status" TEXT DEFAULT 'active',
    "note" TEXT,
    "photo_url" TEXT,
    FOREIGN KEY (election_id) REFERENCES "t_elections" (id),
    FOREIGN KEY (master_board_id) REFERENCES "m_poster_boards" (id),
    FOREIGN KEY (route_id) REFERENCES "t_poster_routes" (id),
    FOREIGN KEY (posted_by) REFERENCES "profiles" (id),
    FOREIGN KEY (posted_by_group_id) REFERENCES "t_activity_groups" (id)
);

-- ポスター掲示板報告テーブル
-- ポスター掲示板の被害報告や状態報告を記録
-- 損傷、落下等の問題を報告・管理
CREATE TABLE "t_board_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "board_id" TEXT NOT NULL,
    "reporter_id" TEXT,
    "report_type" TEXT NOT NULL,
    "description" TEXT,
    "photo_url" TEXT,
    "status" TEXT DEFAULT 'open',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES "t_poster_boards" (id),
    FOREIGN KEY (reporter_id) REFERENCES "profiles" (id)
);

-- Create indexes for better query performance
CREATE INDEX idx_m_cities_pref_code ON "m_cities" (pref_code);
CREATE INDEX idx_m_electoral_districts_pref_code ON "m_electoral_districts" (pref_code);
CREATE INDEX idx_rel_city_districts_city_code ON "rel_city_districts" (city_code);
CREATE INDEX idx_rel_city_districts_district_id ON "rel_city_districts" (district_id);
CREATE INDEX idx_rel_group_members_group_id ON "rel_group_members" (group_id);
CREATE INDEX idx_rel_group_members_volunteer_id ON "rel_group_members" (volunteer_id);
CREATE INDEX idx_t_activities_election_id ON "t_activities" (election_id);
CREATE INDEX idx_t_activities_volunteer_id ON "t_activities" (volunteer_id);
CREATE INDEX idx_t_activities_group_id ON "t_activities" (group_id);
CREATE INDEX idx_t_elections_city_code ON "t_elections" (city_code);
CREATE INDEX idx_t_elections_election_type_code ON "t_elections" (election_type_code);
CREATE INDEX idx_t_poster_boards_election_id ON "t_poster_boards" (election_id);
CREATE INDEX idx_t_poster_boards_route_id ON "t_poster_boards" (route_id);
CREATE INDEX idx_t_poster_routes_election_id ON "t_poster_routes" (election_id);

CREATE INDEX idx_town_pref_code ON m_towns(pref_code);
CREATE INDEX idx_town_city_code ON m_towns(city_code);
CREATE INDEX idx_town_level ON m_towns(level);
CREATE INDEX idx_town_city_code_level ON m_towns(city_code,level);
