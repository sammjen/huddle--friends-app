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

// Standalone ensure (older DBs or partial migrations may lack these tables)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      reported_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS account_appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );
  `);
} catch (e) {
  console.error("ensure reports/appeals tables:", e);
}

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
  "ALTER TABLE user ADD COLUMN test_started_at TEXT",
  "ALTER TABLE user ADD COLUMN first_chat_joined_at TEXT",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// Performance indexes for frequently queried columns
const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_user_groupchat_groupchat ON user_groupchat(groupchat_id)",
  "CREATE INDEX IF NOT EXISTS idx_user_groupchat_user ON user_groupchat(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_message_groupchat ON message(groupchat_id, sent_time DESC)",
  "CREATE INDEX IF NOT EXISTS idx_user_hobby_answers_user ON user_hobby_answers(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_user_friends_user ON user_friends(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)",
  "CREATE INDEX IF NOT EXISTS idx_user_username ON user(username)",
];
for (const sql of indexes) {
  try { db.exec(sql); } catch (_) { /* index or table may not exist yet */ }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (event_id, user_id)
  );
`);

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

function parseUserIdParam(req) {
  const raw = req.query.userId ?? req.body?.userId ?? req.params?.userId;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

// Admin middleware — expects ?userId=<id> on GET or { userId } in body
const requireAdmin = (req, res, next) => {
  const userId = parseUserIdParam(req);
  if (!Number.isInteger(userId)) return res.status(401).json({ error: "Authentication required." });
  const user = db.prepare("SELECT role, active FROM user WHERE id = ?").get(userId);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  if (user.active === 0) return res.status(403).json({ error: "Account deactivated.", code: "ACCOUNT_DEACTIVATED" });
  req.currentUser = { id: userId, role: user.role };
  next();
};

const requireAuth = (req, res, next) => {
  const userId = parseUserIdParam(req);
  if (!Number.isInteger(userId)) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const user = db.prepare("SELECT id, role, active FROM user WHERE id = ?").get(userId);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (user.active === 0) {
    return res.status(403).json({ error: "Account deactivated.", code: "ACCOUNT_DEACTIVATED" });
  }

  req.currentUser = { id: user.id, role: user.role };
  next();
};

const seedEvent = db.prepare(`
  INSERT OR IGNORE INTO events (id, name, event_date, location, description)
  VALUES (?, ?, ?, ?, ?)
`);

[
  [1, "Coffee Catch-Up", "2026-03-27 10:00:00", "Denver Central Market", "Easy morning meetup for coffee and conversation."],
  [2, "Trivia Night", "2026-03-29 19:00:00", "The Post Chicken & Beer", "Low-pressure team trivia and food."],
  [3, "City Park Walk", "2026-03-30 18:30:00", "City Park", "Sunset walk and hangout outdoors."],
].forEach((event) => seedEvent.run(...event));

const isValidEventDate = (value) => {
  const trimmed = String(value || "").trim();
  const matches = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!matches) return false;

  const year = Number(matches[1]);
  if (year < 2000 || year >= 2100) return false;

  const normalized = trimmed.replace(" ", "T");
  const date = new Date(normalized);
  return !Number.isNaN(date.getTime());
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

  CREATE TABLE IF NOT EXISTS user_friends (
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (requester_id, receiver_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    reported_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS account_appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );
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
      .prepare("SELECT id, username, city, password, display_name, role, active FROM user WHERE username = ?")
      .get(username);
    if (!user) return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password." });
    if (user.active === 0) {
      return res.status(403).json({
        error: "This account has been deactivated.",
        code: "ACCOUNT_DEACTIVATED",
        username: user.username,
      });
    }
    res.json({ id: user.id, username: user.username, city: user.city, display_name: user.display_name, role: user.role || "user" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login." });
  }
});

// GET /api/auth/verify?userId= — lightweight session check (matches app auth pattern)
app.get("/api/auth/verify", (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!Number.isInteger(userId)) return res.status(400).json({ error: "userId required." });
    const row = db.prepare("SELECT id, username, active FROM user WHERE id = ?").get(userId);
    if (!row) return res.status(404).json({ error: "User not found." });
    res.json({ id: row.id, username: row.username, active: row.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify." });
  }
});

// POST /api/account-appeal — deactivated users submit a reactivation request (password proves identity)
app.post("/api/account-appeal", async (req, res) => {
  try {
    const { username, password, message } = req.body;
    const trimmedMsg = String(message || "").trim();
    if (!username || !password || !trimmedMsg) {
      return res.status(400).json({ error: "Username, password, and a message are required." });
    }
    if (trimmedMsg.length < 10) {
      return res.status(400).json({ error: "Please write at least 10 characters explaining your situation." });
    }
    const user = db
      .prepare("SELECT id, password, active FROM user WHERE username = ?")
      .get(String(username).trim());
    if (!user) return res.status(404).json({ error: "User not found." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password." });
    if (user.active !== 0) {
      return res.status(400).json({ error: "This account is already active. You can log in normally." });
    }
    const pending = db
      .prepare("SELECT id FROM account_appeals WHERE user_id = ? AND status = 'pending'")
      .get(user.id);
    if (pending) {
      return res.status(409).json({ error: "You already have a pending appeal. An admin will review it soon." });
    }
    const result = db
      .prepare("INSERT INTO account_appeals (user_id, message) VALUES (?, ?)")
      .run(user.id, trimmedMsg);
    res.status(201).json({ success: true, appealId: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit appeal." });
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

// GET /api/events - Get upcoming events with RSVP state for the current user
app.get("/api/events", requireAuth, (req, res) => {
  try {
    const currentUserId = req.currentUser.id;
    const events = db
      .prepare(`
        SELECT
          e.id,
          e.name,
          e.event_date,
          e.location,
          e.description,
          e.created_at,
          EXISTS(
            SELECT 1
            FROM event_rsvps er
            WHERE er.event_id = e.id AND er.user_id = ?
          ) AS isRsvped
        FROM events e
        ORDER BY datetime(e.event_date) ASC, e.id ASC
      `)
      .all(currentUserId)
      .map((event) => ({ ...event, isRsvped: Boolean(event.isRsvped) }));

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

// POST /api/events - Create an event
app.post("/api/events", requireAdmin, (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const eventDate = String(req.body?.event_date || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!name || !eventDate || !location) {
      return res.status(400).json({ error: "name, event_date, and location are required." });
    }

     if (!isValidEventDate(eventDate)) {
      return res.status(400).json({ error: "Event date must use a 4-digit year between 2000 and 2099." });
    }

    const result = db
      .prepare(`
        INSERT INTO events (name, event_date, location)
        VALUES (?, ?, ?)
      `)
      .run(name, eventDate, location);

    const event = db
      .prepare(`
        SELECT id, name, event_date, location, description, created_at
        FROM events
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json({ ...event, isRsvped: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event." });
  }
});

// PUT /api/events/:id - Update an event
app.put("/api/events/:id", requireAdmin, (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const name = String(req.body?.name || "").trim();
    const eventDate = String(req.body?.event_date || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    if (!name || !eventDate || !location) {
      return res.status(400).json({ error: "name, event_date, and location are required." });
    }

    if (!isValidEventDate(eventDate)) {
      return res.status(400).json({ error: "Event date must use a 4-digit year between 2000 and 2099." });
    }

    const existingEvent = db.prepare("SELECT id FROM events WHERE id = ?").get(eventId);
    if (!existingEvent) return res.status(404).json({ error: "Event not found." });

    db.prepare(`
      UPDATE events
      SET name = ?, event_date = ?, location = ?
      WHERE id = ?
    `).run(name, eventDate, location, eventId);

    const event = db
      .prepare(`
        SELECT id, name, event_date, location, description, created_at
        FROM events
        WHERE id = ?
      `)
      .get(eventId);

    const isRsvped = Boolean(
      db.prepare("SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?").get(eventId, req.currentUser.id)
    );

    res.json({ ...event, isRsvped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event." });
  }
});

// DELETE /api/events/:id - Delete an event
app.delete("/api/events/:id", requireAdmin, (req, res) => {
  try {
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const existingEvent = db.prepare("SELECT id FROM events WHERE id = ?").get(eventId);
    if (!existingEvent) return res.status(404).json({ error: "Event not found." });

    db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event." });
  }
});

// POST /api/events/:id/rsvp - Toggle RSVP for the current user
app.post("/api/events/:id/rsvp", requireAuth, (req, res) => {
  try {
    const currentUserId = req.currentUser.id;
    const eventId = Number(req.params.id);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id." });
    }

    const existingEvent = db.prepare("SELECT id FROM events WHERE id = ?").get(eventId);
    if (!existingEvent) return res.status(404).json({ error: "Event not found." });

    const existingRsvp = db
      .prepare("SELECT event_id FROM event_rsvps WHERE event_id = ? AND user_id = ?")
      .get(eventId, currentUserId);

    if (existingRsvp) {
      db.prepare("DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?").run(eventId, currentUserId);
      return res.json({ success: true, isRsvped: false });
    }

    db.prepare("INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)").run(eventId, currentUserId);
    res.json({ success: true, isRsvped: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle RSVP." });
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

// GET /api/groupchats/:id/members - Members of a groupchat with friend status
app.get("/api/groupchats/:id/members", requireAuth, (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const currentUserId = req.currentUser.id;
    const members = db
      .prepare(`
        SELECT u.id, u.username, u.display_name, u.city, u.profile_photo,
          CASE
            WHEN EXISTS(
              SELECT 1 FROM user_friends WHERE user_id = ? AND friend_id = u.id
            ) AND EXISTS(
              SELECT 1 FROM user_friends WHERE user_id = u.id AND friend_id = ?
            ) THEN 'friends'
            WHEN EXISTS(
              SELECT 1 FROM friend_requests fr WHERE fr.requester_id = ? AND fr.receiver_id = u.id AND fr.status = 'pending'
            ) THEN 'outgoing'
            WHEN EXISTS(
              SELECT 1 FROM friend_requests fr WHERE fr.requester_id = u.id AND fr.receiver_id = ? AND fr.status = 'pending'
            ) THEN 'incoming'
            ELSE 'none'
          END AS friend_status,
          CASE
            WHEN EXISTS(
              SELECT 1 FROM user_friends WHERE user_id = ? AND friend_id = u.id
            ) AND EXISTS(
              SELECT 1 FROM user_friends WHERE user_id = u.id AND friend_id = ?
            ) THEN 1
            ELSE 0
          END AS is_friend
        FROM user u
        JOIN user_groupchat ug ON u.id = ug.user_id
        WHERE ug.groupchat_id = ?
        ORDER BY u.display_name ASC
      `)
      .all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, groupId)
      .map((m) => ({
        ...m,
        is_friend: Boolean(m.is_friend),
        friend_status: m.friend_status || (m.is_friend ? "friends" : "none"),
      }));
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch members." });
  }
});

// ---------------------------------------------------------------------------
// Friend requests & friendships
// ---------------------------------------------------------------------------

// POST /api/friend-requests - Send a friend request
app.post("/api/friend-requests", requireAuth, (req, res) => {
  try {
    const requesterId = req.currentUser.id;
    const { receiverId } = req.body;
    if (!receiverId || requesterId === receiverId) {
      return res.status(400).json({ error: "Invalid receiver." });
    }

    const receiver = db.prepare("SELECT id FROM user WHERE id = ?").get(receiverId);
    if (!receiver) return res.status(404).json({ error: "User not found." });

    // Already friends?
    const alreadyFriends = db
      .prepare("SELECT 1 FROM user_friends WHERE user_id = ? AND friend_id = ?")
      .get(requesterId, receiverId);
    if (alreadyFriends) return res.json({ success: true, status: "friends" });

    // If they already requested you, accept both sides automatically
    const incoming = db
      .prepare("SELECT id, status FROM friend_requests WHERE requester_id = ? AND receiver_id = ?")
      .get(receiverId, requesterId);
    if (incoming && incoming.status === "pending") {
      const txn = db.transaction(() => {
        db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(incoming.id);
        db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(requesterId, receiverId);
        db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(receiverId, requesterId);
      });
      txn();
      return res.json({ success: true, status: "friends", autoAccepted: true });
    }

    // Upsert pending request
    db.prepare(`
      INSERT INTO friend_requests (requester_id, receiver_id, status)
      VALUES (?, ?, 'pending')
      ON CONFLICT(requester_id, receiver_id) DO UPDATE SET
        status = 'pending',
        created_at = datetime('now')
    `).run(requesterId, receiverId);

    res.status(201).json({ success: true, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send request." });
  }
});

// GET /api/friend-requests - Incoming pending requests for the current user
app.get("/api/friend-requests", requireAuth, (req, res) => {
  try {
    const receiverId = req.currentUser.id;
    const requests = db
      .prepare(`
        SELECT fr.id, fr.requester_id, fr.created_at,
          u.username, u.display_name, u.city, u.profile_photo
        FROM friend_requests fr
        JOIN user u ON fr.requester_id = u.id
        WHERE fr.receiver_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `)
      .all(receiverId);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requests." });
  }
});

// POST /api/friend-requests/respond - Accept or decline a request
app.post("/api/friend-requests/respond", requireAuth, (req, res) => {
  try {
    const receiverId = req.currentUser.id;
    const { requesterId, action } = req.body;
    if (!requesterId || !["accept", "decline"].includes(action)) {
      return res.status(400).json({ error: "Invalid payload." });
    }

    const request = db
      .prepare("SELECT id, status FROM friend_requests WHERE requester_id = ? AND receiver_id = ?")
      .get(requesterId, receiverId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ error: "Request not found." });
    }

    if (action === "accept") {
      const txn = db.transaction(() => {
        db.prepare("UPDATE friend_requests SET status = 'accepted' WHERE id = ?").run(request.id);
        db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(receiverId, requesterId);
        db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(requesterId, receiverId);
      });
      txn();
      return res.json({ success: true, status: "friends" });
    }

    db.prepare("UPDATE friend_requests SET status = 'declined' WHERE id = ?").run(request.id);
    res.json({ success: true, status: "declined" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request." });
  }
});

// POST /api/friends - Add a friend directly (legacy/manual)
app.post("/api/friends", requireAuth, (req, res) => {
  try {
    const userId = req.currentUser.id;
    const { friendId } = req.body;
    if (!friendId || userId === friendId) return res.status(400).json({ error: "Invalid friend id." });

    const txn = db.transaction(() => {
      db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(userId, friendId);
      db.prepare("INSERT OR IGNORE INTO user_friends (user_id, friend_id) VALUES (?, ?)").run(friendId, userId);
    });
    txn();
    res.json({ success: true, is_friend: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add friend." });
  }
});

// DELETE /api/friends - Remove a friend for both users
app.delete("/api/friends", requireAuth, (req, res) => {
  try {
    const userId = req.currentUser.id;
    const friendId = Number(req.query.friendId);
    if (!friendId) return res.status(400).json({ error: "friendId required." });

    const txn = db.transaction(() => {
      db.prepare("DELETE FROM user_friends WHERE user_id = ? AND friend_id = ?").run(userId, friendId);
      db.prepare("DELETE FROM user_friends WHERE user_id = ? AND friend_id = ?").run(friendId, userId);
    });
    txn();
    res.json({ success: true, is_friend: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove friend." });
  }
});

// GET /api/friends/:userId - List friends
app.get("/api/friends/:userId", requireAuth, (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const friends = db
      .prepare(`
        SELECT u.id, u.username, u.display_name, u.city, u.profile_photo
        FROM user_friends uf
        JOIN user u ON uf.friend_id = u.id
        WHERE uf.user_id = ?
        ORDER BY u.display_name ASC
      `)
      .all(userId);
    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friends." });
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
app.post("/api/messages", requireAuth, (req, res) => {
  try {
    const { userId, groupId, message } = req.body;
    if (!groupId || !message) {
      return res.status(400).json({ error: "groupId and message are required." });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: "Message is too long (max 5000 characters)." });
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
app.put("/api/messages/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: "Message is too long (max 5000 characters)." });
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

// DELETE /api/messages/:id - Delete a message (only within 1 minute of sending)
app.delete("/api/messages/:id", requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const existing = db.prepare("SELECT user_id, sent_time FROM message WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Message not found." });
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own messages." });
    }
    const sentAt = new Date(existing.sent_time.replace(" ", "T") + "Z").getTime();
    if (Date.now() - sentAt > 60 * 1000) {
      return res.status(403).json({ error: "Messages can only be deleted within 1 minute of sending." });
    }
    db.prepare("DELETE FROM message WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete message." });
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
app.put("/api/profile/:userId", requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const { display_name, bio, city, email, profile_photo, hobbies } = req.body;
    if (display_name && display_name.length > 100) return res.status(400).json({ error: "Display name too long (max 100)." });
    if (bio && bio.length > 500) return res.status(400).json({ error: "Bio too long (max 500)." });
    if (email && email.length > 254) return res.status(400).json({ error: "Email too long." });
    if (Array.isArray(hobbies) && hobbies.length > 15) return res.status(400).json({ error: "Too many hobbies (max 15)." });
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
app.put("/api/profile/:userId/password", requireAuth, async (req, res) => {
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
app.put("/api/profile/:userId/username", requireAuth, (req, res) => {
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
    const safeCount = (sql) => {
      try {
        return db.prepare(sql).get().count;
      } catch {
        return 0;
      }
    };
    const userCount = db.prepare("SELECT COUNT(*) as count FROM user").get();
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM user WHERE role = 'admin'").get();
    const messageCount = db.prepare("SELECT COUNT(*) as count FROM message").get();
    const groupchatCount = db.prepare("SELECT COUNT(*) as count FROM groupchat WHERE active = 1").get();
    const personalityCount = db.prepare("SELECT COUNT(*) as count FROM personalitytest").get();
    const pendingReports = safeCount("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'");
    const pendingAppeals = safeCount("SELECT COUNT(*) as count FROM account_appeals WHERE status = 'pending'");
    res.json({
      users: userCount.count,
      admins: adminCount.count,
      messages: messageCount.count,
      groupchats: groupchatCount.count,
      personalityTests: personalityCount.count,
      pendingReports,
      pendingAppeals,
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

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// POST /api/reports - Submit a report against another user
app.post("/api/reports", requireAuth, (req, res) => {
  try {
    const reporterId = req.currentUser.id;
    const { reportedId, reason, description } = req.body;
    const reportedUserId = Number(reportedId);
    const reasonStr = String(reason || "").trim();

    if (!Number.isInteger(reportedUserId) || !reasonStr) {
      return res.status(400).json({ error: "reportedId and reason are required." });
    }
    if (reporterId === reportedUserId) {
      return res.status(400).json({ error: "You cannot report yourself." });
    }

    const target = db.prepare("SELECT id FROM user WHERE id = ?").get(reportedUserId);
    if (!target) return res.status(404).json({ error: "Reported user not found." });

    const result = db
      .prepare("INSERT INTO reports (reporter_id, reported_id, reason, description) VALUES (?, ?, ?, ?)")
      .run(reporterId, reportedUserId, reasonStr, description || null);

    res.status(201).json({ success: true, reportId: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit report." });
  }
});

// GET /api/admin/reports - All reports with user info
app.get("/api/admin/reports", requireAdmin, (req, res) => {
  try {
    const reports = db
      .prepare(`
        SELECT r.id, r.reason, r.description, r.status, r.created_at, r.resolved_at,
          r.reporter_id, rp.username AS reporter_username, rp.display_name AS reporter_display_name,
          r.reported_id, rd.username AS reported_username, rd.display_name AS reported_display_name, rd.active AS reported_active
        FROM reports r
        LEFT JOIN user rp ON r.reporter_id = rp.id
        LEFT JOIN user rd ON r.reported_id = rd.id
        ORDER BY
          CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
          r.created_at DESC
      `)
      .all();
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// PUT /api/admin/reports/:id - Update report status (dismiss, reviewed, action_taken)
app.put("/api/admin/reports/:id", requireAdmin, (req, res) => {
  try {
    const reportId = Number(req.params.id);
    const { status, deactivateUser } = req.body;

    if (!["pending", "reviewed", "dismissed", "action_taken"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const report = db.prepare("SELECT id, reported_id FROM reports WHERE id = ?").get(reportId);
    if (!report) return res.status(404).json({ error: "Report not found." });

    const resolvedAt = status === "pending" ? null : new Date().toISOString();
    db.prepare("UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?")
      .run(status, resolvedAt, reportId);

    if (deactivateUser && report.reported_id) {
      db.prepare("UPDATE user SET active = 0 WHERE id = ?").run(report.reported_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update report." });
  }
});

// DELETE /api/admin/reports/:id - Delete a report
app.delete("/api/admin/reports/:id", requireAdmin, (req, res) => {
  try {
    const reportId = Number(req.params.id);
    const report = db.prepare("SELECT id FROM reports WHERE id = ?").get(reportId);
    if (!report) return res.status(404).json({ error: "Report not found." });
    db.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete report." });
  }
});

// GET /api/admin/appeals - Account reactivation appeals
app.get("/api/admin/appeals", requireAdmin, (req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT a.id, a.user_id, a.message, a.status, a.admin_note, a.created_at, a.resolved_at,
          u.username, u.display_name, u.email, u.active
        FROM account_appeals a
        JOIN user u ON a.user_id = u.id
        ORDER BY
          CASE a.status WHEN 'pending' THEN 0 ELSE 1 END,
          a.created_at DESC
      `)
      .all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appeals." });
  }
});

// PUT /api/admin/appeals/:id - Approve (reactivate) or reject
app.put("/api/admin/appeals/:id", requireAdmin, (req, res) => {
  try {
    const appealId = Number(req.params.id);
    const { status, adminNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be 'approved' or 'rejected'." });
    }
    const appeal = db.prepare("SELECT id, user_id, status FROM account_appeals WHERE id = ?").get(appealId);
    if (!appeal) return res.status(404).json({ error: "Appeal not found." });
    if (appeal.status !== "pending") {
      return res.status(400).json({ error: "This appeal has already been resolved." });
    }
    const note = adminNote != null ? String(adminNote).trim() || null : null;
    const resolvedAt = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        UPDATE account_appeals
        SET status = ?, admin_note = ?, resolved_at = ?
        WHERE id = ?
      `).run(status, note, resolvedAt, appealId);
      if (status === "approved") {
        db.prepare("UPDATE user SET active = 1 WHERE id = ?").run(appeal.user_id);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update appeal." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/match — personality-based matching algorithm
// ---------------------------------------------------------------------------
app.post("/api/match", (req, res) => {
  try {
    const GROUP_SIZE = 5;

    // 1. Users who completed the full 10-question quiz
    const completedUsers = db
      .prepare("SELECT user_id FROM user_hobby_answers GROUP BY user_id HAVING COUNT(*) = 10")
      .all()
      .map((r) => r.user_id);

    if (completedUsers.length < 2) {
      return res.status(400).json({ error: "Not enough users with completed quizzes." });
    }

    // 2. Build answer vectors  userId → [A–E × 10]
    const userAnswers = {};
    const stmtAnswers = db.prepare(`
      SELECT q.question_number, uha.answer
      FROM user_hobby_answers uha
      JOIN questions q ON uha.question_id = q.id
      WHERE uha.user_id = ?
      ORDER BY q.question_number
    `);
    for (const uid of completedUsers) {
      userAnswers[uid] = stmtAnswers.all(uid).map((a) => a.answer);
    }

    // 3. Greedy similarity clustering
    const ungrouped = new Set(completedUsers);
    const groups = [];

    // Shuffle for variety across runs
    const shuffled = [...ungrouped].sort(() => Math.random() - 0.5);

    while (shuffled.filter((u) => ungrouped.has(u)).length >= GROUP_SIZE) {
      const pivot = shuffled.find((u) => ungrouped.has(u));
      if (pivot === undefined) break;

      const scored = [...ungrouped]
        .filter((u) => u !== pivot)
        .map((uid) => ({
          uid,
          score: userAnswers[pivot].reduce(
            (sum, ans, i) => sum + (ans === userAnswers[uid][i] ? 1 : 0),
            0
          ),
        }))
        .sort((a, b) => b.score - a.score);

      const members = [pivot, ...scored.slice(0, GROUP_SIZE - 1).map((s) => s.uid)];
      groups.push(members);
      members.forEach((u) => ungrouped.delete(u));
    }

    // Distribute leftovers into closest group
    for (const uid of ungrouped) {
      let best = 0;
      let bestScore = -1;
      for (let g = 0; g < groups.length; g++) {
        const avg =
          groups[g].reduce(
            (s, m) =>
              s + userAnswers[uid].reduce((t, a, i) => t + (a === userAnswers[m][i] ? 1 : 0), 0),
            0
          ) / groups[g].length;
        if (avg > bestScore) {
          bestScore = avg;
          best = g;
        }
      }
      groups[best].push(uid);
    }

    // 4. Derive group name from dominant answers on Q1 (creative) & Q3 (entertainment)
    const ADJ = { A: "Artsy", B: "Literary", C: "Musical", D: "Maker", E: "Creative" };
    const NOUN = { A: "Gamers", B: "Film Buffs", C: "Bookworms", D: "Podcasters", E: "Explorers" };
    const EMOJI = { A: "🎨", B: "✍️", C: "🎵", D: "🔧", E: "✨" };

    function nameForGroup(memberIds) {
      const q1 = {}, q3 = {};
      for (const uid of memberIds) {
        const a = userAnswers[uid];
        q1[a[0]] = (q1[a[0]] || 0) + 1;
        q3[a[2]] = (q3[a[2]] || 0) + 1;
      }
      const topQ1 = Object.entries(q1).sort((a, b) => b[1] - a[1])[0][0];
      const topQ3 = Object.entries(q3).sort((a, b) => b[1] - a[1])[0][0];
      return { name: `${ADJ[topQ1]} ${NOUN[topQ3]}`, emoji: EMOJI[topQ1] };
    }

    // 5. Persist — keep old groups where friendships exist, create new ones
    const result = db.transaction(() => {
      // Skip seed groups (id <= 3) — they're permanent
      const activeGroups = db.prepare("SELECT id FROM groupchat WHERE active = 1 AND id > 3").all();

      // For each old matched group: snapshot members, decide who stays (has a friend), then apply
      for (const { id: gid } of activeGroups) {
        const memberIds = db.prepare("SELECT user_id FROM user_groupchat WHERE groupchat_id = ?")
          .all(gid).map((r) => r.user_id);
        if (memberIds.length === 0) { db.prepare("UPDATE groupchat SET active = 0 WHERE id = ?").run(gid); continue; }

        // Build a Set of who stays (has at least one friend in the ORIGINAL member list)
        const keeps = new Set();
        for (const uid of memberIds) {
          for (const other of memberIds) {
            if (other === uid) continue;
            const row = db.prepare("SELECT 1 FROM user_friends WHERE user_id = ? AND friend_id = ?").get(uid, other);
            if (row) { keeps.add(uid); break; }
          }
        }

        // Remove members who didn't friend anyone
        for (const uid of memberIds) {
          if (!keeps.has(uid)) {
            db.prepare("DELETE FROM user_groupchat WHERE user_id = ? AND groupchat_id = ?").run(uid, gid);
          }
        }

        // Deactivate groups that dropped below 2 members
        if (keeps.size < 2) {
          db.prepare("UPDATE groupchat SET active = 0 WHERE id = ?").run(gid);
        }
      }

      // Create new matched groups
      const insGroup = db.prepare("INSERT INTO groupchat (name, chat_photo, active) VALUES (?, ?, 1)");
      const insMember = db.prepare("INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES (?, ?)");

      const created = [];
      const usedNames = new Set();

      for (const members of groups) {
        let { name, emoji } = nameForGroup(members);
        let unique = name;
        let n = 2;
        while (usedNames.has(unique)) { unique = `${name} ${n++}`; }
        usedNames.add(unique);

        const r = insGroup.run(unique, emoji);
        const gid = Number(r.lastInsertRowid);
        for (const uid of members) insMember.run(uid, gid);
        created.push({ id: gid, name: unique, emoji, memberCount: members.length });
      }
      return created;
    })();

    res.json({ success: true, groups: result, totalUsers: completedUsers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to run matching." });
  }
});

// ---------------------------------------------------------------------------
// Activation tracking
// ---------------------------------------------------------------------------

// POST /api/activation/test-started — record when a user begins the personality test (once only)
app.post("/api/activation/test-started", requireAuth, (req, res) => {
  try {
    const userId = req.currentUser.id;
    const user = db.prepare("SELECT test_started_at FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!user.test_started_at) {
      db.prepare("UPDATE user SET test_started_at = ? WHERE id = ?")
        .run(new Date().toISOString(), userId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record test start." });
  }
});

// POST /api/activation/chat-joined — record when a user first opens a chat (once only)
app.post("/api/activation/chat-joined", requireAuth, (req, res) => {
  try {
    const userId = req.currentUser.id;
    const user = db.prepare("SELECT first_chat_joined_at FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!user.first_chat_joined_at) {
      db.prepare("UPDATE user SET first_chat_joined_at = ? WHERE id = ?")
        .run(new Date().toISOString(), userId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record chat join." });
  }
});

// GET /api/admin/activation — activation metrics for OKR dashboard
app.get("/api/admin/activation", requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, username, display_name, test_started_at, first_chat_joined_at
      FROM user
      WHERE test_started_at IS NOT NULL
      ORDER BY test_started_at DESC
    `).all();

    const TARGET_MS = 10 * 60 * 1000; // 10 minutes in ms

    const withTimes = rows.map((u) => {
      const startedAt = u.test_started_at;
      const joinedAt = u.first_chat_joined_at;
      const elapsedMs = startedAt && joinedAt
        ? new Date(joinedAt).getTime() - new Date(startedAt).getTime()
        : null;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        test_started_at: startedAt,
        first_chat_joined_at: joinedAt,
        elapsed_ms: elapsedMs,
        met_target: elapsedMs !== null ? elapsedMs <= TARGET_MS : null,
      };
    });

    const completed = withTimes.filter((u) => u.elapsed_ms !== null);
    const avgMs = completed.length
      ? Math.round(completed.reduce((s, u) => s + u.elapsed_ms, 0) / completed.length)
      : null;
    const metTarget = completed.filter((u) => u.met_target).length;
    const chatJoinRate = rows.length
      ? Math.round((completed.length / rows.length) * 100)
      : 0;

    res.json({
      summary: {
        usersStartedTest: rows.length,
        usersJoinedChat: completed.length,
        chatJoinRate,
        avgElapsedMs: avgMs,
        metTargetCount: metTarget,
        metTargetRate: completed.length ? Math.round((metTarget / completed.length) * 100) : 0,
      },
      users: withTimes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch activation data." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
