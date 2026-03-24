import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// SQLite database
const dbPath = join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

app.use(cors());
app.use(express.json());

// Auto-migrate: add columns that may not exist in older databases
const migrations = [
  "ALTER TABLE message ADD COLUMN edited INTEGER DEFAULT 0",
  "ALTER TABLE user ADD COLUMN display_name TEXT",
  "ALTER TABLE user ADD COLUMN bio TEXT",
  "ALTER TABLE user ADD COLUMN email TEXT",
  "ALTER TABLE user ADD COLUMN profile_photo TEXT",
  "ALTER TABLE user ADD COLUMN hobbies TEXT DEFAULT '[]'",
  "ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// Ensure default admin user exists
const adminExists = db.prepare("SELECT id FROM user WHERE username = 'admin'").get();
if (!adminExists) {
  const hashed = bcrypt.hashSync("admin123", 10);
  const result = db
    .prepare("INSERT INTO user (username, password, display_name, role) VALUES (?, ?, ?, ?)")
    .run("admin", hashed, "Admin", "admin");
  const adminId = result.lastInsertRowid;
  const groupchats = db.prepare("SELECT id FROM groupchat WHERE active = 1").all();
  const insertMembership = db.prepare("INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES (?, ?)");
  for (const gc of groupchats) insertMembership.run(adminId, gc.id);
}

// Admin middleware — expects ?userId=<id> on GET or { userId } in body
const requireAdmin = (req, res, next) => {
  const userId = req.query.userId || req.body?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required." });
  const user = db.prepare("SELECT role FROM user WHERE id = ?").get(userId);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
};

// Ensure normalized hobby tables exist (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    question_number INTEGER NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS user_hobby_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer CHAR(1) NOT NULL CHECK (answer IN ('A','B','C','D','E')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, question_id)
  );

  CREATE INDEX IF NOT EXISTS idx_user_hobby_answers_question_answer
    ON user_hobby_answers (question_id, answer);
`);

// Hobby & interest question catalog
const HOBBY_QUESTIONS = [
  { number: 1, text: "What do you enjoy doing in your free time for creative expression?" },
  { number: 2, text: "Which type of physical activity appeals to you most?" },
  { number: 3, text: "How do you prefer to spend your entertainment time?" },
  { number: 4, text: "What's your ideal way to socialize?" },
  { number: 5, text: "What's your relationship with food and cooking?" },
  { number: 6, text: "What sparks your intellectual curiosity?" },
  { number: 7, text: "Do you enjoy collecting or focusing deeply on specific interests?" },
  { number: 8, text: "What's your connection to music and performance?" },
  { number: 9, text: "How do you spend time online?" },
  { number: 10, text: "How do you prioritize your wellness and relaxation?" },
];

// Seed questions on boot (upsert by question_number)
const upsertQuestion = db.prepare(
  `INSERT INTO questions (question_text, question_number)
   VALUES (@text, @number)
   ON CONFLICT(question_number) DO UPDATE SET question_text=excluded.question_text`
);
for (const q of HOBBY_QUESTIONS) {
  upsertQuestion.run(q);
}

// Legacy question texts (kept for existing personality endpoints)
const PERSONALITY_QUESTIONS = [
  "How often do you go out of your way to talk to new people at a group event?",
  "How many nights a week do you spend out with friends?",
  "Do you find yourself talking with people similar or different to yourself?",
  "How often do you talk to new people daily (i.e. at work, school, religious affiliation)?",
];

// POST /api/personality-results - Submit personality test results (into personalitytest + personalityquestion)
app.post("/api/personality-results", (req, res) => {
  try {
    const { q1, q2, q3, q4, userId } = req.body;
    const answers = [q1, q2, q3, q4];

    if (answers.some((a) => typeof a !== "number")) {
      return res.status(400).json({
        error: "Invalid input. q1, q2, q3, q4 must be numbers.",
      });
    }

    const resultsJson = JSON.stringify({ q1, q2, q3, q4 });
    const insertTest = db.prepare(
      `INSERT INTO personalitytest (user_id, results, template_id) VALUES (?, ?, 1)`
    );
    const result = insertTest.run(userId || null, resultsJson);
    const testId = result.lastInsertRowid;

    const insertQuestion = db.prepare(
      `INSERT INTO personalityquestion (personalitytest_id, question_text, answer_num, answer_string) VALUES (?, ?, ?, NULL)`
    );
    for (let i = 0; i < PERSONALITY_QUESTIONS.length; i++) {
      insertQuestion.run(testId, PERSONALITY_QUESTIONS[i], answers[i]);
    }

    const row = db
      .prepare("SELECT * FROM personalitytest WHERE id = ?")
      .get(testId);

    const countRow = db
      .prepare("SELECT COUNT(*) as total FROM personalitytest")
      .get();

    res.status(201).json({
      ...row,
      totalSubmissions: countRow.total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save personality results." });
  }
});

// GET /api/personality-results/count - Get total submission count
app.get("/api/personality-results/count", (req, res) => {
  try {
    const row = db
      .prepare("SELECT COUNT(*) as total FROM personalitytest")
      .get();
    res.json({ total: row.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch count." });
  }
});

// GET /api/profile/:userId/personality-results - Get latest personality test for user
app.get("/api/profile/:userId/personality-results", (req, res) => {
  try {
    const { userId } = req.params;
    const row = db
      .prepare(
        "SELECT id, results FROM personalitytest WHERE user_id = ? ORDER BY id DESC LIMIT 1"
      )
      .get(userId);
    if (!row) return res.status(404).json({ error: "No results found." });
    const results = row.results ? JSON.parse(row.results) : null;
    res.json({ id: row.id, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch results." });
  }
});

// POST /api/users - create or fetch a user by username (no password for lightweight flow)
app.post("/api/users", (req, res) => {
  try {
    const { username, city, displayName } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required." });

    const existing = db.prepare("SELECT id, username, city, display_name FROM user WHERE username = ?").get(username);
    if (existing) {
      return res.json({
        id: existing.id,
        username: existing.username,
        city: existing.city,
        display_name: existing.display_name || existing.username,
      });
    }

    // minimal bcrypt password hash for compatibility with login flow ("placeholder-password")
    const placeholderPassword = "$2b$10$eImiTXuWVxfM37uY4JANjQy5lr8G9V7HUlBN3JcH3Y0IGY6Yyv7i.";
    const result = db
      .prepare("INSERT INTO user (username, password, city, display_name) VALUES (?, ?, ?, ?)")
      .run(username, placeholderPassword, city || null, displayName || username);

    const newUserId = result.lastInsertRowid;

    // Add new user to all active groupchats for onboarding
    const groupchats = db.prepare("SELECT id FROM groupchat WHERE active = 1").all();
    const insertMembership = db.prepare(
      "INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES (?, ?)"
    );
    for (const gc of groupchats) insertMembership.run(newUserId, gc.id);

    res.status(201).json({
      id: newUserId,
      username,
      city: city || null,
      display_name: displayName || username,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user." });
  }
});

// POST /api/register - Create a new user
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, city, display_name } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required." });
    const existing = db.prepare("SELECT id FROM user WHERE username = ?").get(username);
    if (existing) return res.status(409).json({ error: "Username already exists." });
    const hashed = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO user (username, password, city, display_name) VALUES (?, ?, ?, ?)")
      .run(username, hashed, city || null, display_name || null);
    const newUserId = result.lastInsertRowid;
    // Add new user to all active groupchats
    const groupchats = db.prepare("SELECT id FROM groupchat WHERE active = 1").all();
    const insertMembership = db.prepare(
      "INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES (?, ?)"
    );
    for (const gc of groupchats) {
      insertMembership.run(newUserId, gc.id);
    }
    res.status(201).json({ id: newUserId, username, city: city || null, display_name: display_name || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user." });
  }
});

// POST /api/login - Login with username and password
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required." });
    const user = db
      .prepare("SELECT id, username, city, password, display_name, role FROM user WHERE username = ?")
      .get(username);
    if (!user) return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password." });
    res.json({ id: user.id, username: user.username, city: user.city, display_name: user.display_name, role: user.role || "user" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login." });
  }
});

// POST /api/hobby-answers - upsert per-question answers for a user
app.post("/api/hobby-answers", (req, res) => {
  try {
    const { userId, answers } = req.body;
    if (!userId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "userId and answers are required." });
    }

    const user = db.prepare("SELECT id FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const stmtQuestion = db.prepare("SELECT id FROM questions WHERE question_number = ?");
    const upsertAnswer = db.prepare(`
      INSERT INTO user_hobby_answers (user_id, question_id, answer)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        answer = excluded.answer,
        created_at = CURRENT_TIMESTAMP
    `);

    const txn = db.transaction(() => {
      for (const entry of answers) {
        const { questionNumber, answer } = entry || {};
        if (!questionNumber || !["A", "B", "C", "D", "E"].includes(answer)) {
          throw new Error("Invalid answer payload.");
        }
        const q = stmtQuestion.get(questionNumber);
        if (!q) throw new Error(`Question ${questionNumber} not found.`);
        upsertAnswer.run(userId, q.id, answer);
      }
    });

    txn();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to save answers.";
    res.status(400).json({ error: message });
  }
});

// GET /api/groupchats/:id - Get a single groupchat with member count
app.get("/api/groupchats/:id", (req, res) => {
  try {
    const { id } = req.params;
    const group = db.prepare(`
      SELECT g.id, g.name, g.chat_photo,
        (SELECT COUNT(*) FROM user_groupchat WHERE groupchat_id = g.id) as member_count
      FROM groupchat g WHERE g.id = ?
    `).get(id);
    if (!group) return res.status(404).json({ error: "Group not found." });
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groupchat." });
  }
});

// GET /api/groups/:userId - Get all group chats for a user
app.get("/api/groups/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const groups = db
      .prepare(
        `SELECT g.id, g.name, g.chat_photo,
          (SELECT COUNT(*) FROM user_groupchat WHERE groupchat_id = g.id) as member_count,
          (SELECT message FROM message WHERE groupchat_id = g.id ORDER BY sent_time DESC LIMIT 1) as last_message
        FROM groupchat g
        JOIN user_groupchat ug ON g.id = ug.groupchat_id
        WHERE ug.user_id = ? AND g.active = 1`
      )
      .all(userId);
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});

// GET /api/messages/:groupId - Get all messages for a group
app.get("/api/messages/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = db
      .prepare(
        `SELECT m.id, m.message, m.sent_time, m.user_id, m.edited, u.username
        FROM message m
        LEFT JOIN user u ON m.user_id = u.id
        WHERE m.groupchat_id = ?
        ORDER BY m.sent_time ASC`
      )
      .all(groupId);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// POST /api/messages - Send a message
app.post("/api/messages", (req, res) => {
  try {
    const { userId, groupId, message } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: "groupId and message are required." });
    }
    const result = db
      .prepare("INSERT INTO message (user_id, groupchat_id, message) VALUES (?, ?, ?)")
      .run(userId || null, groupId, message);
    const row = db
      .prepare(
        `SELECT m.id, m.message, m.sent_time, m.user_id, m.edited, u.username
        FROM message m LEFT JOIN user u ON m.user_id = u.id
        WHERE m.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// PUT /api/messages/:id - Edit a message (only the sender can edit)
app.put("/api/messages/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { userId, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }
    const existing = db.prepare("SELECT user_id FROM message WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Message not found." });
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: "You can only edit your own messages." });
    }
    db.prepare("UPDATE message SET message = ?, edited = 1 WHERE id = ?").run(message.trim(), id);
    const row = db
      .prepare(
        `SELECT m.id, m.message, m.sent_time, m.user_id, m.edited, u.username
        FROM message m LEFT JOIN user u ON m.user_id = u.id
        WHERE m.id = ?`
      )
      .get(id);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to edit message." });
  }
});

// GET /api/profile/:userId - Get full profile
app.get("/api/profile/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const user = db
      .prepare("SELECT id, username, display_name, bio, city, email, profile_photo, hobbies, role FROM user WHERE id = ?")
      .get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ ...user, role: user.role || "user", hobbies: user.hobbies ? JSON.parse(user.hobbies) : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// PUT /api/profile/:userId - Update profile fields
app.put("/api/profile/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { display_name, bio, city, email, profile_photo, hobbies } = req.body;
    db.prepare(
      `UPDATE user SET display_name = ?, bio = ?, city = ?, email = ?, profile_photo = ?, hobbies = ? WHERE id = ?`
    ).run(
      display_name || null,
      bio || null,
      city || null,
      email || null,
      profile_photo || null,
      hobbies ? JSON.stringify(hobbies) : "[]",
      userId
    );
    const updated = db
      .prepare("SELECT id, username, display_name, bio, city, email, profile_photo, hobbies FROM user WHERE id = ?")
      .get(userId);
    res.json({ ...updated, hobbies: updated.hobbies ? JSON.parse(updated.hobbies) : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// PUT /api/profile/:userId/password - Change password
app.put("/api/profile/:userId/password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Both fields are required." });
    const user = db.prepare("SELECT password FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE user SET password = ? WHERE id = ?").run(hashed, userId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update password." });
  }
});

// PUT /api/profile/:userId/username - Change username
app.put("/api/profile/:userId/username", (req, res) => {
  try {
    const { userId } = req.params;
    const { username } = req.body;
    const trimmed = (username || "").trim();
    if (!trimmed) return res.status(400).json({ error: "Username is required." });
    const existing = db
      .prepare("SELECT id FROM user WHERE username = ? AND id != ?")
      .get(trimmed, userId);
    if (existing) return res.status(409).json({ error: "Username already exists." });
    db.prepare("UPDATE user SET username = ? WHERE id = ?").run(trimmed, userId);
    const updated = db
      .prepare("SELECT id, username, display_name FROM user WHERE id = ?")
      .get(userId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update username." });
  }
});

// GET /api/admin/stats - Overview counts
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM user").get();
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM user WHERE role = 'admin'").get();
    const messageCount = db.prepare("SELECT COUNT(*) as count FROM message").get();
    const groupchatCount = db.prepare("SELECT COUNT(*) as count FROM groupchat WHERE active = 1").get();
    const personalityCount = db.prepare("SELECT COUNT(*) as count FROM personalitytest").get();
    res.json({
      users: userCount.count,
      admins: adminCount.count,
      messages: messageCount.count,
      groupchats: groupchatCount.count,
      personalityTests: personalityCount.count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// GET /api/admin/users - All users
app.get("/api/admin/users", requireAdmin, (req, res) => {
  try {
    const users = db
      .prepare("SELECT id, username, display_name, city, email, role, active FROM user ORDER BY id ASC")
      .all();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// PUT /api/admin/users/:id/role - Change a user's role
app.put("/api/admin/users/:id/role", requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'user' or 'admin'." });
    }
    const target = db.prepare("SELECT id FROM user WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "User not found." });
    db.prepare("UPDATE user SET role = ? WHERE id = ?").run(role, id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role." });
  }
});

// GET /api/admin/groupchats - All groupchats with member counts
app.get("/api/admin/groupchats", requireAdmin, (req, res) => {
  try {
    const groups = db
      .prepare(`
        SELECT g.id, g.name, g.chat_photo, g.active,
          (SELECT COUNT(*) FROM user_groupchat WHERE groupchat_id = g.id) as member_count,
          (SELECT COUNT(*) FROM message WHERE groupchat_id = g.id) as message_count
        FROM groupchat g ORDER BY g.id ASC
      `)
      .all();
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groupchats." });
  }
});

// GET /api/admin/messages - Recent messages across all chats
app.get("/api/admin/messages", requireAdmin, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const messages = db
      .prepare(`
        SELECT m.id, m.message, m.sent_time, m.edited,
          u.username, u.display_name,
          g.name as groupchat_name
        FROM message m
        LEFT JOIN user u ON m.user_id = u.id
        LEFT JOIN groupchat g ON m.groupchat_id = g.id
        ORDER BY m.sent_time DESC
        LIMIT ?
      `)
      .all(limit);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
