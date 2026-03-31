import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, "..", "db", "app.db"));

// Get demo user IDs
const users = db.prepare("SELECT id, username, display_name FROM user WHERE role = 'user' LIMIT 20").all();

// 5 pending reports
const insertReport = db.prepare(
  "INSERT INTO reports (reporter_id, reported_id, reason, description, status) VALUES (?, ?, ?, ?, 'pending')"
);

const reports = [
  { reporter: 0, reported: 5, reason: "Harassment", description: "Sent repeated unwanted messages after being asked to stop." },
  { reporter: 1, reported: 6, reason: "Spam", description: "Keeps posting links to random websites in the group chat." },
  { reporter: 2, reported: 7, reason: "Inappropriate content", description: "Shared inappropriate images in the chat." },
  { reporter: 3, reported: 8, reason: "Impersonation", description: "Pretending to be someone else and misleading other users." },
  { reporter: 4, reported: 9, reason: "Threatening behavior", description: "Made threatening comments toward another group member." },
];

for (const r of reports) {
  insertReport.run(users[r.reporter].id, users[r.reported].id, r.reason, r.description);
}

// Deactivate 5 users and create pending appeals
const deactivateUser = db.prepare("UPDATE user SET active = 0 WHERE id = ?");
const insertAppeal = db.prepare(
  "INSERT INTO account_appeals (user_id, message, status) VALUES (?, ?, 'pending')"
);

const appeals = [
  { userIdx: 10, message: "I was banned unfairly. I never harassed anyone — I think there was a misunderstanding in the group chat. Please review my messages." },
  { userIdx: 11, message: "My account was deactivated but I believe it was a mistake. I would love the chance to rejoin and continue meeting new friends." },
  { userIdx: 12, message: "I apologize for my behavior. I was having a rough day and said things I regret. I promise to follow community guidelines going forward." },
  { userIdx: 13, message: "Someone reported me for spam but I was just sharing a study group link. It was not spam — it was relevant to our chat topic." },
  { userIdx: 14, message: "I did not realize my messages were making people uncomfortable. I have read the community guidelines now and understand what I did wrong." },
];

for (const a of appeals) {
  deactivateUser.run(users[a.userIdx].id);
  insertAppeal.run(users[a.userIdx].id, a.message);
}

console.log(`Created 5 reports and 5 appeals.`);
console.log("Reports from:", reports.map(r => users[r.reporter].display_name).join(", "));
console.log("Appeals from:", appeals.map(a => users[a.userIdx].display_name).join(", "));

db.close();
