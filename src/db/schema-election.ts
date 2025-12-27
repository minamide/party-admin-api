import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 選挙管理スキーマ用テーブル定義
 * SQLiteベースのDrizzleスキーマ
 */

// ========================================
// マスターテーブル (m_* テーブル)
// ========================================
// 参照用の基本情報を管理するテーブル群

/** 比例区ブロック情報：参院議員比例代表の選挙区ブロックを管理 */
export const mProportionalBlocks = sqliteTable('m_proportional_blocks', {
  blockCode: text('block_code').primaryKey(),
  blockName: text('block_name').notNull(),
  numSeats: integer('num_seats'),
});

/** 都道府県マスター：日本全国の47都道府県情報を保持 */
export const mPrefectures = sqliteTable('m_prefectures', {
  prefCode: text('pref_code').primaryKey(),
  prefName: text('pref_name').notNull(),
  prefKana: text('pref_kana'),
  proportionalBlockCode: text('proportional_block_code').references(() => mProportionalBlocks.blockCode),
});

/** 市区町村マスター：全国の市区町村情報と中心座標を管理 */
export const mCities = sqliteTable('m_cities', {
  cityCode: text('city_code').primaryKey(),
  prefCode: text('pref_code').notNull().references(() => mPrefectures.prefCode),
  cityName: text('city_name').notNull(),
  cityKana: text('city_kana'),
  centerLocation: text('center_location'), // WKT形式
});

/** 町丁・字マスター：市区町村以下の町丁・字情報を管理 */
export const mTowns = sqliteTable('m_towns', {
  keyCode: text('key_code').primaryKey(), // 町丁・字等コード（最大11桁）
  prefCode: text('pref_code').notNull().references(() => mPrefectures.prefCode), // 都道府県コード（2桁）
  cityCode: text('city_code').notNull().references(() => mCities.cityCode), // 市区町村コード（5桁）
  level: integer('level').notNull(), // 表章単位
  townName: text('town_name'), // 町丁・字等名
  population: integer('population'), // 人口総数
  male: integer('male'), // 男
  female: integer('female'), // 女
  households: integer('households'), // 世帯総数
});

/** 選挙種別マスター：衆議院選挙、参議院選挙、知事選挙等の選挙区分を定義 */
export const mElectionTypes = sqliteTable('m_election_types', {
  typeCode: text('type_code').primaryKey(),
  typeName: text('type_name').notNull(),
});

/** 選挙区マスター：衆議院、参議院、都道府県議会等の選挙区情報を管理 */
export const mElectoralDistricts = sqliteTable('m_electoral_districts', {
  id: text('id').primaryKey(),
  chamberTypeCode: text('chamber_type_code').notNull(),
  prefCode: text('pref_code').notNull().references(() => mPrefectures.prefCode),
  districtNumber: integer('district_number').notNull(),
  name: text('name').notNull(),
});

/** 政党マスター：政党の基本情報（名称、色コード、ロゴ等）を管理 */
export const mParties = sqliteTable('m_parties', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  colorCode: text('color_code'), // #RRGGBB形式
  logoUrl: text('logo_url'),
  isActive: integer('is_active').notNull().default(1),
});

/** 支部情報：政党の地域支部（本部、県連、市支部等）の情報を管理 */
export const mBranches = sqliteTable('m_branches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  partyId: integer('party_id').references(() => mParties.id),
  address: text('address'),
  location: text('location'), // WKT形式
  phoneNumber: text('phone_number'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** ポスター掲示板マスター：全国の公職選挙法で指定されたポスター掲示板の位置情報を管理 */
export const mPosterBoards = sqliteTable('m_poster_boards', {
  id: text('id').primaryKey(),
  location: text('location'), // WKT形式
  addressText: text('address_text'),
  locationName: text('location_name'),
  votingDistrictName: text('voting_district_name'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  postalCode: text('postal_code'),
  cityCode: text('city_code').references(() => mCities.cityCode),
});

/** 印刷物・チラシ情報：ポスター、チラシ、政策チラシ等の印刷物情報を管理 */
export const mPrintedMaterials = sqliteTable('m_printed_materials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  size: text('size'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  distributionStartDate: text('distribution_start_date'),
  distributionEndDate: text('distribution_end_date'),
  periodType: text('period_type'),
});

// ========================================
// リレーションシップテーブル (rel_* テーブル)
// ========================================
// 関連情報を管理するテーブル群

/** 市区町村と選挙区の関連テーブル：一つの市区町村が複数の選挙区に跨る場合に対応 */
export const relCityDistricts = sqliteTable('rel_city_districts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cityCode: text('city_code').notNull().references(() => mCities.cityCode),
  districtId: text('district_id').notNull().references(() => mElectoralDistricts.id),
  isSplit: integer('is_split').notNull().default(0),
  note: text('note'),
});

/** グループとメンバーの関連テーブル：グループに所属するボランティアの関係を管理 */
export const relGroupMembers = sqliteTable('rel_group_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: text('group_id').notNull().references(() => tActivityGroups.id),
  volunteerId: text('volunteer_id').notNull().references(() => tActivityGroups.id),
  role: text('role'),
});

// ========================================
// トランザクションテーブル (t_* テーブル)
// ========================================
// 選挙活動の実績及び動的なデータを管理するテーブル群

/** 活動グループ：街宣活動等を行うボランティアグループの情報を管理 */
export const tActivityGroups = sqliteTable('t_activity_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  colorCode: text('color_code'),
  logoUrl: text('logo_url'),
});

/** 選挙情報テーブル：個別の選挙イベント情報を管理（投票日、告示日、選挙名等） */
export const tElections = sqliteTable('t_elections', {
  id: text('id').primaryKey(),
  cityCode: text('city_code').notNull().references(() => mCities.cityCode),
  electionTypeCode: text('election_type_code').notNull().references(() => mElectionTypes.typeCode),
  electoralDistrictId: text('electoral_district_id').references(() => mElectoralDistricts.id),
  voteDate: text('vote_date').notNull(),
  announcementDate: text('announcement_date').notNull(),
  name: text('name').notNull(),
});

/** 活動実績テーブル：街宣、チラシ配り、ポスター掲示等の活動実績を記録 */
export const tActivities = sqliteTable('t_activities', {
  id: text('id').primaryKey(),
  electionId: text('election_id').references(() => tElections.id),
  activityType: text('activity_type').notNull(),
  activityDate: text('activity_date').notNull(),
  volunteerId: text('volunteer_id'),
  groupId: text('group_id').references(() => tActivityGroups.id),
  description: text('description'),
  durationMinutes: integer('duration_minutes'),
  countItems: integer('count_items'),
  locationDetails: text('location_details'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** ポスター掲示ルート：複数の掲示板を効率的に巡回するためのルート定義 */
export const tPosterRoutes = sqliteTable('t_poster_routes', {
  id: text('id').primaryKey(),
  electionId: text('election_id').notNull().references(() => tElections.id),
  routeName: text('route_name').notNull(),
  colorCode: text('color_code'),
});

/** ルート割り当てテーブル：ボランティア又はグループにルートを割り当てる */
export const tRouteAssignments = sqliteTable('t_route_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  routeId: text('route_id').notNull().references(() => tPosterRoutes.id),
  volunteerId: text('volunteer_id'),
  groupId: text('group_id').references(() => tActivityGroups.id),
});

/** ポスター掲示実績テーブル：ポスター掲示板への実際の掲示状況を記録 */
export const tPosterBoards = sqliteTable('t_poster_boards', {
  id: text('id').primaryKey(),
  electionId: text('election_id').notNull().references(() => tElections.id),
  masterBoardId: text('master_board_id').notNull().references(() => mPosterBoards.id),
  boardNumber: text('board_number').notNull(),
  routeId: text('route_id').references(() => tPosterRoutes.id),
  isPosted: integer('is_posted').notNull().default(0),
  postedAt: text('posted_at'),
  postedBy: text('posted_by'),
  postedByGroupId: text('posted_by_group_id').references(() => tActivityGroups.id),
  status: text('status').notNull().default('active'),
  note: text('note'),
  photoUrl: text('photo_url'),
});

/** ポスター掲示板報告テーブル：掲示板の被害報告や状態報告を記録 */
export const tBoardReports = sqliteTable('t_board_reports', {
  id: text('id').primaryKey(),
  boardId: text('board_id').notNull().references(() => tPosterBoards.id),
  reporterId: text('reporter_id'),
  reportType: text('report_type').notNull(),
  description: text('description'),
  photoUrl: text('photo_url'),
  status: text('status').notNull().default('open'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
