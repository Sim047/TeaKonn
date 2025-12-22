# AI Assistant Setup (TeaKonn)

This doc explains how to enable and configure the in-app AI assistant and semantic search.

## Features
- Assistant chat: Guides users to events, services, marketplace, and community connections.
- Quick search: Regex-based search over Events, Services, and Users.
- Themed floating widget: Appears bottom-right across the app.

## Environment Variables
Backend (Railway/Render):
- `AI_ENABLED`: Enable AI routes. Defaults to `true`. Set `false` to disable `/api/ai/*`.
- `OPENAI_API_KEY`: Optional. When set, assistant replies use OpenAI; otherwise a local fallback message is used.

Frontend (Vercel):
- `VITE_ASSISTANT_ENABLED`: Show the widget. Defaults to `true`. Set to `false` to hide.
- `VITE_API_URL`: Your backend URL (already required for API).

## Files
- Backend routes: `backend/src/routes/ai.js` (search + assistant endpoints)
- Route registration: `backend/src/server.js`
- Frontend widget: `frontend/src/components/AssistantWidget.tsx`
- Integration: `frontend/src/App.tsx`

## Quick Start
1. Set envs on backend:
   - `AI_ENABLED=true`
   - `OPENAI_API_KEY=sk-...` (optional)
2. Set envs on frontend:
   - `VITE_ASSISTANT_ENABLED=true`
   - `VITE_API_URL=https://your-backend.example.com`
3. Deploy both services. The widget renders bottom-right.

## Notes
- Current search is simple (regex). For true semantic search, add MongoDB Atlas Vector Search or Pinecone and an embeddings pipeline.
- Assistant keeps responses concise; you can extend prompts in `ai.js`.
- Respect privacy: the assistant and search omit emails; it uses `favoriteSports` and public data.

## Troubleshooting
- Widget not visible: Ensure `VITE_ASSISTANT_ENABLED` is not `false` and cached build is updated.
- 404 on `/api/ai/*`: Check `AI_ENABLED` on backend.
- OpenAI errors: Verify `OPENAI_API_KEY` and outbound network from backend.
