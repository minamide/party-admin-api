import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  handle: text('handle').notNull().unique(),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  role: text('role').notNull().default('user'),
  bio: text('bio'),
  location: text('location'),
  locationGeom: text('location_geom'),
  website: text('website'),
  photoUrl: text('photo_url'),
  bannerUrl: text('banner_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  pinnedPostId: text('pinned_post_id'),
  followingCount: integer('following_count').notNull().default(0),
  followersCount: integer('followers_count').notNull().default(0),
  postsCount: integer('posts_count').notNull().default(0),
  isSuspended: integer('is_suspended').notNull().default(0),
  isVerified: integer('is_verified').notNull().default(0),
  settings: text('settings'), // JSON
});

export const verificationTokens = sqliteTable('verification_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  type: text('type').notNull(), // 'email_verification', 'password_reset', etc.
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const oauthStates = sqliteTable('oauth_states', {
  state: text('state').primaryKey(),
  provider: text('provider').notNull(),
  redirectUri: text('redirect_uri'),
  expiresAt: text('expires_at').notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  communityId: text('community_id'),
  groupId: text('group_id'),
  content: text('content'),
  media: text('media'), // JSON
  hashtags: text('hashtags'), // JSON array
  type: text('type').notNull().default('text'),
  visibility: text('visibility').notNull().default('public'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  parentId: text('parent_id').references((): any => posts.id, { onDelete: 'set null' }),
  rootId: text('root_id').references((): any => posts.id, { onDelete: 'set null' }),
  referencePostId: text('reference_post_id').references((): any => posts.id, { onDelete: 'set null' }),
  event: text('event'), // JSON
  poll: text('poll'), // JSON
  geoLocation: text('geo_location'),
  likesCount: integer('likes_count').notNull().default(0),
  repostsCount: integer('reposts_count').notNull().default(0),
  repliesCount: integer('replies_count').notNull().default(0),
  viewsCount: integer('views_count').notNull().default(0),
  attendeesCount: integer('attendees_count').notNull().default(0),
  authorInfo: text('author_info'), // JSON
});

export const communities = sqliteTable('communities', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull().unique(),
  description: text('description'),
  iconUrl: text('icon_url'),
  bannerUrl: text('banner_url'),
  memberCount: integer('member_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isPrivate: integer('is_private').notNull().default(0),
  memberCount: integer('member_count').notNull().default(0),
  subscriberCount: integer('subscriber_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  groupName: text('group_name'),
  lastMessageId: text('last_message_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  media: text('media'), // JSON
  replyToId: text('reply_to_id').references((): any => messages.id, { onDelete: 'set null' }),
  reactions: text('reactions'), // JSON
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  actorIds: text('actor_ids').notNull(), // JSON array
  resourceId: text('resource_id'),
  contentPreview: text('content_preview'),
  isRead: integer('is_read').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const hashtags = sqliteTable('hashtags', {
  tag: text('tag').primaryKey(),
  count: integer('count').notNull().default(1),
  lastPostedAt: text('last_posted_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  operatorId: text('operator_id').notNull().references(() => users.id),
  targetId: text('target_id'),
  details: text('details'), // JSON
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const follows = sqliteTable('follows', {
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followingId] }),
}));

export const likes = sqliteTable('likes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const reposts = sqliteTable('reposts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const bookmarks = sqliteTable('bookmarks', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const communityMembers = sqliteTable('community_members', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  communityId: text('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  joinedAt: text('joined_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.communityId] }),
}));

export const listMembers = sqliteTable('list_members', {
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedAt: text('added_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.listId, table.userId] }),
}));

export const listSubscribers = sqliteTable('list_subscribers', {
  listId: text('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscribedAt: text('subscribed_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.listId, table.userId] }),
}));

export const conversationParticipants = sqliteTable('conversation_participants', {
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: text('joined_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] }),
}));

export const mutedUsers = sqliteTable('muted_users', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.targetId] }),
}));

export const blockedUsers = sqliteTable('blocked_users', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.targetId] }),
}));

export const pollVotes = sqliteTable('poll_votes', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  optionIndex: integer('option_index').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.postId] }),
}));

export const eventAttendances = sqliteTable('event_attendances', {
  eventId: text('event_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('going'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.userId] }),
}));

export const drafts = sqliteTable('drafts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  preferences: text('preferences'), // JSON
  notifications: text('notifications'), // JSON
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reportDetails = sqliteTable('report_details', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => users.id),
  comment: text('comment'),
  action: text('action'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const postAttachments = sqliteTable('post_attachments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url').notNull(),
  type: text('type').notNull(),
  width: integer('width'),
  height: integer('height'),
  metadata: text('metadata'), // JSON
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const postMediaVersions = sqliteTable('post_media_versions', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  versionName: text('version_name').notNull(),
  url: text('url').notNull(),
  metadata: text('metadata'), // JSON
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------
// 活動場所 (activity_places) / 写真 / 種別マスター
// ----------------------------------------
export const activityPlaces = sqliteTable('activity_places', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  cityCode: text('city_code'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  locationGeojson: text('location_geojson'),
  radiusM: integer('radius_m').notNull().default(50),
  capacity: integer('capacity'),
  activityTypes: text('activity_types'), // JSON array (legacy / optional)
  notes: text('notes'),
  photoCount: integer('photo_count').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------
// 活動グループ (t_activity_groups) / グループメンバー関連
// ----------------------------------------
export const activityGroups = sqliteTable('t_activity_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  prefecture: text('prefecture'),
  colorCode: text('color_code'),
  logoUrl: text('logo_url'),
});

export const relGroupMembers = sqliteTable('rel_group_members', {
  id: integer('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => activityGroups.id),
  volunteerId: text('volunteer_id').notNull(),
  role: text('role'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const activityPlacePhotos = sqliteTable('activity_place_photos', {
  id: text('id').primaryKey(),
  placeId: text('place_id').notNull().references(() => activityPlaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename'),
  metadata: text('metadata'), // JSON
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: integer('is_primary').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const mActivityTypes = sqliteTable('m_activity_types', {
  typeCode: text('type_code').primaryKey(),
  labelJa: text('label_ja').notNull(),
  labelEn: text('label_en'),
  sortOrder: integer('sort_order').notNull().default(100),
  isActive: integer('is_active').notNull().default(1),
});

export const relActivityPlaceTypes = sqliteTable('rel_activity_place_types', {
  placeId: text('place_id').notNull().references(() => activityPlaces.id, { onDelete: 'cascade' }),
  typeCode: text('type_code').notNull().references(() => mActivityTypes.typeCode, { onDelete: 'restrict' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.placeId, table.typeCode] }),
}));

/**
 * ソーシャルアカウント連携テーブル
 * ユーザーが複数のOAuthプロバイダーでアカウントを連携可能
 */
export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'google', 'github', 'x', 'line'
  providerUserId: text('provider_user_id').notNull(),
  email: text('email'),
  name: text('name'),
  avatar: text('avatar'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  linkedAt: text('linked_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * OAuth State テーブル
 * CSRF 攻撃対策用の state 検証
 */
// Already defined above - removed duplicate
// ----------------------------------------
// 地域メッシュ統計 (Mesh Statistics) キャッシュ
// ----------------------------------------
export const meshStatistics = sqliteTable('mesh_statistics', {
  meshCode: text('mesh_code').primaryKey(),
  households: integer('households'),
  population: integer('population'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ----------------------------------------
// 国勢調査メッシュデータ 2020 (Census Mesh 2020)
// ----------------------------------------
export const censusMesh2020 = sqliteTable('census_mesh_2020', {
  keyCode: text('key_code').primaryKey(),
  htkSyori: integer('htk_syori'),
  htkSaki: text('htk_saki'),
  gassan: text('gassan'),
  // 人口統計 (Population Statistics)
  t001101001: integer('t001101001'), // 人口（総数）
  t001101002: integer('t001101002'), // 人口（男）
  t001101003: integer('t001101003'), // 人口（女）
  t001101004: integer('t001101004'), // 0～14歳人口 総数
  t001101005: integer('t001101005'), // 0～14歳人口 男
  t001101006: integer('t001101006'), // 0～14歳人口 女
  t001101007: integer('t001101007'), // 15歳以上人口 総数
  t001101008: integer('t001101008'), // 15歳以上人口 男
  t001101009: integer('t001101009'), // 15歳以上人口 女
  t001101010: integer('t001101010'), // 15～64歳人口 総数
  t001101011: integer('t001101011'), // 15～64歳人口 男
  t001101012: integer('t001101012'), // 15～64歳人口 女
  t001101013: integer('t001101013'), // 18歳以上人口 総数
  t001101014: integer('t001101014'), // 18歳以上人口 男
  t001101015: integer('t001101015'), // 18歳以上人口 女
  t001101016: integer('t001101016'), // 20歳以上人口 総数
  t001101017: integer('t001101017'), // 20歳以上人口 男
  t001101018: integer('t001101018'), // 20歳以上人口 女
  t001101019: integer('t001101019'), // 65歳以上人口 総数
  t001101020: integer('t001101020'), // 65歳以上人口 男
  t001101021: integer('t001101021'), // 65歳以上人口 女
  t001101022: integer('t001101022'), // 75歳以上人口 総数
  t001101023: integer('t001101023'), // 75歳以上人口 男
  t001101024: integer('t001101024'), // 75歳以上人口 女
  t001101025: integer('t001101025'), // 85歳以上人口 総数
  t001101026: integer('t001101026'), // 85歳以上人口 男
  t001101027: integer('t001101027'), // 85歳以上人口 女
  t001101028: integer('t001101028'), // 95歳以上人口 総数
  t001101029: integer('t001101029'), // 95歳以上人口 男
  t001101030: integer('t001101030'), // 95歳以上人口 女
  t001101031: integer('t001101031'), // 外国人人口 総数
  t001101032: integer('t001101032'), // 外国人人口 男
  t001101033: integer('t001101033'), // 外国人人口 女
  // 世帯統計 (Household Statistics)
  t001101034: integer('t001101034'), // 世帯総数
  t001101035: integer('t001101035'), // 一般世帯数
  t001101036: integer('t001101036'), // 1人世帯数
  t001101037: integer('t001101037'), // 2人世帯数
  t001101038: integer('t001101038'), // 3人世帯数
  t001101039: integer('t001101039'), // 4人世帯数
  t001101040: integer('t001101040'), // 5人世帯数
  t001101041: integer('t001101041'), // 6人世帯数
  t001101042: integer('t001101042'), // 7人以上世帯数
  t001101043: integer('t001101043'), // 親族のみ世帯数
  t001101044: integer('t001101044'), // 核家族世帯数
  t001101045: integer('t001101045'), // 核家族以外世帯数
  t001101046: integer('t001101046'), // 6歳未満世帯員のいる世帯数
  t001101047: integer('t001101047'), // 65歳以上世帯員のいる世帯数
  t001101048: integer('t001101048'), // 世帯主20～29歳の1人世帯
  t001101049: integer('t001101049'), // 高齢単身世帯
  t001101050: integer('t001101050'), // 高齢夫婦世帯
});
