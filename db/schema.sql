-- BB Find a Friend - Database Schema (matches ERD)
-- Run this script to create the database tables

-- Users
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  city TEXT,
  active INTEGER DEFAULT 1,
  in_next_cycle INTEGER DEFAULT 1,
  display_name TEXT,
  bio TEXT,
  email TEXT,
  profile_photo TEXT,
  hobbies TEXT DEFAULT '[]'
);

-- Reviews (user_id references user)
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES user(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL
);

-- Group chats
CREATE TABLE IF NOT EXISTS groupchat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  chat_photo TEXT,
  active INTEGER DEFAULT 1
);

-- Messages (user_id, groupchat_id)
CREATE TABLE IF NOT EXISTS message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES user(id) ON DELETE SET NULL,
  groupchat_id INTEGER NOT NULL REFERENCES groupchat(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sent_time TEXT DEFAULT (datetime('now')),
  delivered INTEGER DEFAULT 0
);

-- Junction: users ↔ groupchats (many-to-many)
CREATE TABLE IF NOT EXISTS user_groupchat (
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  groupchat_id INTEGER NOT NULL REFERENCES groupchat(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, groupchat_id)
);

-- Personality test templates
CREATE TABLE IF NOT EXISTS templatePersonalityTest (
  id INTEGER PRIMARY KEY AUTOINCREMENT
);

-- Template questions
CREATE TABLE IF NOT EXISTS templatePersonalityQuestion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  templatetest_id INTEGER NOT NULL REFERENCES templatePersonalityTest(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0
);

-- Personality test submissions (user_id nullable for anonymous)
CREATE TABLE IF NOT EXISTS personalitytest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES user(id) ON DELETE SET NULL,
  results TEXT NOT NULL,
  template_id INTEGER NOT NULL REFERENCES templatePersonalityTest(id) ON DELETE CASCADE
);

-- Individual question answers per test
CREATE TABLE IF NOT EXISTS personalityquestion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personalitytest_id INTEGER NOT NULL REFERENCES personalitytest(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_num INTEGER NOT NULL,
  answer_string TEXT
);
