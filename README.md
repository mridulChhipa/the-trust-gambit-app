# The Trust Gambit App

An interactive social deduction experience built with Next.js 15. Players join admin-configured games, get seated into lobbies, submit round actions, and track progress through real-time leaderboards, delegation graphs, and Supabase-backed scoring.

## Tech Stack
- Next.js App Router (React 19)
- Supabase (Auth, Postgres, Edge Functions)
- Socket.IO for real-time lobby and round events
- Tailwind CSS v4 for styling
- Node.js runtime for auxiliary WebSocket server (`server.js`)

## Prerequisites
- Node.js 18+ and npm 9+
- Supabase project with the schema from `src/app/database.sql`
- Access to configure environment variables for Supabase URL and keys

## Setup
1. Install dependencies:
	 ```bash
	 npm install
	 ```
2. Copy `.env.local` (or create one) and provide project-specific values:
	 ```bash
	 NEXT_PUBLIC_SUPABASE_URL=...           # Supabase project URL
	 NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Public anon key
	 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... # Same as anon or custom JWT
	 ```
	 Keep keys secret; never commit real credentials.
3. Apply the database schema in Supabase using `src/app/database.sql`. Run the file once to create tables, relationships, and helper functions referenced by the app.

## Running Locally
- Start the Next.js app and WebSocket relay:
	```bash
	npm run dev
	```
	This spawns the Next.js dev server (`npm run dev:next`) and the Socket.IO bridge (`npm run dev:ws`).
- Build for production:
	```bash
	npm run build
	npm start
	```

## Key Scripts
- `npm run dev` – Next.js dev server plus Socket.IO relay
- `npm run dev:next` – Next.js dev server only
- `npm run dev:ws` – Local Socket.IO relay (`server.js`)
- `npm run build` – Generate optimized production build
- `npm run start` – Run the production build
- `npm run lint` – Lint the project with Next.js defaults

## Project Highlights
- **Lobby-aware gameplay**: Admins seat players into lobbies; leaderboard and delegation views stay scoped to the player’s lobby.
- **Round lifecycle**: Admins can create, edit, delete, and process rounds. Completing a round computes scores in Supabase before advancing to the next pending round.
- **Real-time updates**: Socket.IO pushes lobby assignments, round transitions, and game completion events directly to connected clients.
- **Server Actions**: Business logic lives in `src/app/actions.js`, coordinating Supabase queries, scoring routines, and path revalidation.

## Deployment Notes
- Provide the same environment variables at build and runtime (Vercel or other hosting providers).
- Ensure the WebSocket server runs alongside the Next.js deployment if real-time updates are required in production. The simple `server.js` can be adapted to your hosting platform or merged into a managed WebSocket solution.

## Troubleshooting
- **Auth issues**: Verify Supabase URL and keys. Check that the browser receives a valid session and that server-side requests include the cookies.
- **Missing real-time events**: Confirm `server.js` is running and that clients connect to the configured Socket.IO endpoint.
- **Score discrepancies**: Re-run the Supabase function logic by using the admin UI to reprocess rounds; ensure `calculateScoresForRound` has matching schema objects in the database.

For deeper customization, explore the `src/app` directory for App Router routes and UI components, and `src/lib` for Supabase and Socket helpers.
