TEAKONN Backend — Complete Robust Scaffold
---------------------------------------

Quick start:

1. Copy .env example:
   cp .env.example .env
   Edit .env (MONGO_URI, JWT_SECRET)

2. Install:
   npm install

3. Run in dev:
   npm run dev

Endpoints:
- POST  /api/auth/register   { username, email, password }
- POST  /api/auth/login      { email, password }
- POST  /api/users/avatar    (auth, form-data file 'avatar') -> returns { success: true, user }
- GET   /api/messages/:room  (auth) -> messages
- POST  /api/files/upload    (form-data file 'file') -> { url: '/uploads/...' }

Venue Booking System:
- POST  /api/venues/create           (auth venue_owner) { name, location, capacity.max, description?, images? }
- GET   /api/venues/search           (query: name, city, capacityMin, capacityMax, page, limit)
- GET   /api/venues/my               (auth venue_owner) → list my venues
- POST  /api/booking-requests/create (auth) { venueId } → creates negotiation conversation
- GET   /api/booking-requests/:id    (auth) → requester/owner can view
- GET   /api/booking-requests/my/sent     (auth)
- GET   /api/booking-requests/my/received (auth)
- POST  /api/payments/initiate       (auth venue_owner) { bookingRequestId, amount, currency?, idempotencyKey? }
- POST  /api/payments/callback       (M-PESA webhook stub) { externalRef?, status, idempotencyKey? }
- POST  /api/tokens/generate         (auth venue_owner) { bookingRequestId, expiresInHours? } → sends token in chat
- POST  /api/tokens/verify           (auth) { code } → validates token for requester
- POST  /api/events                  (auth) { bookingTokenCode, ... } → creates event; auto-populates venue/location and consumes token

Notes:
- Uploads stored in uploads/ (make sure Render persistent disk set)
- Serve uploads: /uploads/*
- Socket.IO integrated in server.js (events: join_room, send_message, react, edit_message, delete_message, delivered, read, typing)
- Booking tokens are one-time use, tied to requester, venue, and booking request; tokens auto-expire and cannot be reused. Venue is marked booked on consumption.

Health check:
- The backend exposes a lightweight GET / that returns { ok: true } — useful for Render health checks and uptime probes.

Multiple frontend domains / CORS
- The `FRONTEND_URL` env var now accepts a comma-separated list of allowed origins. This lets you allow both the production Vercel domain and preview domains (for example: `https://teakonn-app.vercel.app,https://teakonn-preview.vercel.app`).
- Examples:
   - Only production: `FRONTEND_URL=https://teakonn-app.vercel.app`
   - Production + preview: `FRONTEND_URL=https://teakonn-app.vercel.app,https://teakonn-preview.vercel.app`
   - Development wildcard (not recommended for production): `FRONTEND_URL=*`
   - It also supports wildcard / pattern entries like `*.vercel.app` or `https://*.vercel.app` which will match any subdomain of vercel.app (useful for allowing preview deployments automatically).
   - Examples:
      - Exact whitelist: `FRONTEND_URL=https://teakonn-app.vercel.app,https://teakonn-preview.vercel.app`
      - Allow all Vercel subdomains: `FRONTEND_URL=https://teakonn-app.vercel.app,*.vercel.app`
      - Development wildcard (not recommended for production): `FRONTEND_URL=*`
