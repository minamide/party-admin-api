---

# COMBINED_DOCS — 統合ドキュメント

このファイルはプロジェクト内の主要ドキュメント（TABLE_DEFINITIONS.md, SNS_TABLE_DEFINITIONS.md, API_CENSUS_MESH.md, EMAIL_AUTH_TROUBLESHOOTING.md）を統合し、参照しやすく整理したものです。要点を先頭に置き、必要に応じて元ファイルを参照してください。

---

## 目次

- [テーブル定義 (TABLE_DEFINITIONS)](#table_definitions)
- [SNS スキーマ (SNS_TABLE_DEFINITIONS)](#sns_table_definitions)
- [Census Mesh API (API_CENSUS_MESH)](#api_census_mesh)
- [メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)](#email_auth_troubleshooting)

---

<a id="table_definitions"></a>
## テーブル定義 (TABLE_DEFINITIONS)

下記はローカルのマイグレーション（`migrations/`）を参照して抜粋した現行スキーマの要点です。完全な定義は各マイグレーションファイルを参照してください。

ソース（抜粋）:
- `migrations/20251222131500_sns_create_table.sql` — SNS 系テーブル
- `migrations/0001_add_activity_groups.sql` — 活動グループ関連
- `migrations/0003_email_verification.sql` — メール認証トークン
- `migrations/20251231000001_create_census_mesh_2020.sql` — Census Mesh テーブル

---

### 活動グループ関連（抜粋）
`migrations/0001_add_activity_groups.sql` に基づく主要テーブル:

```sql
CREATE TABLE IF NOT EXISTS t_activity_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color_code TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rel_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES t_activity_groups(id) ON DELETE CASCADE,
  volunteer_id TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rel_group_members_group_id ON rel_group_members(group_id);
```

### メール認証トークン（抜粋）
`migrations/0003_email_verification.sql` に基づく:

```sql
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
```

### Census Mesh 2020（抜粋）
`migrations/20251231000001_create_census_mesh_2020.sql` に基づく主なカラム:

```sql
CREATE TABLE census_mesh_2020 (
  key_code TEXT PRIMARY KEY,
  htk_syori INTEGER,
  htk_saki TEXT,
  gassan TEXT,
  t001101001 INTEGER, -- 人口（総数）
  t001101002 INTEGER, -- 男
  t001101003 INTEGER, -- 女
  -- （他の人口・世帯指標カラムが続く）
  t001101034 INTEGER -- 世帯総数
);

#### D1 実DBのカラム一覧（`PRAGMA table_info(census_mesh_2020);` の出力）

下記はリモート D1 に対して `wrangler d1 execute ... --command "PRAGMA table_info(census_mesh_2020);" --remote --json` を実行して取得した実際のカラム情報です。

```
cid | name           | type    | notnull | dflt_value | pk
0   | key_code       | TEXT    | 0       | null       | 1
1   | htk_syori      | INTEGER | 0       | null       | 0
2   | htk_saki       | TEXT    | 0       | null       | 0
3   | gassan         | TEXT    | 0       | null       | 0
4   | t001101001     | INTEGER | 0       | null       | 0
5   | t001101002     | INTEGER | 0       | null       | 0
6   | t001101003     | INTEGER | 0       | null       | 0
7   | t001101004     | INTEGER | 0       | null       | 0
8   | t001101005     | INTEGER | 0       | null       | 0
9   | t001101006     | INTEGER | 0       | null       | 0
10  | t001101007     | INTEGER | 0       | null       | 0
11  | t001101008     | INTEGER | 0       | null       | 0
12  | t001101009     | INTEGER | 0       | null       | 0
13  | t001101010     | INTEGER | 0       | null       | 0
14  | t001101011     | INTEGER | 0       | null       | 0
15  | t001101012     | INTEGER | 0       | null       | 0
16  | t001101013     | INTEGER | 0       | null       | 0
17  | t001101014     | INTEGER | 0       | null       | 0
18  | t001101015     | INTEGER | 0       | null       | 0
19  | t001101016     | INTEGER | 0       | null       | 0
20  | t001101017     | INTEGER | 0       | null       | 0
21  | t001101018     | INTEGER | 0       | null       | 0
22  | t001101019     | INTEGER | 0       | null       | 0
23  | t001101020     | INTEGER | 0       | null       | 0
24  | t001101021     | INTEGER | 0       | null       | 0
25  | t001101022     | INTEGER | 0       | null       | 0
26  | t001101023     | INTEGER | 0       | null       | 0
27  | t001101024     | INTEGER | 0       | null       | 0
28  | t001101025     | INTEGER | 0       | null       | 0
29  | t001101026     | INTEGER | 0       | null       | 0
30  | t001101027     | INTEGER | 0       | null       | 0
31  | t001101028     | INTEGER | 0       | null       | 0
32  | t001101029     | INTEGER | 0       | null       | 0
33  | t001101030     | INTEGER | 0       | null       | 0
34  | t001101031     | INTEGER | 0       | null       | 0
35  | t001101032     | INTEGER | 0       | null       | 0
36  | t001101033     | INTEGER | 0       | null       | 0
37  | t001101034     | INTEGER | 0       | null       | 0
38  | t001101035     | INTEGER | 0       | null       | 0
39  | t001101036     | INTEGER | 0       | null       | 0
40  | t001101037     | INTEGER | 0       | null       | 0
41  | t001101038     | INTEGER | 0       | null       | 0
42  | t001101039     | INTEGER | 0       | null       | 0
43  | t001101040     | INTEGER | 0       | null       | 0
44  | t001101041     | INTEGER | 0       | null       | 0
45  | t001101042     | INTEGER | 0       | null       | 0
46  | t001101043     | INTEGER | 0       | null       | 0
47  | t001101044     | INTEGER | 0       | null       | 0
48  | t001101045     | INTEGER | 0       | null       | 0
49  | t001101046     | INTEGER | 0       | null       | 0
50  | t001101047     | INTEGER | 0       | null       | 0
51  | t001101048     | INTEGER | 0       | null       | 0
52  | t001101049     | INTEGER | 0       | null       | 0
53  | t001101050     | INTEGER | 0       | null       | 0
```
```

### SNS 系テーブル（抜粋）
`migrations/20251222131500_sns_create_table.sql` に定義された主要テーブルの要点:

- `users` — `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `email TEXT`, `handle TEXT UNIQUE NOT NULL`, `role TEXT DEFAULT 'user'`, `settings TEXT` (JSON as TEXT)、`pinned_post_id` は `posts(id)` 参照
- `posts` — `id TEXT PRIMARY KEY`, `author_id TEXT REFERENCES users(id) ON DELETE CASCADE`, `content TEXT`, `media TEXT`, `type TEXT DEFAULT 'text'`, `visibility TEXT DEFAULT 'public'`, `parent_id/root_id/reference_post_id` は自己参照
- 中間テーブル: `follows`, `likes`, `reposts`, `bookmarks`, `community_members` 等は複合PKで定義

インデックス例（抜粋）:
- `idx_users_handle` ON users(handle)
- `idx_posts_author_id_created_at` ON posts(author_id, created_at)

---

注記:
- このドキュメントはマイグレーション群をソースに更新しています。実際のデータベース状態（適用済みマイグレーションや D1 の制約挙動）を確認する場合は、D1 管理画面または `sqlite_master` 相当のクエリで実際のスキーマを検証してください。


<a id="sns_table_definitions"></a>
## SNS スキーマ (SNS_TABLE_DEFINITIONS)

対象ファイル: [drizzle/20251222131500_sns_create_table.sql](drizzle/20251222131500_sns_create_table.sql)

要点:

- 主なテーブル: `users`, `posts`, `communities`, `lists`, `conversations`, `messages`, `notifications`, `reports`, `hashtags`。
- 設計方針: JSON 系フィールドは `TEXT` に格納し、アプリ側でパースする。論理フラグは `INTEGER` (0/1)。
- 中間テーブルは複合PKで管理し、適宜インデックスを張る。

主要テーブルの抜粋:

- `users`
  - 主キー: `id` (TEXT)
  - 代表カラム: `name`, `email`, `handle` (UNIQUE), `role`, `photo_url`, `created_at`, `updated_at`, `settings` (JSON as TEXT)

- `posts`
  - 主キー: `id`
  - 代表カラム: `author_id` (FK -> users), `content`, `media` (JSON), `type`, `visibility`, `parent_id`, `root_id`, `created_at`, `likes_count`, `reposts_count`

- 中間テーブル例: `follows`, `likes`, `reposts`, `bookmarks`, `community_members`, `conversation_participants` など。

インデックス（主なもの）:

- `idx_users_handle` ON users(handle)
- `idx_posts_author_id_created_at` ON posts(author_id, created_at)
- `idx_posts_parent_id_created_at` ON posts(parent_id, created_at)

備考: 外部キー制約は D1 環境の設定に依存するため、マイグレーション適用後にスキーマを確認してください。

元ファイル全文: [docs/SNS_TABLE_DEFINITIONS.md](docs/SNS_TABLE_DEFINITIONS.md)（必要に応じて参照）

---

<a id="api_census_mesh"></a>
## Census Mesh API (API_CENSUS_MESH)

このセクションは国勢調査メッシュ（2020）を扱うAPIの仕様と使用例をまとめています。

エンドポイントの抜粋:

1) 単一メッシュ取得

```
GET /census-mesh/:keyCode
```

パスパラメータ:
- `keyCode` (string) — 標準地域メッシュコード (例: `623927591`)

レスポンス例 (JSON):

```json
{
  "keyCode": "623927591",
  "t001101001": 149,
  "t001101002": 59
}
```

2) 検索

```
GET /census-mesh?keyCodePrefix=6239&minPopulation=100&limit=50&offset=0
```

レスポンス例は配列形式で `data` と `meta` を返します。

詳細: [docs/API_CENSUS_MESH.md](docs/API_CENSUS_MESH.md)

---

<a id="email_auth_troubleshooting"></a>
## メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)

要点:

- よくある原因: 環境変数未設定、トークン未生成、`BASE_URL` の誤設定。
- 開発環境ではメールはコンソール出力されるためログ確認が有効。本番は Resend / MailGun 等を利用。

例: 開発環境の `wrangler.jsonc` vars 設定

```jsonc
"vars": {
  "NODE_ENV": "development",
  "BASE_URL": "http://localhost:3000",
  "FROM_EMAIL": "noreply@party-admin.local",
  "EMAIL_SERVICE": "development"
}
```

メール認証フローやデバッグ手順の詳細は元ファイル参照: [docs/EMAIL_AUTH_TROUBLESHOOTING.md](docs/EMAIL_AUTH_TROUBLESHOOTING.md)

---

## 変更履歴 / 注意点

- 不整合なコードフェンスを修正しました（JSON / bash / SQL のフェンスを明示）。
- 目次のアンカーをASCIIのIDで明示して、リンク切れを減らしています。

---

### D1 接続結果（wrangler による確認）

- 実行コマンド例:

  ```bash
  wrangler d1 execute DB --command "SELECT name FROM sqlite_master WHERE type='table' OR type='index';" --remote --json
  ```

- 接続方法: `wrangler` を用いてリモート D1（binding: `DB`, database_name: `party-admin-db`）へ接続して確認しました。
- 取得結果（抜粋）: `users`, `posts`, `communities`, `lists`, `conversations`, `messages`, `notifications`, `reports`, `hashtags`, `audit_logs`, `follows`, `likes`, `reposts`, `bookmarks`, `community_members`, `t_activity_groups`, `rel_group_members`, `activity_places`, `census_mesh_2020` などが存在します。
- 確認事項: `verification_tokens`（メール認証用テーブル）は現時点で存在しません（対応するマイグレーションは適用されていない可能性があります）。

---

### D1: 詳細テーブル定義（部分反映）

以下はリモート D1 に対して取得した `PRAGMA table_info(...)` の出力を整形したものです。必要に応じて他テーブルも同様に追記します。

#### `activity_place_photos`

```
cid | name       | type     | notnull | dflt_value       | pk
0   | id         | TEXT     | 1       | null             | 1
1   | place_id   | TEXT     | 1       | null             | 0
2   | url        | TEXT     | 1       | null             | 0
3   | filename   | TEXT     | 0       | null             | 0
4   | metadata   | TEXT     | 0       | null             | 0
5   | sort_order | INTEGER  | 1       | 0                | 0
6   | is_primary | INTEGER  | 1       | 0                | 0
7   | created_at | DATETIME | 1       | CURRENT_TIMESTAMP| 0
```

#### `activity_places`

```
cid | name            | type     | notnull | dflt_value       | pk
0   | id              | TEXT     | 1       | null             | 1
1   | name            | TEXT     | 1       | null             | 0
2   | address         | TEXT     | 0       | null             | 0
3   | city_code       | TEXT     | 0       | null             | 0
4   | latitude        | REAL     | 0       | null             | 0
5   | longitude       | REAL     | 0       | null             | 0
6   | location_geojson| TEXT     | 0       | null             | 0
7   | radius_m        | INTEGER  | 1       | 50               | 0
8   | capacity        | INTEGER  | 0       | null             | 0
9   | activity_types  | TEXT     | 0       | null             | 0
10  | notes           | TEXT     | 0       | null             | 0
11  | photo_count     | INTEGER  | 1       | 0                | 0
12  | is_active       | INTEGER  | 1       | 1                | 0
13  | created_by      | TEXT     | 0       | null             | 0
14  | created_at      | DATETIME | 1       | CURRENT_TIMESTAMP| 0
15  | updated_at      | DATETIME | 1       | CURRENT_TIMESTAMP| 0
```

#### `audit_logs`

```
cid | name       | type | notnull | dflt_value       | pk
0   | id         | TEXT | 0       | null             | 1
1   | action     | TEXT | 1       | null             | 0
2   | operator_id| TEXT | 1       | null             | 0
3   | target_id  | TEXT | 0       | null             | 0
4   | details    | TEXT | 0       | null             | 0
5   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `blocked_users`

```
cid | name       | type | notnull | dflt_value       | pk
0   | user_id    | TEXT | 1       | null             | 1
1   | target_id  | TEXT | 1       | null             | 2
2   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```


#### `bookmarks`

```
cid | name       | type | notnull | dflt_value       | pk
0   | user_id    | TEXT | 1       | null             | 1
1   | post_id    | TEXT | 1       | null             | 2
2   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `communities`

```
cid | name         | type    | notnull | dflt_value       | pk
0   | id           | TEXT    | 0       | null             | 1
1   | owner_id     | TEXT    | 0       | null             | 0
2   | name         | TEXT    | 1       | null             | 0
3   | description  | TEXT    | 0       | null             | 0
4   | icon_url     | TEXT    | 0       | null             | 0
5   | banner_url   | TEXT    | 0       | null             | 0
6   | member_count | INTEGER | 1       | 0                | 0
7   | created_at   | TEXT    | 1       | CURRENT_TIMESTAMP| 0
```

#### `community_members`

```
cid | name         | type | notnull | dflt_value       | pk
0   | user_id      | TEXT | 1       | null             | 1
1   | community_id | TEXT | 1       | null             | 2
2   | role         | TEXT | 1       | 'member'         | 0
3   | joined_at    | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `conversation_participants`

```
cid | name           | type | notnull | dflt_value       | pk
0   | conversation_id| TEXT | 1       | null             | 1
1   | user_id        | TEXT | 1       | null             | 2
2   | joined_at      | TEXT | 1       | CURRENT_TIMESTAMP| 0

```

#### `conversations`

```
cid | name          | type | notnull | dflt_value       | pk
0   | id            | TEXT | 0       | null             | 1
1   | group_name    | TEXT | 0       | null             | 0
2   | last_message_id| TEXT| 0       | null             | 0
3   | created_at    | TEXT | 1       | CURRENT_TIMESTAMP| 0
4   | updated_at    | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `d1_migrations`

```
cid | name      | type      | notnull | dflt_value       | pk
0   | id        | INTEGER   | 0       | null             | 1
1   | name      | TEXT      | 0       | null             | 0
2   | applied_at| TIMESTAMP | 1       | CURRENT_TIMESTAMP| 0
```

#### `drafts`

```
cid | name       | type | notnull | dflt_value       | pk
0   | id         | TEXT | 0       | null             | 1
1   | user_id    | TEXT | 1       | null             | 0
2   | content    | TEXT | 0       | null             | 0
3   | updated_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `event_attendances`

```
cid | name       | type | notnull | dflt_value       | pk
0   | event_id   | TEXT | 1       | null             | 1
1   | user_id    | TEXT | 1       | null             | 2
2   | status     | TEXT | 1       | 'going'          | 0
3   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
4   | updated_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `follows`

```
cid | name         | type | notnull | dflt_value       | pk
0   | follower_id  | TEXT | 1       | null             | 1
1   | following_id | TEXT | 1       | null             | 2
2   | created_at   | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

(#### `hashtags`

```
cid | name           | type    | notnull | dflt_value       | pk
0   | tag            | TEXT    | 0       | null             | 1
1   | count          | INTEGER | 1       | 1                | 0
2   | last_posted_at | TEXT    | 1       | CURRENT_TIMESTAMP| 0
```

#### `likes`

```
cid | name       | type | notnull | dflt_value       | pk
0   | user_id    | TEXT | 1       | null             | 1
1   | post_id    | TEXT | 1       | null             | 2
2   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `list_members`

```
cid | name     | type | notnull | dflt_value       | pk
0   | list_id  | TEXT | 1       | null             | 1
1   | user_id  | TEXT | 1       | null             | 2
2   | added_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `list_subscribers`

```
cid | name          | type | notnull | dflt_value       | pk
0   | list_id       | TEXT | 1       | null             | 1
1   | user_id       | TEXT | 1       | null             | 2
2   | subscribed_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `lists`, `m_activity_types`, `m_branches`, `m_cities`

```
-- `lists` (抜粋)
cid | name            | type    | notnull | dflt_value       | pk
0   | id              | TEXT    | 0       | null             | 1
1   | owner_id        | TEXT    | 1       | null             | 0
2   | name            | TEXT    | 1       | null             | 0
3   | description     | TEXT    | 0       | null             | 0
4   | is_private      | INTEGER | 1       | 0                | 0
5   | member_count    | INTEGER | 1       | 0                | 0
6   | subscriber_count| INTEGER | 1       | 0                | 0
7   | created_at      | TEXT    | 1       | CURRENT_TIMESTAMP| 0

-- `m_activity_types` (抜粋)
cid | name      | type    | notnull | dflt_value       | pk
0   | type_code | TEXT    | 0       | null             | 1
1   | label_ja  | TEXT    | 1       | null             | 0
2   | label_en  | TEXT    | 0       | null             | 0
3   | sort_order| INTEGER | 0       | 100              | 0
4   | is_active | INTEGER | 1       | 1                | 0

-- `m_branches` (抜粋)
cid | name      | type     | notnull | dflt_value       | pk
0   | id        | TEXT     | 1       | null             | 1
1   | name      | TEXT     | 1       | null             | 0
2   | party_id  | INTEGER  | 0       | null             | 0
3   | address   | TEXT     | 0       | null             | 0
4   | location  | TEXT     | 0       | null             | 0
5   | phone_number| TEXT   | 0       | null             | 0
6   | notes     | TEXT     | 0       | null             | 0
7   | created_at| DATETIME | 0       | CURRENT_TIMESTAMP| 0

-- `m_cities` (抜粋)
cid | name       | type | notnull | dflt_value       | pk
0   | city_code  | TEXT | 1       | null             | 1
1   | pref_code  | TEXT | 1       | null             | 0
2   | city_name  | TEXT | 1       | null             | 0
3   | city_kana  | TEXT | 0       | null             | 0
4   | latitude   | REAL | 0       | null             | 0
5   | longitude  | REAL | 0       | null             | 0
```

#### `report_details`

```
cid | name       | type | notnull | dflt_value       | pk
0   | id         | TEXT | 0       | null             | 1
1   | report_id  | TEXT | 1       | null             | 0
2   | actor_id   | TEXT | 0       | null             | 0
3   | comment    | TEXT | 0       | null             | 0
4   | action     | TEXT | 0       | null             | 0
5   | created_at | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `reports`

```
cid | name        | type | notnull | dflt_value       | pk
0   | id          | TEXT | 0       | null             | 1
1   | reporter_id | TEXT | 1       | null             | 0
2   | target_id   | TEXT | 1       | null             | 0
3   | reason      | TEXT | 1       | null             | 0
4   | status      | TEXT | 1       | 'pending'        | 0
5   | created_at  | TEXT | 1       | CURRENT_TIMESTAMP| 0
```

#### `reposts`, `social_accounts`, `t_activities`（抜粋）

```
-- `rel_activity_place_types` (例)
cid | name     | type | notnull | dflt_value | pk
0   | place_id | TEXT | 1       | null       | 1
1   | type_code| TEXT | 1       | null       | 2

-- `rel_city_districts` (例)
cid | name     | type | notnull | dflt_value | pk
0   | city_code| TEXT | 1       | null       | 1
1   | district | TEXT | 1       | null       | 2

-- `rel_group_members` (実DB)
cid | name       | type    | notnull | dflt_value       | pk
0   | id         | INTEGER | 1       | null             | 1
1   | group_id   | TEXT    | 1       | null             | 0
2   | volunteer_id| TEXT   | 1       | null             | 0
3   | role       | TEXT    | 0       | null             | 0
```

(追記: 他テーブルの PRAGMA も順次取得してこのセクションに追加します)

(このファイルに更に全文を埋め込むことも可能ですが、可読性のため要約＋元ファイルリンクの構成にしています）


### 1. 特定メッシュコードのデータ取得

```
GET /census-mesh/:keyCode
```

指定したメッシュコードの国勢調査データを取得します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード（例: `623927591`）

**レスポンス例:**
```json
# ドキュメントまとめ (COMBINED_DOCS)

このファイルはプロジェクト内の主要ドキュメントを見やすくまとめた統合版です。各セクションに要点を置き、必要に応じて元ファイル全文を参照できる構成にしています。

## 目次

- [テーブル定義 (TABLE_DEFINITIONS)](#テーブル定義-table_definitions)
- [SNS スキーマ (SNS_TABLE_DEFINITIONS)](#sns-スキーマ-sns_table_definitions)
- [Census Mesh API (API_CENSUS_MESH)](#census-mesh-api-api_census_mesh)
- [メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)](#メール認証トラブルシューティング-email_auth_troubleshooting)

---

## テーブル定義 (TABLE_DEFINITIONS)

要点:

- 目的: マイグレーションに含まれる主要テーブルの説明、主キー、主なカラム、外部キー、用途の要約
- 重要テーブル例: `m_proportional_blocks`, `m_prefectures`, `m_cities`, `m_towns`, `m_parties`, `t_elections`, `t_activities`, `t_poster_boards` など

元ファイル（要約および全文を必要に応じて参照）

---

## SNS スキーマ (SNS_TABLE_DEFINITIONS)

要点:

- `users`, `posts`, `communities`, `lists`, `conversations`, `messages`, `notifications`, `reports`, `hashtags` 等を含む
- JSON 系のフィールドは `TEXT` として保存し、アプリ側でパースする設計
- 中間テーブルは複合PKで管理し、インデックスでパフォーマンスを補助

元ファイル: SNS_TABLE_DEFINITIONS.md — 以下、原文をそのまま掲載します。

```
# テーブル定義書 — SNS スキーマ

対象ファイル: [drizzle/20251222131500_sns_create_table.sql](drizzle/20251222131500_sns_create_table.sql)

概要: Cloudflare D1 (SQLite互換) 用に定義された SNS 系テーブル群の一覧とカラム定義。NULL許容、デフォルト、外部キー、主キー、インデックス等をまとめる。

---

## users
- 説明: ユーザーアカウント情報
- 主キー: `id`
- カラム:
  - `id` TEXT PRIMARY KEY — ユーザーID (例: Firebase UID)
  - `name` TEXT NOT NULL — 表示名
  - `email` TEXT — メールアドレス
  - `handle` TEXT UNIQUE NOT NULL — ハンドル名
  - `role` TEXT NOT NULL DEFAULT 'user' — system_role
  - `bio` TEXT
  - `location` TEXT
  - `location_geom` TEXT
  - `website` TEXT
  - `photo_url` TEXT
  - `banner_url` TEXT
  - `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `pinned_post_id` TEXT — FK -> `posts(id)` ON DELETE SET NULL
  - `following_count` INTEGER NOT NULL DEFAULT 0
  - `followers_count` INTEGER NOT NULL DEFAULT 0
  - `posts_count` INTEGER NOT NULL DEFAULT 0
  - `is_suspended` INTEGER NOT NULL DEFAULT 0
  - `is_verified` INTEGER NOT NULL DEFAULT 0
  - `settings` TEXT — JSON

## posts
- 説明: 投稿（テキスト、リポスト、イベント等）
- 主キー: `id`
- カラム:
  - `id` TEXT PRIMARY KEY
  - `author_id` TEXT NOT NULL — FK -> `users(id)` ON DELETE CASCADE
  - `community_id` TEXT — FK -> `communities(id)` ON DELETE SET NULL
  - `content` TEXT
  - `media` TEXT — JSON
  - `hashtags` TEXT — JSON array
  - `type` TEXT NOT NULL DEFAULT 'text'
  - `visibility` TEXT NOT NULL DEFAULT 'public'
  - `created_at`, `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `parent_id`, `root_id`, `reference_post_id` TEXT — self-references ON DELETE SET NULL
  - `event`, `poll` TEXT — JSON
  - `geo_location` TEXT
  - `likes_count`, `reposts_count`, `replies_count`, `views_count`, `attendees_count` INTEGER NOT NULL DEFAULT 0
  - `author_info` TEXT — JSON

## communities
- 説明: コミュニティ／グループ
- 主キー: `id`
- カラム: `id`, `owner_id` FK->`users(id)` ON DELETE SET NULL, `name` UNIQUE NOT NULL, `description`, `icon_url`, `banner_url`, `member_count` INTEGER DEFAULT 0, `created_at`

## lists
- 説明: ユーザーリスト（例: リスト機能）
- 主キー: `id`
- カラム: `id`, `owner_id` FK->`users(id)` ON DELETE CASCADE, `name` NOT NULL, `description`, `is_private` INTEGER DEFAULT 0, カウント系、`created_at`

## conversations
- 説明: メッセージング用の会話スレッド
- 主キー: `id`
- カラム: `id`, `group_name`, `last_message_id`, `created_at`, `updated_at`

## messages
- 説明: 会話内メッセージ
- 主キー: `id`
- カラム: `id`, `conversation_id` NOT NULL FK->`conversations(id)` ON DELETE CASCADE, `sender_id` FK->`users(id)` ON DELETE SET NULL, `content` NOT NULL, `media` JSON, `reply_to_id` FK->`messages(id)`, `reactions` JSON, `created_at`

## notifications
- 説明: 通知レコード
- 主キー: `id`
- カラム: `id`, `recipient_id` NOT NULL FK->`users(id)` ON DELETE CASCADE, `type` NOT NULL, `actor_ids` TEXT (JSON array), `resource_id`, `content_preview`, `is_read` INTEGER DEFAULT 0, `created_at`, `updated_at`

## reports
- 説明: 通報データ
- 主キー: `id`
- カラム: `id`, `reporter_id` NOT NULL FK->`users(id)` ON DELETE CASCADE, `target_id` NOT NULL, `reason` NOT NULL, `status` TEXT DEFAULT 'pending', `created_at`

## hashtags
- 主キー: `tag` TEXT
- カラム: `tag`, `count` INTEGER DEFAULT 1, `last_posted_at` TEXT DEFAULT CURRENT_TIMESTAMP

## audit_logs
- 主キー: `id`
- カラム: `id`, `action` NOT NULL, `operator_id` NOT NULL FK->`users(id)`, `target_id`, `details` JSON, `created_at`

## 中間（関連）テーブル
- follows (PK: follower_id, following_id) — FK -> `users(id)` x2
- likes (PK: user_id, post_id) — FK -> `users(id)`, `posts(id)`
- reposts (PK: user_id, post_id)
- bookmarks (PK: user_id, post_id)
- community_members (PK: user_id, community_id) — role, joined_at
- list_members (PK: list_id, user_id)
- list_subscribers (PK: list_id, user_id)
- conversation_participants (PK: conversation_id, user_id)
- muted_users (PK: user_id, target_id)
- blocked_users (PK: user_id, target_id)
- poll_votes (PK: user_id, post_id) — `option_index` INTEGER
- event_attendances (PK: event_id, user_id) — `status`, `created_at`, `updated_at`

## 補助テーブル
- drafts — `id` PK, `user_id` FK->users, `content`, `updated_at`
- user_settings — `user_id` PK FK->users, `preferences` JSON, `notifications` JSON, `updated_at`
- report_details — `id` PK, `report_id` FK->reports, `actor_id` FK->users, `comment`, `action`, `created_at`
- post_attachments — `id` PK, `post_id` FK->posts, `media_url` NOT NULL, `type` NOT NULL, `width`, `height`, `metadata` JSON, `created_at`
- post_media_versions — `id` PK, `post_id` FK->posts, `version_name`, `url`, `metadata`, `created_at`

## インデックス（主なもの）
- `idx_users_handle` ON users(handle)
- `idx_posts_author_id_created_at` ON posts(author_id, created_at)
- `idx_posts_parent_id_created_at` ON posts(parent_id, created_at)
- `idx_posts_root_id_created_at` ON posts(root_id, created_at)
- `idx_posts_community_id_created_at` ON posts(community_id, created_at)
- `idx_posts_type_created_at` ON posts(type, created_at)
- `idx_notifications_recipient_id_created_at` ON notifications(recipient_id, created_at)
- その他: hashtags, audit_logs, reports, bookmarks, user_settings, report_details, post_attachments, post_media_versions, event_attendances のインデックスが定義されています。

---

## Census Mesh API (API_CENSUS_MESH)

要点:

- 国勢調査メッシュデータ（2020年）を操作するためのエンドポイント群
- 前方一致検索や集計、整形された人口統計の取得をサポート

元ファイル: API_CENSUS_MESH.md — 以下、原文をそのまま掲載します。

```
# Census Mesh 2020 API

国勢調査メッシュデータ（2020年）を操作するためのAPIエンドポイント群です。

## エンドポイント一覧

### 1. 特定メッシュコードのデータ取得

```
GET /census-mesh/:keyCode
```

指定したメッシュコードの国勢調査データを取得します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード（例: `623927591`）

**レスポンス例:**
```json
{
  "keyCode": "623927591",
  "htkSyori": 0,
  "htkSaki": null,
  "gassan": null,
  "t001101001": 149,
  "t001101002": 59,
  "t001101003": 90,
  "t001101034": 84,
  ...
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

### 2. メッシュデータの検索

```
GET /census-mesh
```

クエリパラメータで条件を指定してメッシュデータを検索します。

**クエリパラメータ:**
- `keyCodePrefix` (string, optional): メッシュコードの前方一致検索（例: `6239`）
- `minPopulation` (number, optional): 最小人口
- `maxPopulation` (number, optional): 最大人口
- `minHouseholds` (number, optional): 最小世帯数
- `maxHouseholds` (number, optional): 最大世帯数
- `limit` (number, optional): 取得件数上限（デフォルト: 100, 最大: 1000）
- `offset` (number, optional): オフセット（ページネーション用）

**リクエスト例:**
```
GET /census-mesh?keyCodePrefix=6239&minPopulation=100&limit=50&offset=0
```

**レスポンス例:**
```json
{
  "data": [
    {
      "keyCode": "623927591",
      "t001101001": 149,
      ...
    },
    {
      "keyCode": "623927592",
      "t001101001": 194,
      ...
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "count": 2
  }
}
```

**ステータスコード:**
- `200`: 成功
- `500`: サーバーエラー

---

### 3. メッシュコード前綴の集計データ取得

```
GET /census-mesh/summary/:keyCodePrefix
```

特定のメッシュコード前綴（都道府県や市区町村レベル）の集計データを取得します。

**パスパラメータ:**
- `keyCodePrefix` (string): メッシュコードの前綴（例: `6239` で東京都内の一部）

**レスポンス例:**
```json
{
  "keyCodePrefix": "6239",
  "summary": {
    "totalPopulation": 1000,
    "totalHouseholds": 450,
    "totalMale": 480,
    "totalFemale": 520,
    "totalAge0to14": 150,
    "totalAge15to64": 650,
    "totalAge65Plus": 200,
    "totalAge75Plus": 80,
    "totalForeigners": 30,
    "meshCount": 10
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: 該当するメッシュデータが見つからない
- `500`: サーバーエラー

---

### 4. 人口統計詳細（整形版）

```
GET /census-mesh/statistics/demographics/:keyCode
```

特定メッシュの詳細な人口統計情報を整形して返します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード

**レスポンス例:**
```json
{
  "keyCode": "623927591",
  "population": {
    "total": 149,
    "male": 59,
    "female": 90
  },
  "ageGroups": {
    "age0to14": {
      "total": 10,
      "male": 5,
      "female": 5
    },
    "age15to64": {
      "total": 100,
      "male": 40,
      "female": 60
    },
    "age65Plus": {
      "total": 39,
      "male": 14,
      "female": 25
    },
    "age75Plus": {
      "total": 15,
      "male": 6,
      "female": 9
    }
  },
  "foreigners": {
    "total": 5,
    "male": 2,
    "female": 3
  },
  "households": {
    "total": 84,
    "general": 84,
    "singlePerson": 40,
    "twoPerson": 31,
    "threePerson": 7,
    "fourPerson": 4,
    "fivePerson": 2,
    "sixPerson": 0,
    "sevenPlusPersons": 0,
    "nuclear": 38,
    "elderly": 14
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

## データ項目の説明

（中略 — 元ファイル参照）

---

## メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)

要点:

- よくある原因: 環境変数未設定、トークン未生成、`BASE_URL` の誤設定
- 開発環境ではメールはコンソールに出力されるためログを確認
- 本番では Resend / MailGun 等の外部サービスを利用

元ファイル: EMAIL_AUTH_TROUBLESHOOTING.md — 以下、原文をそのまま掲載します。

```
# メール認証トラブルシューティング ガイド

## メール認証が失敗する原因と解決策

### 原因1: 環境変数が設定されていない

**症状:**
- メール送信が失敗する
- エラーメッセージ: "No email service configured"

**解決策:**

`wrangler.jsonc` に以下の環境変数を設定してください:

```jsonc
"vars": {
  "NODE_ENV": "development",
  "BASE_URL": "http://localhost:3000",  // フロントエンドのURL
  "FROM_EMAIL": "noreply@party-admin.local",
  "EMAIL_SERVICE": "development"  // 開発環境ではdevelopmentを指定
}
```

### 原因2: メール認証トークンが生成されていない

**症状:**
- ユーザー登録成功時にメール認証URLが返されない
- データベースにトークンレコードがない

**確認方法:**

1. サーバーログを確認して、以下のメッセージを探してください:
   ```
   🔐 Verification Token Created:
     Token: <token_value>
     Full URL: http://localhost:3000/auth/verify-email?token=<token_value>
   ```

2. ログに上記が表示されない場合、`src/routes/auth.ts` の署名登録エンドポイントで
   トークン生成が失敗している可能性があります。

### 原因3: BASE_URLが正しく設定されていない

**症状:**
- メール認証リンクが正しいドメインを指していない
- クリックしても「ページが見つかりません」エラーになる

**解決策:**

開発環境での場合:
```jsonc
"BASE_URL": "http://localhost:3000"  // x_mockupプロジェクトのURL
```

本番環境での場合:
```jsonc
"BASE_URL": "https://yourdomain.com"  // 実際のドメイン
```

## メール認証フロー の全体像

### ステップ 1: ユーザー登録

```bash
POST /auth/signup
Content-Type: application/json

{
  "name": "ユーザー名",
  "email": "user@example.com",
  "handle": "handle123",
  "password": "Password123!"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "handle": "handle123",
      "isVerified": false
    },
    "token": "jwt_token"
  }
}
```

**内部処理:**
1. ユーザーをデータベースに保存（`isVerified: 0`）
2. メール認証トークンを生成
3. メール認証URLを作成
4. メールを送信（開発環境ではコンソール出力）

**開発環境でのメール確認:**
- `npm run dev` で実行中に、ターミナルを確認
- 次のようなメッセージが表示されます:
  ```
  📧 [DEVELOPMENT MODE] Email would be sent:
  From: noreply@party-admin.local
  To: user@example.com
  Subject: アカウント登録完了 - メール認証をお願いします
  ---
  TEXT VERSION:
  [メールテキスト内容]
  ---
  HTML VERSION:
  [メールHTML内容]
  ```

### ステップ 2: メール認証トークンの検証

ユーザーがメール内のリンクをクリック:
```
http://localhost:3000/auth/verify-email?token=<token_value>
```

フロントエンドがバックエンドの認証エンドポイントを呼び出し:
```bash
POST /auth/verify-email
Content-Type: application/json

{
  "token": "<verification_token>"
}
```

**レスポンス (成功):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "isVerified": true
    },
    "token": "new_jwt_token"
  }
}
```

**内部処理:**
1. トークンの有効性を検証（期限切れ、使用済みなど）
2. ユーザーの `isVerified` を 1 に更新
3. トークンを使用済みとしてマーク
4. 新しい JWT を生成して返す

## デバッグ方法

### 1. メール送信がスキップされていないか確認

ログで以下を探してください:
```
❌ Email sending failed: ...
```

### 2. トークンが正しく生成されているか確認

ログで以下を探してください:
```
🔐 Verification Token Created:
  Token: [64文字のランダム文字列]
```

### 3. データベースでトークンを確認

D1 データベースで `verificationTokens` テーブルをクエリ:
```sql
SELECT * FROM verificationTokens WHERE userId = '<user-id>';
```

出力:
- `token`: ランダムトークン値
- `type`: `email_verification`
- `expiresAt`: ISO 形式の時刻（現在から24時間後）
- `usedAt`: `NULL`（未使用）

### 4. ユーザー登録後の状態を確認

```sql
SELECT id, email, isVerified, createdAt FROM users WHERE email = 'user@example.com';
```

- `isVerified`: 0（未検証）→ メール認証後 → 1（検証済み）

## テストコマンド

### テスト1: ユーザー登録

```bash
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "handle": "testuser",
    "password": "TestPass123!"
  }'
```

ターミナルに表示されるトークンを確認します。

### テスト2: メール認証

```bash
curl -X POST http://localhost:8787/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-step1>"
  }'
```

## 本番環境での設定

本番環境では、実際のメールサービスを使用してください。

### Resend を使用する場合

1. [Resend](https://resend.com) でアカウント作成
2. API キーを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "resend",
  "RESEND_API_KEY": "re_xxxxxx"  // 環境変数として定義
}
```

### MailGun を使用する場合

1. [MailGun](https://www.mailgun.com) でアカウント作成
2. API キーとドメインを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "mailgun",
  "MAILGUN_API_KEY": "key-xxxxxx",
  "MAILGUN_DOMAIN": "mg.yourdomain.com"
}
```

## その他の注意事項

- トークンは24時間で有効期限切れ
- 同じユーザーに対して新しいトークンを生成すると、古いトークンは削除される
- `/resend-verification` エンドポイントで認証メールを再送信可能
- メール認証完了後、ユーザーは認証済みユーザーとしてアクセス可能
```

---

### 補足と運用メモ

- 各元ファイルは `docs/` に保存されています。詳細が必要な場合は元ファイルをそのまま参照できます。
- 追加提案: ER図の追加、マイグレーション差分チェックスクリプトの作成を検討してください。

---

（編集: 余分な単語やコードフェンスの不整合を削除し、目次と見出しを整理しました）

  "gassan": null,
  "t001101001": 149,
  "t001101002": 59,
  "t001101003": 90,
  "t001101034": 84,
  ...
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

### 2. メッシュデータの検索

```
GET /census-mesh
```

クエリパラメータで条件を指定してメッシュデータを検索します。

**クエリパラメータ:**
- `keyCodePrefix` (string, optional): メッシュコードの前方一致検索（例: `6239`）
- `minPopulation` (number, optional): 最小人口
- `maxPopulation` (number, optional): 最大人口
- `minHouseholds` (number, optional): 最小世帯数
- `maxHouseholds` (number, optional): 最大世帯数
- `limit` (number, optional): 取得件数上限（デフォルト: 100, 最大: 1000）
- `offset` (number, optional): オフセット（ページネーション用）

**リクエスト例:**
```
GET /census-mesh?keyCodePrefix=6239&minPopulation=100&limit=50&offset=0
```

**レスポンス例:**
```json
{
  "data": [
    {
      "keyCode": "623927591",
      "t001101001": 149,
      ...
    },
    {
      "keyCode": "623927592",
      "t001101001": 194,
      ...
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "count": 2
  }
}
```

**ステータスコード:**
- `200`: 成功
- `500`: サーバーエラー

---

### 3. メッシュコード前綴の集計データ取得

```
GET /census-mesh/summary/:keyCodePrefix
```

特定のメッシュコード前綴（都道府県や市区町村レベル）の集計データを取得します。

**パスパラメータ:**
- `keyCodePrefix` (string): メッシュコードの前綴（例: `6239` で東京都内の一部）

**レスポンス例:**
```json
{
  "keyCodePrefix": "6239",
  "summary": {
    "totalPopulation": 1000,
    "totalHouseholds": 450,
    "totalMale": 480,
    "totalFemale": 520,
    "totalAge0to14": 150,
    "totalAge15to64": 650,
    "totalAge65Plus": 200,
    "totalAge75Plus": 80,
    "totalForeigners": 30,
    "meshCount": 10
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: 該当するメッシュデータが見つからない
- `500`: サーバーエラー

---

### 4. 人口統計詳細（整形版）

```
GET /census-mesh/statistics/demographics/:keyCode
```

特定メッシュの詳細な人口統計情報を整形して返します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード

**レスポンス例:**
```json
{
  "keyCode": "623927591",
  "population": {
    "total": 149,
    "male": 59,
    "female": 90
  },
  "ageGroups": {
    "age0to14": {
      "total": 10,
      "male": 5,
      "female": 5
    },
    "age15to64": {
      "total": 100,
      "male": 40,
      "female": 60
    },
    "age65Plus": {
      "total": 39,
      "male": 14,
      "female": 25
    },
    "age75Plus": {
      "total": 15,
      "male": 6,
      "female": 9
    }
  },
  "foreigners": {
    "total": 5,
    "male": 2,
    "female": 3
  },
  "households": {
    "total": 84,
    "general": 84,
    "singlePerson": 40,
    "twoPerson": 31,
    "threePerson": 7,
    "fourPerson": 4,
    "fivePerson": 2,
    "sixPerson": 0,
    "sevenPlusPersons": 0,
    "nuclear": 38,
    "elderly": 14
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

## データ項目の説明

### 秘匿処理関連
- `htkSyori`: 秘匿処理区分（0=なし, 1=秘匿あり, 2=合算先）
- `htkSaki`: 秘匿先メッシュコード
- `gassan`: 合算先メッシュコード（セミコロン区切り）

### 人口統計（t001101001 ~ t001101033）
- `t001101001-003`: 人口（総数/男/女）
- `t001101004-006`: 0～14歳人口
- `t001101007-009`: 15歳以上人口
- `t001101010-012`: 15～64歳人口
- `t001101013-015`: 18歳以上人口
- `t001101016-018`: 20歳以上人口
- `t001101019-021`: 65歳以上人口
- `t001101022-024`: 75歳以上人口
- `t001101025-027`: 85歳以上人口
- `t001101028-030`: 95歳以上人口
- `t001101031-033`: 外国人人口

### 世帯統計（t001101034 ~ t001101050）
- `t001101034`: 世帯総数
- `t001101035`: 一般世帯数
- `t001101036-042`: 世帯人員別（1人～7人以上）
- `t001101043`: 親族のみ世帯数
- `t001101044`: 核家族世帯数
- `t001101045`: 核家族以外世帯数
- `t001101046`: 6歳未満世帯員のいる世帯数
- `t001101047`: 65歳以上世帯員のいる世帯数
- `t001101048`: 世帯主20～29歳の1人世帯
- `t001101049`: 高齢単身世帯
- `t001101050`: 高齢夫婦世帯

---

## 使用例

### TypeScript/JavaScript

```typescript
// 特定メッシュのデータ取得
const response = await fetch('https://api.example.com/census-mesh/623927591');
const data = await response.json();
console.log(`人口: ${data.t001101001}, 世帯数: ${data.t001101034}`);

// 東京都内の人口100人以上のメッシュを検索
const searchResponse = await fetch(
  'https://api.example.com/census-mesh?keyCodePrefix=6239&minPopulation=100&limit=100'
);
const searchData = await searchResponse.json();
console.log(`検索結果: ${searchData.data.length}件`);

// 集計データ取得
const summaryResponse = await fetch('https://api.example.com/census-mesh/summary/6239');
const summaryData = await summaryResponse.json();
console.log(`合計人口: ${summaryData.summary.totalPopulation}`);

// 整形された人口統計データ取得
const demographicsResponse = await fetch(
  'https://api.example.com/census-mesh/statistics/demographics/623927591'
);
const demographics = await demographicsResponse.json();
console.log(`65歳以上人口: ${demographics.ageGroups.age65Plus.total}`);
```

---

## パフォーマンス考慮事項

1. **ページネーション**: 大量データを取得する際は`limit`と`offset`を使用してページング処理を実装してください。
2. **インデックス**: `key_code`はPRIMARY KEYとしてインデックスが設定されています。前方一致検索も効率的に動作します。
3. **集計クエリ**: `/summary`エンドポイントはSQLiteの集計関数を使用しており、大量のメッシュを含む前綴では処理時間がかかる場合があります。

---

## テスト

```bash
# テストの実行
npm run test src/routes/census_mesh.test.ts
```

---

## データソース

- 出典: [e-Stat 統計GIS](https://www.e-stat.go.jp/gis/statmap-search)
- 統計: 令和2年国勢調査（2020年）
- メッシュ: 標準地域メッシュ（500m, 1km）

---

## 参考リンク

- [標準地域メッシュについて](https://www.stat.go.jp/data/mesh/index.html)
- [国勢調査](https://www.stat.go.jp/data/kokusei/2020/)

````

---

## 元ファイル: EMAIL_AUTH_TROUBLESHOOTING.md — 全文

````markdown
# メール認証トラブルシューティング ガイド

## メール認証が失敗する原因と解決策

### 原因1: 環境変数が設定されていない

**症状:**
- メール送信が失敗する
- エラーメッセージ: "No email service configured"

**解決策:**

`wrangler.jsonc` に以下の環境変数を設定してください:

```jsonc
"vars": {
  "NODE_ENV": "development",
  "BASE_URL": "http://localhost:3000",  // フロントエンドのURL
  "FROM_EMAIL": "noreply@party-admin.local",
  "EMAIL_SERVICE": "development"  // 開発環境ではdevelopmentを指定
}
```

### 原因2: メール認証トークンが生成されていない

**症状:**
- ユーザー登録成功時にメール認証URLが返されない
- データベースにトークンレコードがない

**確認方法:**

1. サーバーログを確認して、以下のメッセージを探してください:
   ```
   🔐 Verification Token Created:
     Token: <token_value>
     Full URL: http://localhost:3000/auth/verify-email?token=<token_value>
   ```

2. ログに上記が表示されない場合、`src/routes/auth.ts` の署名登録エンドポイントで
   トークン生成が失敗している可能性があります。

### 原因3: BASE_URLが正しく設定されていない

**症状:**
- メール認証リンクが正しいドメインを指していない
- クリックしても「ページが見つかりません」エラーになる

**解決策:**

開発環境での場合:
```jsonc
"BASE_URL": "http://localhost:3000"  // x_mockupプロジェクトのURL
```

本番環境での場合:
```jsonc
"BASE_URL": "https://yourdomain.com"  // 実際のドメイン
```

## メール認証フロー の全体像

### ステップ 1: ユーザー登録

```bash
POST /auth/signup
Content-Type: application/json

{
  "name": "ユーザー名",
  "email": "user@example.com",
  "handle": "handle123",
  "password": "Password123!"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "handle": "handle123",
      "isVerified": false
    },
    "token": "jwt_token"
  }
}
```

**内部処理:**
1. ユーザーをデータベースに保存（`isVerified: 0`）
2. メール認証トークンを生成
3. メール認証URLを作成
4. メールを送信（開発環境ではコンソール出力）

**開発環境でのメール確認:**
- `npm run dev` で実行中に、ターミナルを確認
- 次のようなメッセージが表示されます:
  ```
  📧 [DEVELOPMENT MODE] Email would be sent:
  From: noreply@party-admin.local
  To: user@example.com
  Subject: アカウント登録完了 - メール認証をお願いします
  ---
  TEXT VERSION:
  [メールテキスト内容]
  ---
  HTML VERSION:
  [メールHTML内容]
  ```

### ステップ 2: メール認証トークンの検証

ユーザーがメール内のリンクをクリック:
```
http://localhost:3000/auth/verify-email?token=<token_value>
```

フロントエンドがバックエンドの認証エンドポイントを呼び出し:
```bash
POST /auth/verify-email
Content-Type: application/json

{
  "token": "<verification_token>"
}
```

**レスポンス (成功):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "isVerified": true
    },
    "token": "new_jwt_token"
  }
}
```

**内部処理:**
1. トークンの有効性を検証（期限切れ、使用済みなど）
2. ユーザーの `isVerified` を 1 に更新
3. トークンを使用済みとしてマーク
4. 新しい JWT を生成して返す

## デバッグ方法

### 1. メール送信がスキップされていないか確認

ログで以下を探してください:
```
❌ Email sending failed: ...
```

### 2. トークンが正しく生成されているか確認

ログで以下を探してください:
```
🔐 Verification Token Created:
  Token: [64文字のランダム文字列]
```

### 3. データベースでトークンを確認

D1 データベースで `verificationTokens` テーブルをクエリ:
```sql
SELECT * FROM verificationTokens WHERE userId = '<user-id>';
```

出力:
- `token`: ランダムトークン値
- `type`: `email_verification`
- `expiresAt`: ISO 形式の時刻（現在から24時間後）
- `usedAt`: `NULL`（未使用）

### 4. ユーザー登録後の状態を確認

```sql
SELECT id, email, isVerified, createdAt FROM users WHERE email = 'user@example.com';
```

- `isVerified`: 0（未検証）→ メール認証後 → 1（検証済み）

## テストコマンド

### テスト1: ユーザー登録

```bash
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "handle": "testuser",
    "password": "TestPass123!"
  }'
```

ターミナルに表示されるトークンを確認します。

### テスト2: メール認証

```bash
curl -X POST http://localhost:8787/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-step1>"
  }'
```

## 本番環境での設定

本番環境では、実際のメールサービスを使用してください。

### Resend を使用する場合

1. [Resend](https://resend.com) でアカウント作成
2. API キーを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "resend",
  "RESEND_API_KEY": "re_xxxxxx"  // 環境変数として定義
}
```

### MailGun を使用する場合

1. [MailGun](https://www.mailgun.com) でアカウント作成
2. API キーとドメインを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "mailgun",
  "MAILGUN_API_KEY": "key-xxxxxx",
  "MAILGUN_DOMAIN": "mg.yourdomain.com"
}
```

## その他の注意事項

- トークンは24時間で有効期限切れ
- 同じユーザーに対して新しいトークンを生成すると、古いトークンは削除される
- `/resend-verification` エンドポイントで認証メールを再送信可能
- メール認証完了後、ユーザーは認証済みユーザーとしてアクセス可能

````
このファイルは `docs/` 内の主要ドキュメントをまとめ、参照しやすく整理したものです。

目次

- [テーブル定義 (TABLE_DEFINITIONS)](#テーブル定義-table_definitions)
- [SNS スキーマ (SNS_TABLE_DEFINITIONS)](#sns-スキーマ-sns_table_definitions)
- [Census Mesh API (API_CENSUS_MESH)](#census-mesh-api-api_census_mesh)
- [メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)](#メール認証トラブルシューティング-email_auth_troubleshooting)

---

## テーブル定義 (TABLE_DEFINITIONS)

以下は `TABLE_DEFINITIONS.md` の要点を整理した抜粋です。

- 目的: マイグレーションに含まれる主要テーブルの説明、主キー、主なカラム、外部キー、用途を短くまとめる。
- 重要テーブル:
  - `m_proportional_blocks`, `m_prefectures`, `m_cities`, `m_towns` — 地域マスタ系
  - `m_election_types`, `m_electoral_districts` — 選挙・選挙区関係
  - `m_parties`, `m_branches` — 政党・支部
  - `t_elections`, `t_activities`, `t_activity_groups`, `rel_group_members` — 活動・グループ管理
  - `m_poster_boards`, `t_poster_boards`, `t_board_reports` — ポスター掲示管理
  - `activity_places`, `activity_place_photos`, `m_activity_types`, `rel_activity_place_types` — 活動場所と写真・種別

詳しいカラム一覧や注意点は元ファイルにあります（補足: D1/SQLite の制約の挙動に注意）。

元ファイル: TABLE_DEFINITIONS.md（詳細な列挙、チェック制約、インデックス、運用上の注意を含む）

---

## SNS スキーマ (SNS_TABLE_DEFINITIONS)

要点:

- SNS 系スキーマは `users`, `posts`, `communities`, `lists`, `conversations`, `messages`, `notifications`, `reports`, `hashtags` などを含む。
- 主な設計思想:
  - ユーザー・投稿は UUID ベースの `id` を主キーとし、JSON 系フィールドは `TEXT` に格納してアプリ側でパースする。
  - 中間テーブル（follows, likes, reposts, bookmarks 等）は複合PKで表現し、パフォーマンス用にインデックスを整備。
  - 論理フラグは `INTEGER`（0/1）で表現。時刻は `TEXT`（ISO）や `CURRENT_TIMESTAMP` を利用。

元ファイル: SNS_TABLE_DEFINITIONS.md（各テーブルのカラムとインデックスの詳細、備考あり）

---

## Census Mesh API (API_CENSUS_MESH)

このセクションは API の利用方法とレスポンス例を含むドキュメントをそのまま要約しています。主要エンドポイント:

---

## 元ファイル: TABLE_DEFINITIONS.md — 全文

````markdown
````markdown
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
- 画像メタデータは `metadata` に JSON 形式で保存すると柔軟です（例: {"width":1024,"height":768}）。

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


````


- `GET /census-mesh/:keyCode` — 単一メッシュの取得（ステータス 200/404/500）
- `GET /census-mesh` — 検索（`keyCodePrefix`, `minPopulation` などのクエリ）
- `GET /census-mesh/summary/:keyCodePrefix` — 前綴による集計取得
- `GET /census-mesh/statistics/demographics/:keyCode` — 整形人口統計の取得

また、データ項目（`t001101001` 系、世帯統計など）の意味、パフォーマンスに関する注意（ページネーション、インデックス、集計コスト）、テストコマンド例が含まれます。

元ファイル: API_CENSUS_MESH.md（リクエスト/レスポンス例、注意点、テスト手順あり）

---

## メール認証トラブルシューティング (EMAIL_AUTH_TROUBLESHOOTING)

要点:

- よくある原因と対処:
  1. 環境変数が未設定 (`wrangler.jsonc` の `BASE_URL`, `FROM_EMAIL`, `EMAIL_SERVICE` など)
  2. 認証トークンが生成されていない（サーバーログを確認）
  3. `BASE_URL` のミス（開発環境と本番環境での違い）
- 開発向けの確認手順（ログ出力でメール内容を確認）、DB テーブル確認クエリ、テスト用 curl コマンド例を記載。
- 本番では `resend` や `mailgun` 等の外部メールサービスを利用する設定例を記載。

元ファイル: EMAIL_AUTH_TROUBLESHOOTING.md（フロー図、サンプルコマンド、環境設定例あり）

---

補足と運用メモ

- 参照元の各ファイルは `docs/` に保存されています。必要ならこのファイルから該当元のセクションへリンクを張っておきます。
- 追加希望:
  - 各テーブルの ER 図（簡易画像）を `docs/` に追加すると理解しやすくなります。
  - マイグレーションと現在の D1 スキーマ差分を自動チェックするスクリプトの追加（推奨）。

---


---

## 追加: x_mockup スキーマ（抜粋）

下記はワークスペース `x_mockup/database_schema.sql` からの抜粋です。Cloudflare D1 とは実装差分があり得るため、必要に応じて `PRAGMA table_info(...)` を取得して差分を確認してください。

```sql
-- sns.users（要点）
CREATE TABLE sns.users (
  id TEXT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  handle VARCHAR(15) UNIQUE NOT NULL,
  role public.system_role NOT NULL DEFAULT 'user',
  bio TEXT,
  location VARCHAR(100),
  location_geom GEOGRAPHY(Point, 4326),
  website TEXT,
  photo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pinned_post_id UUID,
  following_count INT NOT NULL DEFAULT 0,
  followers_count INT NOT NULL DEFAULT 0,
  posts_count INT NOT NULL DEFAULT 0,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB
);

-- sns.posts（要点）
CREATE TABLE sns.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id TEXT NOT NULL REFERENCES sns.users(id) ON DELETE CASCADE,
  community_id UUID,
  content TEXT,
  media JSONB,
  hashtags TEXT[],
  type public.post_type NOT NULL DEFAULT 'text',
  visibility public.post_visibility NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parent_id UUID REFERENCES sns.posts(id) ON DELETE SET NULL,
  root_id UUID REFERENCES sns.posts(id) ON DELETE SET NULL,
  reference_post_id UUID REFERENCES sns.posts(id) ON DELETE SET NULL,
  event JSONB,
  poll JSONB,
  geo_location GEOGRAPHY(Point, 4326),
  likes_count INT NOT NULL DEFAULT 0,
  reposts_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  attendees_count INT NOT NULL DEFAULT 0,
  author_info JSONB
);

-- インデックス（抜粋）
CREATE INDEX idx_users_handle ON sns.users (handle);
CREATE INDEX idx_posts_author_id_created_at ON sns.posts (author_id, created_at DESC);
CREATE INDEX idx_posts_parent_id_created_at ON sns.posts (parent_id, created_at ASC);

```

---

注: 上記は PostgreSQL/PostGIS 向けの設計要素（`GEOGRAPHY`, `JSONB`, `gen_random_uuid()` 等）を含みます。D1/SQLite 環境では型や関数に差分があるため、D1 側の `PRAGMA table_info(table);` 出力をこのドキュメントに追記して一貫性を保つことを推奨します。

---

## マイグレーション（D1 互換）抜粋

以下はリポジトリ内 `migrations/20251222131500_sns_create_table.sql`（D1/SQLite 互換版）からの主要抜粋です。テーブル定義と主要インデックスを示します。

```sql
-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  handle TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settings TEXT
);

-- posts
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 中間テーブル例: follows, likes, reposts, bookmarks
CREATE TABLE IF NOT EXISTS follows (...);

-- インデックス（抜粋）
CREATE INDEX IF NOT EXISTS idx_users_handle ON users (handle);
CREATE INDEX IF NOT EXISTS idx_posts_author_id_created_at ON posts (author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id_created_at ON posts (parent_id, created_at);
```

注: 上記は簡易抜粋です。完全な定義は `migrations/20251222131500_sns_create_table.sql` を参照してください。

---

## Census Mesh (2020) — マイグレーション抜粋

`migrations/20251231000001_create_census_mesh_2020.sql` からの抜粋:

```sql
CREATE TABLE census_mesh_2020 (
  key_code TEXT PRIMARY KEY,
  htk_syori INTEGER,
  htk_saki TEXT,
  gassan TEXT,
  t001101001 INTEGER,
  t001101002 INTEGER,
  t001101003 INTEGER,
  -- ...（人口・世帯指標が続く）
  t001101050 INTEGER
);
```

用途: 国勢調査メッシュデータ（人口・世帯指標）を格納します。API の検索／集計で利用します。

---

## 活動場所（activity_places） — マイグレーション抜粋

`migrations/20251230000001_create_activity_places.sql` からの抜粋:

```sql
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
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_place_photos (
  id TEXT NOT NULL PRIMARY KEY,
  place_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT,
  metadata TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_places_city_code ON activity_places(city_code);
CREATE INDEX IF NOT EXISTS idx_activity_places_latitude ON activity_places(latitude);
CREATE INDEX IF NOT EXISTS idx_activity_places_longitude ON activity_places(longitude);
CREATE INDEX IF NOT EXISTS idx_activity_place_photos_place_id ON activity_place_photos(place_id);

-- 活動種別マスター
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
  PRIMARY KEY (place_id, type_code)
);

```

注: 初期データや外部キー、インデックスの詳細は元マイグレーションを参照してください。

---

## 活動グループ（t_activity_groups / rel_group_members） — マイグレーション抜粋

`migrations/0001_add_activity_groups.sql` からの抜粋:

```sql
CREATE TABLE IF NOT EXISTS t_activity_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color_code TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rel_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rel_group_members_group_id ON rel_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_rel_group_members_volunteer_id ON rel_group_members(volunteer_id);
```

---

## OAuth / Social Accounts — マイグレーション抜粋

`migrations/0002_oauth_social_accounts.sql` からの抜粋:

```sql
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  avatar TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TEXT,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
```

注: 完全な定義は各マイグレーションファイルを参照してください。



````
