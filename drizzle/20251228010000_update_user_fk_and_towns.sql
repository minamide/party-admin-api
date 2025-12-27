-- マイグレーション: users参照と町丁・字連携の追加
-- 作成日時: 2025-12-28 01:00

BEGIN TRANSACTION;
PRAGMA foreign_keys=OFF;

-- rel_group_members をユーザー参照に再作成
CREATE TABLE "rel_group_members_new" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "group_id" TEXT NOT NULL,
  "volunteer_id" TEXT NOT NULL,
  "role" TEXT,
  FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id),
  FOREIGN KEY (volunteer_id) REFERENCES "users" (id) ON DELETE CASCADE
);
INSERT INTO "rel_group_members_new" (id, group_id, volunteer_id, role)
  SELECT id, group_id, volunteer_id, role FROM "rel_group_members";
DROP TABLE "rel_group_members";
ALTER TABLE "rel_group_members_new" RENAME TO "rel_group_members";

-- m_poster_boards に town_key_code を追加するため再作成
CREATE TABLE "m_poster_boards_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "location" TEXT,
  "address_text" TEXT,
  "location_name" TEXT,
  "voting_district_name" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postal_code" TEXT,
  "city_code" TEXT,
  "town_key_code" TEXT,
  FOREIGN KEY (city_code) REFERENCES "m_cities" (city_code),
  FOREIGN KEY (town_key_code) REFERENCES "m_towns" (key_code)
);
INSERT INTO "m_poster_boards_new" (id, location, address_text, location_name, voting_district_name, created_at, postal_code, city_code)
  SELECT id, location, address_text, location_name, voting_district_name, created_at, postal_code, city_code FROM "m_poster_boards";
DROP TABLE "m_poster_boards";
ALTER TABLE "m_poster_boards_new" RENAME TO "m_poster_boards";

-- t_activities に users参照と town_key_code を追加するため再作成
CREATE TABLE "t_activities_new" (
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
  "town_key_code" TEXT,
  FOREIGN KEY (election_id) REFERENCES "t_elections" (id),
  FOREIGN KEY (volunteer_id) REFERENCES "users" (id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id),
  FOREIGN KEY (town_key_code) REFERENCES "m_towns" (key_code)
);
INSERT INTO "t_activities_new" (id, election_id, activity_type, activity_date, volunteer_id, group_id, description, duration_minutes, count_items, location_details, created_at)
  SELECT id, election_id, activity_type, activity_date, volunteer_id, group_id, description, duration_minutes, count_items, location_details, created_at FROM "t_activities";
DROP TABLE "t_activities";
ALTER TABLE "t_activities_new" RENAME TO "t_activities";

-- t_poster_boards に posted_by の users参照追加のため再作成
CREATE TABLE "t_poster_boards_new" (
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
  FOREIGN KEY (posted_by) REFERENCES "users" (id) ON DELETE SET NULL,
  FOREIGN KEY (posted_by_group_id) REFERENCES "t_activity_groups" (id)
);
INSERT INTO "t_poster_boards_new" (id, election_id, master_board_id, board_number, route_id, is_posted, posted_at, posted_by, posted_by_group_id, status, note, photo_url)
  SELECT id, election_id, master_board_id, board_number, route_id, is_posted, posted_at, posted_by, posted_by_group_id, status, note, photo_url FROM "t_poster_boards";
DROP TABLE "t_poster_boards";
ALTER TABLE "t_poster_boards_new" RENAME TO "t_poster_boards";

-- t_route_assignments に volunteer_id の users参照追加のため再作成
CREATE TABLE "t_route_assignments_new" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "route_id" TEXT NOT NULL,
  "volunteer_id" TEXT,
  "group_id" TEXT,
  FOREIGN KEY (route_id) REFERENCES "t_poster_routes" (id),
  FOREIGN KEY (volunteer_id) REFERENCES "users" (id) ON DELETE SET NULL,
  FOREIGN KEY (group_id) REFERENCES "t_activity_groups" (id)
);
INSERT INTO "t_route_assignments_new" (id, route_id, volunteer_id, group_id)
  SELECT id, route_id, volunteer_id, group_id FROM "t_route_assignments";
DROP TABLE "t_route_assignments";
ALTER TABLE "t_route_assignments_new" RENAME TO "t_route_assignments";

-- t_board_reports に reporter_id の users参照追加のため再作成
CREATE TABLE "t_board_reports_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "board_id" TEXT NOT NULL,
  "reporter_id" TEXT,
  "report_type" TEXT NOT NULL,
  "description" TEXT,
  "photo_url" TEXT,
  "status" TEXT DEFAULT 'open',
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES "t_poster_boards" (id),
  FOREIGN KEY (reporter_id) REFERENCES "users" (id) ON DELETE SET NULL
);
INSERT INTO "t_board_reports_new" (id, board_id, reporter_id, report_type, description, photo_url, status, created_at)
  SELECT id, board_id, reporter_id, report_type, description, photo_url, status, created_at FROM "t_board_reports";
DROP TABLE "t_board_reports";
ALTER TABLE "t_board_reports_new" RENAME TO "t_board_reports";

PRAGMA foreign_keys=ON;
COMMIT;

-- 追加インデックス
CREATE INDEX IF NOT EXISTS idx_rel_group_members_volunteer_id ON "rel_group_members" ("volunteer_id");
CREATE INDEX IF NOT EXISTS idx_m_poster_boards_town_key_code ON "m_poster_boards" ("town_key_code");
CREATE INDEX IF NOT EXISTS idx_t_activities_volunteer_id ON "t_activities" ("volunteer_id");
CREATE INDEX IF NOT EXISTS idx_t_activities_town_key_code ON "t_activities" ("town_key_code");
CREATE INDEX IF NOT EXISTS idx_t_poster_boards_posted_by ON "t_poster_boards" ("posted_by");
CREATE INDEX IF NOT EXISTS idx_t_route_assignments_volunteer_id ON "t_route_assignments" ("volunteer_id");
CREATE INDEX IF NOT EXISTS idx_t_board_reports_reporter_id ON "t_board_reports" ("reporter_id");
