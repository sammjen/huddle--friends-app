PRAGMA foreign_keys = ON;

-- Personality test template retained for legacy flows
INSERT OR IGNORE INTO templatePersonalityTest (id) VALUES (1);

INSERT OR REPLACE INTO templatePersonalityQuestion (id, templatetest_id, question_text, question_order) VALUES
  (1, 1, 'How often do you go out of your way to talk to new people at a group event?', 1),
  (2, 1, 'How many nights a week do you spend out with friends?', 2),
  (3, 1, 'Do you find yourself talking with people similar or different to yourself?', 3),
  (4, 1, 'How often do you talk to new people daily (i.e. at work, school, religious affiliation)?', 4);

-- Core reference data: hobby & interest questions
INSERT OR REPLACE INTO questions (question_number, question_text) VALUES
  (1, 'What do you enjoy doing in your free time for creative expression?'),
  (2, 'Which type of physical activity appeals to you most?'),
  (3, 'How do you prefer to spend your entertainment time?'),
  (4, 'What''s your ideal way to socialize?'),
  (5, 'What''s your relationship with food and cooking?'),
  (6, 'What sparks your intellectual curiosity?'),
  (7, 'Do you enjoy collecting or focusing deeply on specific interests?'),
  (8, 'What''s your connection to music and performance?'),
  (9, 'How do you spend time online?'),
  (10, 'How do you prioritize your wellness and relaxation?');

-- Sample groupchats
INSERT OR IGNORE INTO groupchat (id, name, chat_photo, active) VALUES
  (1, 'The Boys', '🏀', 1),
  (2, 'Fortnite Quads', '🎮', 1),
  (3, 'Study Squad', '📚', 1);

-- Sample users (ids stable for idempotency)
INSERT OR IGNORE INTO user (id, username, password, city, display_name, role) VALUES
  (1, 'demo', '$2a$10$8LugW7YJcpZ6R6BAVDj7EO92pShUMHbOWcZH/5Li.yYI8a9kaI0sS', 'Denver', 'Demo User', 'user');

-- Add demo user to all groupchats
INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES
  (1, 1),
  (1, 2),
  (1, 3);
