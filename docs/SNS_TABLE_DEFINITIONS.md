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

備考:
- 外部キーは SQLite (D1) 上で参照制約として定義されていますが、D1 の設定や実行環境によっては制約が緩和されることがあります。運用環境ではマイグレーションの適用結果を必ず確認してください。
- カラムの JSON 型は `TEXT` で保持し、アプリ側でパース・検証します。
- `is_suspended`, `is_verified`, `is_private` 等の論理値は INTEGER(0/1) で表現しています。

ファイル保存先:
- [drizzle/20251222131500_sns_create_table.sql](drizzle/20251222131500_sns_create_table.sql)
