import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// All demo users share this password: "demo123"
const DEMO_PASSWORD = bcrypt.hashSync("demo123", 10);

const CITIES = ["Denver", "Boulder", "Aurora", "Lakewood", "Fort Collins", "Colorado Springs"];

// 100 diverse demo users
const NAMES = [
  "Alex Rivera", "Jordan Kim", "Taylor Chen", "Casey Morgan", "Riley Brooks",
  "Avery Patel", "Quinn Santos", "Dakota Lee", "Jamie Reyes", "Morgan Wright",
  "Sam Nakamura", "Drew Johnson", "Blake Martinez", "Cameron Singh", "Emerson Diaz",
  "Finley Obrien", "Harper Tran", "Hayden Clark", "Jesse Okafor", "Kai Williams",
  "Lane Thompson", "Logan Hernandez", "Marley Jackson", "Nico Petrov", "Parker Bell",
  "Peyton Foster", "Reagan Sharma", "Reese Nguyen", "Robin Alvarez", "Rowan Murphy",
  "Sage Cooper", "Skyler Davis", "Spencer Liu", "Sydney Adams", "Tatum Brown",
  "Toby Garcia", "Wren Bailey", "Addison James", "Ainsley Kapoor", "Archer Ross",
  "Bellamy Scott", "Briar Wilson", "Campbell Lopez", "Charlie Evans", "Dallas Moore",
  "Eden Huang", "Elliot Fischer", "Frankie Turner", "Glenn Park", "Gray Mitchell",
  "Harlow Young", "Indie Robinson", "Jules Ramirez", "Kendall White", "Kit Anderson",
  "Lake Thomas", "Lennox Martin", "Madden Taylor", "Milan Pham", "Monroe Hill",
  "Noel Green", "Oakley Torres", "Palmer King", "Phoenix Stone", "Presley Wood",
  "Remy Carter", "River Shaw", "Salem Baker", "Scout Price", "Shiloh Campbell",
  "Sterling Morris", "Story Reed", "Sutton Cox", "Teagan Long", "True Howard",
  "Unique Flores", "Val Griffin", "West Simmons", "Winter Hayes", "Zephyr Collins",
  "Ari Jenkins", "Bowie Perry", "Cedar Butler", "Darcy Barnes", "Ellis Stewart",
  "Fable Rogers", "Greer Nelson", "Haven Bennett", "Indigo Cruz", "Justice Murray",
  "Kirby Wells", "Landry Palmer", "Marlowe Dixon", "Noa Gibson", "Ocean Hunt",
  "Poet Mason", "Revel Sullivan", "Sailor Ford", "Trace Daniels", "Vesper Grant",
];

// 8 personality archetypes — base answer patterns for 10 questions (A–E each)
// Q1: Creative  Q2: Physical  Q3: Entertainment  Q4: Social  Q5: Food
// Q6: Intellect Q7: Collecting Q8: Music  Q9: Online  Q10: Wellness
const ARCHETYPES = [
  { name: "Creative",  answers: ["A","B","C","B","A","C","B","C","A","D"] },
  { name: "Gamer",     answers: ["D","B","A","D","E","A","A","D","B","D"] },
  { name: "Athlete",   answers: ["D","A","B","A","B","B","D","A","A","B"] },
  { name: "Nature",    answers: ["A","C","C","B","A","B","C","B","C","A"] },
  { name: "Music",     answers: ["C","B","B","B","B","C","B","A","A","D"] },
  { name: "Scholar",   answers: ["B","B","D","C","A","A","D","B","C","C"] },
  { name: "Social",    answers: ["C","A","B","A","B","D","D","A","A","D"] },
  { name: "Wellness",  answers: ["B","C","D","C","D","C","C","B","C","A"] },
];

// 13+13+13+12+12+13+12+12 = 100
const ARCHETYPE_SIZES = [13, 13, 13, 12, 12, 13, 12, 12];

const LETTERS = ["A", "B", "C", "D", "E"];

function mutateAnswers(baseAnswers, mutations) {
  const result = [...baseAnswers];
  const indices = new Set();
  while (indices.size < mutations) {
    indices.add(Math.floor(Math.random() * 10));
  }
  for (const idx of indices) {
    let next;
    do { next = LETTERS[Math.floor(Math.random() * 5)]; } while (next === result[idx]);
    result[idx] = next;
  }
  return result;
}

// Verify questions are seeded
const questionIds = db.prepare("SELECT id, question_number FROM questions ORDER BY question_number").all();
if (questionIds.length < 10) {
  console.error("Questions not seeded yet. Run  npm run server:init  first.");
  db.close();
  process.exit(1);
}
const questionMap = Object.fromEntries(questionIds.map((q) => [q.question_number, q.id]));

const insertUser = db.prepare(
  "INSERT OR IGNORE INTO user (username, password, city, display_name, role) VALUES (?, ?, ?, ?, 'user')"
);
const getUserId = db.prepare("SELECT id FROM user WHERE username = ?");

const upsertAnswer = db.prepare(`
  INSERT INTO user_hobby_answers (user_id, question_id, answer)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id, question_id) DO UPDATE SET answer = excluded.answer
`);

const txn = db.transaction(() => {
  let nameIdx = 0;

  for (let arcIdx = 0; arcIdx < ARCHETYPES.length; arcIdx++) {
    const archetype = ARCHETYPES[arcIdx];
    const count = ARCHETYPE_SIZES[arcIdx];

    for (let i = 0; i < count; i++) {
      const fullName = NAMES[nameIdx];
      const username = fullName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 15);
      const city = CITIES[nameIdx % CITIES.length];

      // 0–2 answer mutations so members within an archetype still cluster together
      const mutations = Math.floor(Math.random() * 3);
      const answers = mutateAnswers(archetype.answers, mutations);

      const result = insertUser.run(username, DEMO_PASSWORD, city, fullName);
      const userId = result.changes > 0
        ? Number(result.lastInsertRowid)
        : getUserId.get(username).id;

      for (let qNum = 1; qNum <= 10; qNum++) {
        upsertAnswer.run(userId, questionMap[qNum], answers[qNum - 1]);
      }

      nameIdx++;
    }
  }

  // Also give the existing "demo" user quiz answers if they exist
  const demoUser = db.prepare("SELECT id FROM user WHERE username = 'demo'").get();
  if (demoUser) {
    const demoAnswers = mutateAnswers(ARCHETYPES[0].answers, 1);
    for (let qNum = 1; qNum <= 10; qNum++) {
      upsertAnswer.run(demoUser.id, questionMap[qNum], demoAnswers[qNum - 1]);
    }
  }
});

txn();

// Add all demo users to every active groupchat (including "The Boys")
const activeChats = db.prepare("SELECT id FROM groupchat WHERE active = 1").all();
const allDemoUsers = db.prepare("SELECT id FROM user WHERE role = 'user'").all();
const insertMembership = db.prepare(
  "INSERT OR IGNORE INTO user_groupchat (user_id, groupchat_id) VALUES (?, ?)"
);

const membershipTxn = db.transaction(() => {
  for (const user of allDemoUsers) {
    for (const chat of activeChats) {
      insertMembership.run(user.id, chat.id);
    }
  }
});
membershipTxn();

const userCount = db.prepare("SELECT COUNT(*) as c FROM user WHERE role = 'user'").get();
const answerCount = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM user_hobby_answers").get();
const memberCount = db.prepare("SELECT COUNT(*) as c FROM user_groupchat").get();

console.log(`Done — ${userCount.c} users, ${answerCount.c} with personality answers.`);
console.log(`${memberCount.c} groupchat memberships (all users added to ${activeChats.length} active chats).`);
console.log("Demo password for all seeded users: demo123");

db.close();
