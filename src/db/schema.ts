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

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  communityId: text('community_id'),
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
export const oauthStates = sqliteTable('oauth_states', {
  state: text('state').primaryKey(),
  provider: text('provider').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text('expires_at').notNull(),
});

