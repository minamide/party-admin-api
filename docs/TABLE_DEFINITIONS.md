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

---

## 活動場所（activity_places）と写真（activity_place_photos）サポート
複数写真アップロードをサポートするため、以下のテーブルをこのマイグレーションに追加しました。

- `activity_places` — 活動場所の主テーブル。緯度/経度、半径、収容人数、`activity_types`（JSON配列）等を保持します。`photo_count` は写真数のキャッシュです。
- `activity_place_photos` — 複数写真を格納する正規化テーブル。各写真は外部ストレージに保存し、`url` を保持します。`sort_order` と `is_primary` で表示順・代表画像を制御します。

利用例（フロント→バックエンド）:
- 写真アップロードワークフロー: フロントで複数ファイルを受け取り、ストレージにアップロード → 各 URL をバックエンドに POST して `activity_place_photos` に登録。
- 場所作成時に写真を同時登録する場合はトランザクションで `activity_places` を作成後、`activity_place_photos` を挿入して `photo_count` を更新します。

注意:
- D1/SQLite はトランザクションをサポートしますが、外部ストレージの整合性（ファイル削除/DB削除の整合）はアプリ側でケアしてください。
- 画像メタデータは `metadata` に JSON 形式で保存すると柔軟です（例: {"width":1024,"height":768}).

---

## 活動種別マスター（m_activity_types）と紐付けテーブル
活動種別はマスターで管理し、`rel_activity_place_types` で場所と多対多に紐付けます。これにより日本語ラベルの管理、検索・集計、管理画面での編集が容易になります。

例: スキーマ
```sql
CREATE TABLE IF NOT EXISTS m_activity_types (
  type_code TEXT PRIMARY KEY,    -- コード例: 'street','leaflet','poster'
  label_ja TEXT NOT NULL,        -- 日本語表示名
  label_en TEXT,                 -- 英語表示名（任意）
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
```

初期データ（例）:
```sql
INSERT OR IGNORE INTO m_activity_types(type_code,label_ja,sort_order,is_active) VALUES
  ('street','街宣',10,1),
  ('leaflet','チラシ配り',20,1),
  ('poster','ポスター掲示',30,1),
  ('stall','街頭ブース',40,1);
```

運用上の注意:
- フロントでは管理 API から `m_activity_types` の `label_ja` を取得してチェックボックスを表示します。送信は `type_code` 配列。
- 種別の追加・ラベル変更は管理画面で行い、`is_active` により一時非表示が可能です。
- 既存の `activity_places.activity_types`（JSON 文字列）がある場合は移行スクリプトで `rel_activity_place_types` にデータを移してください（アプリ側でパースして挿入する方法を推奨）。

