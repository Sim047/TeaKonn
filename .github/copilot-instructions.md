<!-- .github/copilot-instructions.md - guidance for AI coding agents working in this repo -->
# TeaKonn — AI agent quick instructions

These are short, actionable notes to help an AI agent be productive when editing or extending this codebase.

- Project: MERN chat app split into two services:
  - `backend/` — Express + Mongoose + Socket.IO (API + WebSocket server)
  - `frontend/` — Vite + React (TypeScript) client using axios and socket.io-client

- Run / dev commands:
  - Backend: cd `backend` → `npm install` → `npm run dev` (nodemon watching `src/server.js`) or `npm start` for production.
  - Frontend: cd `frontend` → `npm install` → `npm run dev` (Vite). Build: `npm run build`.
    - Tip for deployment: set `VITE_API_URL` in Vercel project environment variables to your backend URL (example: `https://teakonn-backend.onrender.com`).

- Important environment vars (backend):
  - `MONGO_URI` — MongoDB connection string (required)
  - `JWT_SECRET` — JWT signing secret (used by `src/routes/auth.js`)
  - `FRONTEND_URL` — CORS / socket allowed origin (defaults to `*`)
  - `UPLOAD_DIR` — directory name for static uploads (defaults to `uploads`)

- Key integration & runtime patterns to preserve:
  - Socket flows are in `backend/src/server.js`. Events used by frontend include: `join_room`, `send_message`, `receive_message`, `edit_message`, `message_edited`, `delete_message`, `message_deleted`, `react`, `reaction_update`, `typing`, `presence_update`.
  - Frontend uses a centralized socket client: `frontend/src/socket.tsx` exports `socket` and `SocketProvider`. Wrap the app with `SocketProvider` (see `frontend/src/main.tsx`) and import `socket` from `frontend/src/socket.tsx` instead of creating multiple clients.
  - Backend exposes the running `io` and `onlineUsers` map via `app.set('io', io)` and `app.set('onlineUsers', onlineUsers)` — other routes use these to emit socket events.
  - Messages are persisted in Mongo (`backend/src/models/Message.js`) and per-user hiding is implemented (`hiddenFor` array) — deleting vs hiding are distinct behaviors.
  - Auth is JWT-based (see `backend/src/routes/auth.js`) and client stores `token` + `user` in localStorage.
  - Frontend uses env var `VITE_API_URL` for axios / socket base URLs (look at `frontend/src/App.tsx` and `frontend/src/utils/api.ts`). Some files include legacy patterns (e.g., `process.env.REACT_APP_API_URL` in `frontend/src/socket.tsx`) — prefer `import.meta.env.VITE_API_URL` in Vite context.
  - `FRONTEND_URL` on the backend accepts comma-separated domains (e.g., `https://teakonn-app.vercel.app,https://your-preview.vercel.app`). This allows preview/deployment domains while keeping CORS tight.

- File upload handling:
  - Uploads are accepted at `POST /api/files/upload` (route in `backend/src/routes/files.js`) and served at `/uploads/*` from the `uploads/` directory.

- Conventions & patterns to follow when editing:
  - Keep socket event names consistent with `backend/src/server.js` and `frontend/src/App.tsx` — changing names requires edits on both sides.
  - Backend code uses ES modules ("type": "module" in package.json) so use import/export.
  - Routes use `auth` middleware (`backend/src/middleware/auth.js`) — don't bypass authentication for protected endpoints.
  - Preserve per-user semantics (e.g., hidden messages) when changing delete behavior.

- Useful places to look for examples:
  - `backend/src/routes/messages.js` — shows REST + socket interactions (edit, delete, hide, restore).
  - `backend/src/server.js` — socket lifecycle / presence / message flows.
  - `frontend/src/App.tsx` — single-file demo usage of sockets, message send flow, file upload, and many UI interactions.

If anything is unclear or you'd like the instructions tailored to a different level of detail (e.g., testing, CI, or deployment workflows), tell me which area to expand. ✅

Deployment checklist (Vercel + Render):

- Vercel (frontend):
  - Ensure `VITE_API_URL` points to your backend (e.g., Render service URL). This value is compiled into the Vite build and used for axios baseURLs and socket connections.
  - Vercel builds the frontend using `npm run build` and serves `dist/` (see `vercel.json`).

- Render (backend):
  - The backend uses `MONGO_URI` and `JWT_SECRET` — configure them in Render's dashboard or your render.yaml secrets.
  - Set `FRONTEND_URL` in Render to your Vercel URL so CORS and socket origin are restricted (a wildcard `*` is tolerated for development but not recommended for production).
  - The server exposes `GET /` which returns { ok: true } and helps with health checks / readiness probes.

