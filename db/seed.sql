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

-- Sample groupchats
INSERT INTO groupchat (name, chat_photo, active) VALUES
  ('The Boys', '🏀', 1),
  ('Fortnite Quads', '🎮', 1),
  ('Study Squad', '📚', 1);
