-- BB Find a Friend - Sample Data (matches ERD)
-- Run this script after schema.sql to populate the database

-- Template for personality test (required for personalitytest.template_id)
INSERT INTO templatePersonalityTest (id) VALUES (1);

-- Template questions (match the 4 questions in the app)
INSERT INTO templatePersonalityQuestion (templatetest_id, question_text, question_order) VALUES
  (1, 'How often do you go out of your way to talk to new people at a group event?', 1),
  (1, 'How many nights a week do you spend out with friends?', 2),
  (1, 'Do you find yourself talking with people similar or different to yourself?', 3),
  (1, 'How often do you talk to new people daily (i.e. at work, school, religious affiliation)?', 4);

-- Sample users
INSERT INTO user (username, password, city, active, in_next_cycle) VALUES
  ('steve_b', 'hash_placeholder', 'Cleveland', 1, 1),
  ('amanda', 'hash_placeholder', 'San Francisco', 1, 1),
  ('thomas', 'hash_placeholder', 'Cleveland', 1, 1);

-- Sample groupchats
INSERT INTO groupchat (name, chat_photo, active) VALUES
  ('The Boys', '🏀', 1),
  ('Fortnite Quads', '🎮', 1),
  ('Study Squad', '📚', 1);

-- User-groupchat membership (user_groupchat)
INSERT INTO user_groupchat (user_id, groupchat_id) VALUES
  (1, 1), (1, 2),
  (2, 1), (2, 3),
  (3, 1), (3, 2);

-- Sample reviews
INSERT INTO reviews (user_id, rating, comment) VALUES
  (1, 5, 'I struggled to make friends, but through this app I have made lifelong friends!'),
  (2, 5, 'I feel like I finally have a support group.'),
  (3, 5, 'I finally have friends to play pickup basketball with now.');

-- Sample messages
INSERT INTO message (user_id, groupchat_id, message, sent_time, delivered) VALUES
  (1, 1, 'Hey everyone! Who''s online?', datetime('now', '-1 hour'), 1),
  (2, 1, 'I''m here! What''s up?', datetime('now', '-55 minutes'), 1),
  (3, 1, 'Same here. Anyone down to hang out tonight?', datetime('now', '-50 minutes'), 1);

-- Sample personality test submissions (results as JSON: {q1, q2, q3, q4})
INSERT INTO personalitytest (user_id, results, template_id) VALUES
  (1, '{"q1":75,"q2":4,"q3":60,"q4":70}', 1),
  (2, '{"q1":50,"q2":3,"q3":50,"q4":50}', 1),
  (NULL, '{"q1":90,"q2":6,"q3":80,"q4":85}', 1);

-- Personality question answers for the sample submissions
INSERT INTO personalityquestion (personalitytest_id, question_text, answer_num, answer_string) VALUES
  (1, 'How often do you go out of your way to talk to new people at a group event?', 75, NULL),
  (1, 'How many nights a week do you spend out with friends?', 4, NULL),
  (1, 'Do you find yourself talking with people similar or different to yourself?', 60, NULL),
  (1, 'How often do you talk to new people daily (i.e. at work, school, religious affiliation)?', 70, NULL),
  (2, 'How often do you go out of your way to talk to new people at a group event?', 50, NULL),
  (2, 'How many nights a week do you spend out with friends?', 3, NULL),
  (2, 'Do you find yourself talking with people similar or different to yourself?', 50, NULL),
  (2, 'How often do you talk to new people daily (i.e. at work, school, religious affiliation)?', 50, NULL);
