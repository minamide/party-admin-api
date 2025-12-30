# テーブル定義書 — 選挙管理マイグレーション

対象ファイル: [work1/party-admin/create.sql](work1/party-admin/create.sql)

この文書は上記 SQL マイグレーションに含まれるテーブルについて、主キー・カラム・制約・外部キー・用途を簡潔にまとめたものです。

---

## m_proportional_blocks
- 説明: 比例代表ブロック（例: 北海道ブロック）
- 主キー: `block_code` TEXT
- カラム:
  - `block_code` TEXT NOT NULL PRIMARY KEY
  - `block_name` TEXT NOT NULL
  - `num_seats` INTEGER

## m_prefectures
- 説明: 都道府県マスター
- 主キー: `pref_code` TEXT
- カラム:
  - `pref_code` TEXT NOT NULL PRIMARY KEY
  - `pref_name` TEXT NOT NULL
  - `pref_kana` TEXT
  - `proportional_block_code` TEXT — FK -> `m_proportional_blocks(block_code)`

## m_cities
- 説明: 市区町村マスター
- 主キー: `city_code` TEXT
- カラム:
  - `city_code` TEXT NOT NULL PRIMARY KEY
  - `pref_code` TEXT NOT NULL — FK -> `m_prefectures(pref_code)`
  - `city_name` TEXT NOT NULL
  - `city_kana` TEXT
  - `latitude` REAL CHECK(latitude BETWEEN -90 AND 90)
  - `longitude` REAL CHECK(longitude BETWEEN -180 AND 180)

## m_towns
- 説明: 町丁・字マスター
- 主キー: `key_code` TEXT
- カラムの主な項目:
  - `key_code` TEXT PRIMARY KEY
  - `pref_code`, `city_code` TEXT (FK -> prefectures/cities)
  - `level` INTEGER NOT NULL
  - `town_name` TEXT
  - `latitude`, `longitude` REAL (チェック制約あり)
  - `population`, `male`, `female`, `households` INTEGER

## m_election_types
- 説明: 選挙種別（衆議院・参議院等）
- 主キー: `type_code` TEXT

## m_electoral_districts
- 説明: 選挙区マスター
- 主キー: `id` TEXT
- カラム:
  - `id` TEXT PRIMARY KEY
  - `chamber_type_code` TEXT NOT NULL
  - `pref_code` TEXT NOT NULL — FK -> `m_prefectures(pref_code)`
  - `district_number` INTEGER NOT NULL
  - `name` TEXT NOT NULL

## m_parties
- 説明: 政党マスター
- 主キー: `party_id` TEXT
- カラム:
  - `party_id` TEXT PRIMARY KEY
  - `name` TEXT NOT NULL
  - `short_name`, `color_code`, `note`, `logo_url` TEXT
  - `is_active` INTEGER DEFAULT 1

## m_branches
- 説明: 党支部（地域支部）
- 主キー: `id` TEXT
- カラム:
  - `id`, `name` TEXT
  - `party_id` INTEGER — FK -> `m_parties(party_id)` (CREATE の FK は `party_id` を参照)
  - `address`, `location`, `phone_number`, `notes`, `created_at`, `updated_at`

## m_poster_boards
- 説明: ポスター掲示板マスター
- 主キー: `id` TEXT
- カラム: `location`, `address_text`, `location_name`, `voting_district_name`, `created_at`, `postal_code`, `city_code` (FK -> `m_cities(city_code)`)

## m_printed_materials
- 説明: 印刷物・チラシ情報
- 主キー: `id` TEXT
- カラム: `name`, `type`, `size`, `image_url`, `distribution_start_date`, `distribution_end_date`, など

## rel_city_districts
- 説明: 市区町村と選挙区の関連（分割対応）
- 主キー: `id` INTEGER AUTOINCREMENT
- カラム: `city_code` TEXT, `district_id` TEXT, `is_split` INTEGER DEFAULT 0, `note` TEXT — FK -> `m_cities`, `m_electoral_districts`

## t_activity_groups
- 説明: 活動グループ（街宣等）
- 主キー: `id` TEXT
- カラム: `name`, `color_code`, `logo_url`

## rel_group_members
- 説明: グループ所属メンバー関連
- 主キー: `id` INTEGER AUTOINCREMENT
- カラム: `group_id` TEXT FK->t_activity_groups, `volunteer_id` TEXT FK->profiles, `role`

## t_elections
- 説明: 選挙イベント
- 主キー: `id` TEXT
- カラム: `city_code` FK->m_cities, `election_type_code` FK->m_election_types, `electoral_district_id` FK->m_electoral_districts, `vote_date`, `announcement_date`, `name`

## t_activities
- 説明: 活動実績（街宣、配布等）
- 主キー: `id` TEXT
- カラム: `election_id` FK->t_elections, `activity_type` TEXT NOT NULL, `activity_date` DATETIME NOT NULL, `volunteer_id`, `group_id`, `description`, `duration_minutes`, `count_items`, `location_details`, `created_at`

## t_poster_routes
- 説明: ポスター掲示巡回ルート
- 主キー: `id` TEXT
- カラム: `election_id` FK->t_elections, `route_name`, `color_code`

## t_route_assignments
- 説明: ルート割当
- 主キー: `id` INTEGER AUTOINCREMENT
- カラム: `route_id` FK->t_poster_routes, `volunteer_id`, `group_id`

## t_poster_boards
- 説明: ポスター掲示実績
- 主キー: `id` TEXT
- カラムの主な項目:
  - `election_id`, `master_board_id` FK->m_poster_boards, `board_number`
  - `is_posted` INTEGER DEFAULT 0, `posted_at`, `posted_by`, `posted_by_group_id`, `status` TEXT DEFAULT 'active', `note`, `photo_url`

## t_board_reports
- 説明: 掲示板報告（損傷等）
- 主キー: `id` TEXT
- カラム: `board_id` FK->t_poster_boards, `reporter_id`, `report_type`, `description`, `photo_url`, `status` TEXT DEFAULT 'open', `created_at`

## インデックス（作成されている主なもの）
- `idx_m_cities_pref_code` ON m_cities(pref_code)
- `idx_m_electoral_districts_pref_code` ON m_electoral_districts(pref_code)
- `idx_rel_city_districts_city_code` ON rel_city_districts(city_code)
- `idx_rel_group_members_group_id` ON rel_group_members(group_id)
- `idx_rel_group_members_volunteer_id` ON rel_group_members(volunteer_id)
- `idx_t_activities_election_id`, `idx_t_activities_volunteer_id`, `idx_t_activities_group_id`
- `idx_t_elections_city_code`, `idx_t_elections_election_type_code`
- `idx_t_poster_boards_route_id`, `idx_t_poster_boards_election_id`

---

注意事項:
- 本 SQL では SQLite（D1）互換の型・制約を用いています。運用環境の D1 によっては外部キー制約の挙動が異なる場合があるため、マイグレーション適用後に `sqlite_master` 等でテーブルと制約を確認してください。
- `profiles` 等このファイル外で参照されるテーブルがあるため、参照整合性を確認してください。

保存先:
- [work1/party-admin/TABLE_DEFINITIONS.md](work1/party-admin/TABLE_DEFINITIONS.md)
