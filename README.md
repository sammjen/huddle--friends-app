# Huddle

Huddle is a social matching app prototype that helps users find new friends through a short onboarding flow, a personality quiz, and group chat spaces. The current build focuses on a working vertical slice: users can enter profile details, complete the quiz, save results to SQLite through an Express API, and continue into mock group chats.

## Overview

The app is designed for people who want a lower-friction way to meet others with similar personalities and interests. Instead of swiping through individuals, Huddle guides users through a lightweight setup process and then places them into group-based experiences.

Current user flow:

1. Land on the marketing homepage.
2. Start onboarding and enter profile details.
3. Complete a 4-question personality quiz.
4. Submit quiz answers to the backend.
5. View a success state and continue to the chat experience.

## Current Features

- Responsive landing page with product messaging and reviews
- Profile onboarding form with lightweight client-side sign-in
- Four-question personality quiz with slider-based answers
- Express API endpoint that stores quiz submissions in SQLite
- Mock chat list with countdown to the next group drop
- Mock group conversation screen with send-message UI
- Light and dark theme toggle
- Mobile-friendly navigation and layouts

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router |
| UI and Styling | Tailwind CSS, shadcn/ui, Radix UI, Lucide React |
| State and Utilities | React Context, TanStack Query |
| Backend | Node.js, Express |
| Database | SQLite with `better-sqlite3` |
| Testing | Vitest, Testing Library |

## Architecture

```text
Browser
  |
  v
React + Vite frontend (`localhost:8080`)
  - Landing page
  - Onboarding flow
  - Personality quiz
  - Mock chat experience
  |
  v
Express API (`localhost:3001`)
  - POST /api/personality-results
  - GET /api/personality-results/count
  |
  v
SQLite database (`db/app.db`)
  - Stores personality test submissions
  - Includes schema and seed data for other planned entities
```

## Project Structure

```text
src/
  components/      Shared UI, header, auth, theme
  pages/           Route-level screens
  test/            Vitest setup and example test
server/
  server.js        Express API
  init-db.js       Database initialization script
db/
  schema.sql       Database schema
  seed.sql         Seed data
  app.db           Generated local SQLite database
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/get-started` | Profile onboarding |
| `/personality-test` | Quiz flow |
| `/chats` | Group chat list |
| `/chat/:groupId` | Individual chat screen |

## Data and Persistence

Two parts of the app currently persist data:

- Quiz submissions are saved to SQLite in `db/app.db`.
- Basic auth state is stored in `localStorage` under `huddle-user`.

The chat experience is currently mock data on the frontend. Users can type and send messages during a session, but those messages are not stored in the database.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer

Check your versions:

```sh
node --version
npm --version
```

## Installation

Clone the repo and install frontend dependencies:

```sh
git clone <your-repository-url>
cd huddle--friends-app-1
npm install
```

Install backend dependencies and initialize the SQLite database:

```sh
npm run server:setup
```

That command:

- installs dependencies inside `server/`
- creates or updates `db/app.db`
- runs `db/schema.sql`
- runs `db/seed.sql`

## Environment Variables

For local development, no environment variables are required if you use the Vite dev server proxy.

Optional frontend environment variable:

```sh
VITE_API_URL=http://localhost:3001
```

Notes:

- In development, requests to `/api` are proxied by `vite.config.ts` to `http://localhost:3001`.
- A production environment file currently exists with a deployed API URL, but local development works without it.
- If you change the backend port, update either `VITE_API_URL` or the Vite proxy target.

## Running the App

Start the backend:

```sh
npm run server
```

Start the frontend in a second terminal:

```sh
npm run dev
```

Local URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`

## Available Scripts

From the project root:

```sh
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:watch
npm run server
npm run server:init
npm run server:setup
```

## API Endpoints

### `POST /api/personality-results`

Saves a 4-question quiz submission.

Example request body:

```json
{
  "q1": 50,
  "q2": 3,
  "q3": 50,
  "q4": 50
}
```

### `GET /api/personality-results/count`

Returns the total number of saved quiz submissions.

## Manual Verification

To verify the main vertical slice locally:

1. Open `http://localhost:8080`.
2. Click `Get Started`.
3. Fill in at least first name and city.
4. Complete the personality quiz.
5. Submit the final question.
6. Confirm you reach the success screen and can continue to `Find My Group`.

To verify the database was updated:

```sh
sqlite3 db/app.db "SELECT * FROM personalitytest ORDER BY id DESC LIMIT 5;"
sqlite3 db/app.db "SELECT * FROM personalityquestion ORDER BY id DESC LIMIT 8;"
```

Or check the API directly:

```sh
curl http://localhost:3001/api/personality-results/count
```

## Testing

Run the test suite with:

```sh
npm run test
```

At the moment, the repository includes only a simple example test, so manual testing is still important.

## Known Limitations

- Authentication is client-side only and not secure for production use.
- Chat groups and messages are mock frontend data.
- The quiz result is stored, but matching logic is not implemented yet.
- There is no real user account creation or backend session handling.
- Automated test coverage is minimal.

## EARS Requirements

The following requirements are written using the Easy Approach to Requirements Syntax (EARS). Each requirement uses one of the standard EARS patterns: ubiquitous (unconditional), event-driven (WHEN), state-driven (WHILE), unwanted behavior (IF/WHEN), or optional feature (WHERE).

### Landing Page

- The system shall display a marketing landing page at the root route (`/`).
- The system shall display user reviews on the landing page.
- WHEN a user clicks the "Get Started" button, the system shall navigate the user to the `/get-started` onboarding route.

### Onboarding and Profile

- WHEN a user visits `/get-started`, the system shall present a profile onboarding form requesting at least a first name and city.
- WHEN a user submits the onboarding form with a first name and city, the system shall store the profile data in `localStorage` under the key `huddle-user`.
- IF a user submits the onboarding form without entering a first name or city, the system shall prevent navigation and indicate which required fields are missing.
- WHEN a user completes the onboarding form, the system shall navigate the user to the personality test at `/personality-test`.

### Personality Quiz

- WHEN a user visits `/personality-test`, the system shall present a four-question personality quiz with slider-based inputs.
- WHILE a user is progressing through the quiz, the system shall display only one question at a time and track the current step.
- WHEN a user submits the final quiz question, the system shall POST the four slider values to `POST /api/personality-results`.
- WHEN the API returns a success response, the system shall display a success state and offer a "Find My Group" action.
- IF the API request fails, WHEN the user submits the quiz, the system shall display an error message and allow the user to retry.

### Backend API

- The system shall expose a `POST /api/personality-results` endpoint that accepts a JSON body containing values for `q1`, `q2`, `q3`, and `q4`.
- WHEN a valid quiz submission is received, the system shall persist the record to the SQLite database and return a success response.
- The system shall expose a `GET /api/personality-results/count` endpoint that returns the total number of stored quiz submissions.
- IF a request to `POST /api/personality-results` is missing required fields, the system shall return an appropriate error response without writing to the database.

### Chat Experience

- WHEN a user navigates to `/chats`, the system shall display a list of available group chats and a countdown to the next group drop.
- WHEN a user selects a group from the chat list, the system shall navigate the user to `/chat/:groupId` and display the group conversation.
- WHILE a user is on a group conversation screen, the system shall display a message input field and a send button.
- WHEN a user types a message and submits it, the system shall append the message to the conversation view within the current session.

### Theme

- The system shall support both a light theme and a dark theme.
- WHEN a user toggles the theme control, the system shall switch the active theme between light and dark.
- WHILE the dark theme is active, the system shall apply dark-mode styles across all pages and components.

### Navigation and Routing

- The system shall render a consistent application header with navigation links on all authenticated screens.
- WHEN a user navigates to a route that does not exist, the system shall display a 404 not-found page.
- WHILE a user is not signed in, the system shall restrict access to the chat routes and redirect the user to onboarding.

### Performance and Compatibility

- The system shall render all pages in a mobile-friendly layout without horizontal scrolling on viewports 320 px wide and above.
- The system shall serve the frontend from `http://localhost:8080` and the API from `http://localhost:3001` during local development.
- WHERE the Vite dev server proxy is active, the system shall forward all `/api` requests from the frontend to the backend without requiring a separate `VITE_API_URL` environment variable.

## Future Improvements

- Add real authentication and user accounts
- Persist groups and chat messages in the database
- Implement friend/group matching based on quiz results
- Expand automated testing for the onboarding and API flows
- Add deployment documentation
