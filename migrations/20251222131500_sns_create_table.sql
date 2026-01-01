-- SQLite Schema for X-Mockup (Cloudflare D1 compatible)
-- スキーマ、ENUM、PostGIS、JSONB、配列型をSQLite互換に変換。

-- テーブル名: users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- ユーザーID (Firebase Auth UID)
    name TEXT NOT NULL, -- 表示名
    email TEXT, -- メールアドレス
    handle TEXT UNIQUE NOT NULL, -- ハンドル名
    role TEXT NOT NULL DEFAULT 'user', -- system_role: 'user', 'admin', 'moderator'
    bio TEXT, -- 自己紹介文
    location TEXT, -- 場所 (テキスト)
    location_geom TEXT, -- 場所 (地理座標・GeoJSON等)
    website TEXT, -- ウェブサイトURL
    photo_url TEXT, -- プロフィール画像URL
    banner_url TEXT, -- ヘッダー画像URL
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- アカウント作成日時
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- プロフィール更新日時
    pinned_post_id TEXT, -- プロフィールに固定した投稿のID (外部キー)
    following_count INTEGER NOT NULL DEFAULT 0,
    followers_count INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    is_suspended INTEGER NOT NULL DEFAULT 0, -- BOOLEAN (0 or 1)
    is_verified INTEGER NOT NULL DEFAULT 0, -- BOOLEAN (0 or 1)
    settings TEXT, -- JSON
    FOREIGN KEY (pinned_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

-- テーブル名: posts
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, -- UUID
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id TEXT, -- 外部キー
    content TEXT,
    media TEXT, -- JSON
    hashtags TEXT, -- JSON array
    type TEXT NOT NULL DEFAULT 'text', -- post_type: 'text', 'repost', 'quote', 'event', 'poll'
    visibility TEXT NOT NULL DEFAULT 'public', -- post_visibility
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parent_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
    root_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
    reference_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
    event TEXT, -- JSON
    poll TEXT, -- JSON
    geo_location TEXT, -- 地理座標
    likes_count INTEGER NOT NULL DEFAULT 0,
    reposts_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    attendees_count INTEGER NOT NULL DEFAULT 0,
    author_info TEXT, -- JSON
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL
);

-- テーブル名: communities
CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: lists
CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_private INTEGER NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 0,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    group_name TEXT,
    last_message_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    media TEXT, -- JSON
    reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
    reactions TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- notification_type
    actor_ids TEXT NOT NULL, -- JSON array
    resource_id TEXT,
    content_preview TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- report_status
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: hashtags
CREATE TABLE IF NOT EXISTS hashtags (
    tag TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    last_posted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブル名: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL, -- audit_action
    operator_id TEXT NOT NULL REFERENCES users(id),
    target_id TEXT,
    details TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 中間テーブル
CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS reposts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS community_members (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- community_role
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, community_id)
);

CREATE TABLE IF NOT EXISTS list_members (
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS list_subscribers (
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscribed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS muted_users (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS poll_votes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS event_attendances (
    event_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going', -- attendance_status
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences TEXT, -- JSON
    notifications TEXT, -- JSON
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_details (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id),
    comment TEXT,
    action TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_attachments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    type TEXT NOT NULL, -- media_type
    width INTEGER,
    height INTEGER,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_media_versions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    version_name TEXT NOT NULL,
    url TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス (SQLite標準形式)
CREATE INDEX IF NOT EXISTS idx_users_handle ON users (handle);
CREATE INDEX IF NOT EXISTS idx_posts_author_id_created_at ON posts (author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id_created_at ON posts (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_root_id_created_at ON posts (root_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_community_id_created_at ON posts (community_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_type_created_at ON posts (type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id_created_at ON notifications (recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hashtags_count ON hashtags (count);
CREATE INDEX IF NOT EXISTS idx_hashtags_last_posted_at ON hashtags (last_posted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id_created_at ON bookmarks (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings (updated_at);
CREATE INDEX IF NOT EXISTS idx_report_details_report_id ON report_details (report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments (post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_versions_post_id ON post_media_versions (post_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_user_status ON event_attendances (user_id, status);
CREATE INDEX IF NOT EXISTS idx_event_attendances_event_id ON event_attendances (event_id);