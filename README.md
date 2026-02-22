# BB Find a Friend

## App Summary

BB Find a Friend helps people form lasting friendships by connecting them with compatible groups based on their personality and social preferences. The primary users are individuals who struggle to meet new people or want to expand their social circle—whether they’re new to an area, have shifting schedules, or prefer structured ways to make friends. The app offers a personality test to understand how outgoing and social a user is, then matches them with groups for activities like sports, gaming, study, or casual hangouts. Users can browse groups, view member lists, and chat within groups. The product reduces the friction of finding like-minded friends and provides a single place to discover and join social groups.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, React Router, TanStack Query |
| **UI & Styling** | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons |
| **Backend** | Node.js, Express |
| **Database** | SQLite (via better-sqlite3) |
| **Authentication** | Not yet implemented |
| **External Services** | None |

## Architecture Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ HTTP (browser)
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Vite + React)                  │
│                      http://localhost:8080                   │
│  - Personality Test, Chats, Reviews                          │
│  - Calls /api/* for backend operations                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP (fetch)
                               │ /api/personality-results (POST)
                               │ /api/personality-results/count (GET)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express)                        │
│                    http://localhost:3001                     │
│  - REST API for personality results                          │
│  - Validates input, persists to DB, returns JSON             │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (SQLite)                          │
│                      db/app.db                               │
│  - user, reviews, message, groupchat,                        │
│    user_groupchat, personalitytest, personalityquestion,     │
│    templatePersonalityTest, templatePersonalityQuestion      │
└─────────────────────────────────────────────────────────────┘
```

**Flow for Personality Test submit:**
1. User completes sliders and clicks **Next**
2. Frontend sends `POST /api/personality-results` with `{ q1, q2, q3, q4 }`
3. Backend inserts into `personalitytest` and `personalityquestion` tables
4. Backend returns `{ id, totalSubmissions, ... }`
5. Frontend displays the result (submission # and total count) and shows "Continue to Chats"

## Prerequisites

| Software | Purpose | Installation |
|----------|---------|--------------|
| **Node.js** (v18+) | Runtime for frontend and backend | [nodejs.org](https://nodejs.org/) or [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) |
| **npm** | Package manager (included with Node.js) | — |

**Verify installation:**

```sh
node --version   # Expect v18.x or higher
npm --version    # Expect 9.x or higher
```

No separate database server is required; SQLite runs as a file-based database.

## Installation and Setup

### 1. Clone the repository

```sh
git clone <YOUR_GIT_URL>
cd kindred-connect-38
```

### 2. Install frontend dependencies

```sh
npm install
```

### 3. Create the database

Initialize the database from `db/schema.sql` and `db/seed.sql`:

```sh
npm run server:setup
```

This script installs server dependencies, creates `db/app.db`, runs the schema, and inserts sample data.

### 4. Environment variables

None required. The backend uses `PORT=3001` by default. If port 3001 is in use, run `PORT=3002 npm run server` and ensure the Vite proxy in `vite.config.ts` targets `http://localhost:3002` (or whatever port you use).

## Running the Application

### Terminal 1 – Backend

```sh
npm run server
```

Backend runs at **http://localhost:3001** (or the port in `PORT`). If you changed `PORT`, ensure `vite.config.ts` proxies `/api` to that port.

### Terminal 2 – Frontend

```sh
npm run dev
```

Frontend runs at **http://localhost:8080**.

Open **http://localhost:8080** in your browser.

## Verifying the Vertical Slice

This section confirms the Personality Test "Next" button correctly updates the database and reflects the change in the UI.

### 1. Trigger the feature

1. Open http://localhost:8080
2. Click **Get Started** (or **Log in**) and go through the flow
3. Navigate to **Personality Test** (via the menu or Get Started → Next)
4. Adjust the sliders for the four questions
5. Click **Next**

### 2. Confirm the database was updated

A success message should appear with:
- "You are submission #X"
- "Total submissions: Y"

The backend inserted into the `personalitytest` and `personalityquestion` tables. To verify, use the SQLite CLI (if installed):

```sh
sqlite3 db/app.db "SELECT * FROM personalitytest ORDER BY id DESC LIMIT 5;"
```

Or query the API (use the port your server runs on):

```sh
curl http://localhost:3001/api/personality-results/count
# or, if using PORT=3002: curl http://localhost:3002/api/personality-results/count
```

The `total` value should match the count shown in the UI.

The newest row in the table should match your last submission.

### 3. Verify persistence after refresh

1. On the Personality Test page, note the total count after submitting (e.g., "Total submissions: 11")
2. Click **Continue to Chats** (or navigate away and back)
3. Return to the Personality Test page and submit again
4. The new submission should be #12 (or higher), and the total count should increase

Because data is stored in `db/app.db`, it persists across restarts of the backend. Restarting the server and resubmitting will still show an incrementing submission ID and total count.

---

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID
