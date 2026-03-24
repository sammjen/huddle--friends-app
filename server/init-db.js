import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);

const schemaPath = join(__dirname, "..", "db", "schema.sql");
const seedPath = join(__dirname, "..", "db", "seed.sql");

console.log("Initializing database at", dbPath);

db.exec(readFileSync(schemaPath, "utf-8"));
console.log("Schema created.");

// Migrations: add columns that may not exist in older databases
const migrations = [
  "ALTER TABLE message ADD COLUMN edited INTEGER DEFAULT 0",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
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

db.exec(readFileSync(seedPath, "utf-8"));
console.log("Seed data inserted.");

db.close();
console.log("Database ready.");
