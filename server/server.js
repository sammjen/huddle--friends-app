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
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// Question texts (match templatePersonalityQuestion order)
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
