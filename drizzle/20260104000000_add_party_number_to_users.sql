-- Migration: add_party_number_to_users
ALTER TABLE users ADD COLUMN party_number TEXT;
