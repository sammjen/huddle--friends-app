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
    const { q1, q2, q3, q4 } = req.body;
    const answers = [q1, q2, q3, q4];

    if (answers.some((a) => typeof a !== "number")) {
      return res.status(400).json({
        error: "Invalid input. q1, q2, q3, q4 must be numbers.",
      });
    }

    const resultsJson = JSON.stringify({ q1, q2, q3, q4 });
    const insertTest = db.prepare(
      `INSERT INTO personalitytest (user_id, results, template_id) VALUES (NULL, ?, 1)`
    );
    const result = insertTest.run(resultsJson);
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

// POST /api/register - Create a new user
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, city } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required." });
    const existing = db.prepare("SELECT id FROM user WHERE username = ?").get(username);
    if (existing) return res.status(409).json({ error: "Username already exists." });
    const hashed = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO user (username, password, city) VALUES (?, ?, ?)")
      .run(username, hashed, city || null);
    res.status(201).json({ id: result.lastInsertRowid, username, city: city || null });
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
      .prepare("SELECT id, username, city, password FROM user WHERE username = ?")
      .get(username);
    if (!user) return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password." });
    res.json({ id: user.id, username: user.username, city: user.city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login." });
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
        `SELECT m.id, m.message, m.sent_time, m.user_id, u.username
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
        `SELECT m.id, m.message, m.sent_time, m.user_id, u.username
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
