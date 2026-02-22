# Database

This folder contains SQL scripts to create and populate the BB Find a Friend database.

## Tables (ERD)

Schema matches the project ERD:

- **user** – App users (username, password, city, active, in_next_cycle)
- **reviews** – User reviews (user_id, rating, comment)
- **message** – Chat messages (user_id, groupchat_id, message, sent_time, delivered)
- **groupchat** – Chat groups (name, chat_photo, active)
- **user_groupchat** – Junction table for user ↔ groupchat many-to-many
- **personalitytest** – Personality test submissions (user_id, results JSON, template_id)
- **personalityquestion** – Individual question answers per test
- **templatePersonalityTest** – Test templates
- **templatePersonalityQuestion** – Template question definitions

## Local setup (SQLite)

From the project root:

```sh
npm run server:setup
```

This installs the server dependencies and creates `db/app.db` by running `schema.sql` and `seed.sql` via the init script.

## Manual setup

To run the scripts manually against SQLite:

```sh
sqlite3 db/app.db < db/schema.sql
sqlite3 db/app.db < db/seed.sql
```

For PostgreSQL or MySQL, you may need to adapt the schema (e.g., `AUTOINCREMENT` → `SERIAL`, `datetime('now')` → `NOW()`).
