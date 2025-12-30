-- PRAGMA foreign_keys = OFF;
-- BEGIN TRANSACTION;
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';

DROP TABLE IF EXISTS rel_group_members;
DROP TABLE IF EXISTS t_board_reports;
DROP TABLE IF EXISTS t_route_assignments;
DROP TABLE IF EXISTS t_poster_boards;
DROP TABLE IF EXISTS t_poster_routes;
DROP TABLE IF EXISTS t_activities;
DROP TABLE IF EXISTS t_activity_groups;
DROP TABLE IF EXISTS t_elections;

DROP TABLE IF EXISTS rel_city_districts;
DROP TABLE IF EXISTS m_poster_boards;
DROP TABLE IF EXISTS m_branches;
DROP TABLE IF EXISTS m_parties;
DROP TABLE IF EXISTS m_electoral_districts;
DROP TABLE IF EXISTS m_election_types;
DROP TABLE IF EXISTS m_towns;
DROP TABLE IF EXISTS m_cities;
DROP TABLE IF EXISTS m_prefectures;
DROP TABLE IF EXISTS m_proportional_blocks;
DROP TABLE IF EXISTS m_printed_materials;
-- COMMIT;
-- PRAGMA foreign_keys = ON;
