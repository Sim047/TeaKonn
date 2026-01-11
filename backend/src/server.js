// backend/src/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

// ROUTES
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import fileRoutes from "./routes/files.js";
import statusRoutes from "./routes/status.js";
import conversationsRoutes from "./routes/conversations.js";
import coachesRoutes from "./routes/coaches.js";
import eventsRoutes from "./routes/events.js";
import servicesRoutes from "./routes/services.js";
import postsRoutes from "./routes/posts.js";
import marketplaceRoutes from "./routes/marketplace.js";
import aiRoutes from "./routes/ai.js";
import Event from "./models/Event.js";
import venuesRoutes from "./routes/venues.js";
import bookingRequestsRoutes from "./routes/booking-requests.js";
import tokensRoutes from "./routes/tokens.js";
import paymentsRoutes from "./routes/payments.js";

// MODELS
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";

// dirname fix (because ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EXPRESS INIT — MUST COME BEFORE app.use()
const app = express();
const server = http.createServer(app);
// Feature toggles
const AI_ENABLED = (process.env.AI_ENABLED ?? 'true') !== 'false';

// FRONTEND URL(s) for CORS & socket origin
// Accepts comma-separated values, e.g. "https://app.vercel.app,https://my-preview.vercel.app"
// or a single '*' to allow all origins (not recommended for production)
// TEMPORARY: Using * for debugging - will restrict after confirming it works
const FRONTEND = process.env.FRONTEND_URL || '*';
const allowedOrigins = String(FRONTEND)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function originMatchesPattern(origin, pattern) {
  // pattern can be a host wildcard like '*.vercel.app' or include protocol 'https://*.vercel.app'
  if (!origin || !pattern) return false;

  try {
    const originUrl = new URL(origin);
    let host = originUrl.host.toLowerCase(); // includes port if present

    // remove protocol from pattern if present
    let p = pattern.replace(/^https?:\/\//i, '').toLowerCase();

    // exact host match
    if (p === host) return true;

    // wildcard patterns
    if (p.includes('*')) {
      // convert wildcard to regex
      const regex = new RegExp('^' + p.split('*').map(escapeRegExp).join('.*') + '$');
      return regex.test(host);
    }

    return false;
  } catch (e) {
    return false;
  }
}

function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser requests
  if (allowedOrigins.includes('*')) return true;
  
  // exact match check
  if (allowedOrigins.includes(origin)) return true;

  // check patterns (with or without protocol)
  for (const pattern of allowedOrigins) {
    if (pattern.includes('*')) {
      if (originMatchesPattern(origin, pattern)) return true;
    }
  }

  return false;
}

// SOCKET.IO
const io = new Server(server, {
  cors: {
    // socket.io supports function origins — we use a checker so patterns are allowed
    origin: function (origin, callback) {
      try {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed'), false);
      } catch (e) {
        return callback(new Error('Origin check failed'), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Ensure socket.io exposes Access-Control-Allow-Origin for HTTP polling endpoints
// and also set common headers for preflight requests. Some proxies or platforms
// may route socket polling through HTTP handlers that require explicit headers.
io.opts.cors = io.opts.cors || {};
io.opts.cors.credentials = true;
io.opts.cors.allowedHeaders = ["Content-Type", "Authorization"];

// expose io
app.set("io", io);
const onlineUsers = new Map();
app.set("onlineUsers", onlineUsers);

// middleware
// Express CORS — allow requests only from allowedOrigins or '*' handling
// Echo/override CORS headers early for compatibility with socket.io polling
// and proxies — set Access-Control-Allow-* for allowed origins.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  try {
    if (!origin) {
      // non-browser requests: allow
      res.header('Access-Control-Allow-Origin', '*');
      return next();
    }

    if (isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
  } catch (e) {
    // fall through
  }
  return next();
});

// Handle preflight OPTIONS requests early so proxies and load balancers
// receive proper CORS headers without invoking full route logic.
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  try {
    if (!origin) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      return res.sendStatus(204);
    }

    if (isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      return res.sendStatus(204);
    }
  } catch (e) {
    // fall through
  }
  return res.sendStatus(403);
});

app.use(
  cors({
    origin: function (origin, callback) {
      console.log('CORS check - Origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      
      // allow non-browser requests (eg. server-to-server, curl) when origin is undefined
      if (!origin) return callback(null, true);
      
      const allowed = isOriginAllowed(origin);
      console.log('Origin allowed:', allowed);
      
      if (allowed) return callback(null, true);
      return callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Security headers — disable CORP for static uploads to avoid blocking cross-origin asset access
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
// Basic rate limits: protect auth and AI endpoints from abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
const bookingReqLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const tokensLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const paymentsLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", authLimiter);
if (AI_ENABLED) {
  app.use("/api/ai", aiLimiter);
}
app.use(express.json({ limit: "10mb" }));

// static uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, "..", UPLOAD_DIR)));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/coaches", coachesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/marketplace", marketplaceRoutes);
if (AI_ENABLED) {
  app.use("/api/ai", aiRoutes);
}
// Venue booking system
app.use("/api/venues", venuesRoutes);
app.use("/api/booking-requests", bookingReqLimiter, bookingRequestsRoutes);
app.use("/api/tokens", tokensLimiter, tokensRoutes);
app.use("/api/payments", paymentsLimiter, paymentsRoutes);

// lightweight health check (useful for probes / verify deployment)
app.get('/', (req, res) => res.json({ ok: true, service: 'teakonn-backend' }));

// TEMP: debug echo endpoint to inspect payloads/headers in Railway logs
app.post('/api/debug/echo', (req, res) => {
  try {
    console.log('[DEBUG ECHO] origin:', req.headers.origin);
    console.log('[DEBUG ECHO] auth:', req.headers.authorization ? 'present' : 'missing');
    console.log('[DEBUG ECHO] path:', req.path);
    console.log('[DEBUG ECHO] body:', req.body);
    res.json({ ok: true, headers: req.headers, body: req.body });
  } catch (e) {
    console.error('[DEBUG ECHO ERROR]', e);
    res.status(500).json({ error: 'echo_failed', details: e.message });
  }
});

// SOCKET.IO LOGIC
io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);

  // track presence
  const clientUser = socket.handshake.auth?.user;
  let joinedPersonalRoom = false;
  if (clientUser && (clientUser.id || clientUser._id)) {
    const uid = clientUser.id || clientUser._id;
    onlineUsers.set(String(uid), socket.id);
    try { socket.join(String(uid)); joinedPersonalRoom = true; } catch {}
    io.emit("presence_update", { userId: uid, status: "online" });
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("online_users_list", { userIds: onlineUserIds });
    console.log("[socket] sent online users list:", onlineUserIds);
  }

  // Fallback: join personal room via JWT if client didn't provide user in auth
  if (!joinedPersonalRoom) {
    const token = socket.handshake.auth?.token;
    if (token && process.env.JWT_SECRET) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const uid = String(payload.id || payload._id);
        if (uid) {
          onlineUsers.set(uid, socket.id);
          try { socket.join(uid); joinedPersonalRoom = true; } catch {}
          io.emit("presence_update", { userId: uid, status: "online" });
          const onlineUserIds = Array.from(onlineUsers.keys());
          socket.emit("online_users_list", { userIds: onlineUserIds });
          console.log("[socket] joined personal room via JWT:", uid);
        }
      } catch (e) {
        console.warn('[socket] JWT verify failed in handshake:', e?.message || e);
      }
    }
  }

  socket.on("join_room", async (room) => {
    try {
      // If room is an Event ID, restrict access to organizer/participants
      if (typeof room === 'string' && /^[0-9a-fA-F]{24}$/.test(room)) {
        const maybeEvent = await Event.findById(room).select('_id organizer participants');
        if (maybeEvent) {
          const authUser = socket.handshake.auth?.user || {};
          const uid = String(authUser._id || authUser.id || '');
          const isOrganizer = String(maybeEvent.organizer) === uid;
          const isParticipant = (maybeEvent.participants || []).some((p) => String(p) === uid);
          if (!isOrganizer && !isParticipant) {
            console.warn('[socket] join denied: user not participant/organizer of event', {
              uid,
              room,
            });
            socket.emit('room_join_denied', { room, reason: 'not_participant' });
            return;
          }
        }
      }

      socket.join(room);
      console.log("[socket] user joined room:", room);
    } catch (e) {
      console.error('[socket] join_room error:', e);
      socket.emit('room_join_denied', { room, reason: 'server_error' });
    }
  });

  // SEND MESSAGE
  socket.on("send_message", async ({ room, message }) => {
    try {
      // Event room guard: only organizer/participants can send
      if (typeof room === 'string' && /^[0-9a-fA-F]{24}$/.test(room)) {
        const maybeEvent = await Event.findById(room).select('_id organizer participants');
        if (maybeEvent) {
          const authUser = socket.handshake.auth?.user || {};
          const uid = String(authUser._id || authUser.id || '');
          const isOrganizer = String(maybeEvent.organizer) === uid;
          const isParticipant = (maybeEvent.participants || []).some((p) => String(p) === uid);
          if (!isOrganizer && !isParticipant) {
            console.warn('[socket] send denied: user not participant/organizer of event', { uid, room });
            socket.emit('error_message', { message: 'not_authorized_for_event_room' });
            return;
          }
        }
      }

      const saved = await Message.create({
        sender: message.sender?._id || message.sender,
        text: message.text,
        room,
        fileUrl: message.fileUrl || "",
        replyTo: message.replyTo || null,
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
      });

      const populated = await Message.findById(saved._id)
        .populate("sender", "username avatar")
        .populate("replyTo")
        .populate("readBy", "username");

      // If room is a Conversation ID, update lastMessage and updatedAt to keep lists fresh
      try {
        if (typeof room === 'string' && /^[0-9a-fA-F]{24}$/.test(room)) {
          // Only update Conversation lastMessage if this room is an actual conversation
          const isConv = await Conversation.exists({ _id: room });
          if (isConv) {
            await Conversation.findByIdAndUpdate(room, { lastMessage: saved._id, updatedAt: new Date() });
          }
        }
      } catch (e) {
        console.warn('[socket] failed to update conversation lastMessage', e?.message || e);
      }

      io.to(room).emit("receive_message", populated);
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("error_message", { message: "failed to save message" });
    }
  });

  // EDIT MESSAGE
  socket.on("edit_message", async ({ room, messageId, text }) => {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { text, edited: true },
        { new: true }
      )
        .populate("sender", "username avatar")
        .populate("replyTo")
        .populate("readBy", "username");

      if (updated) io.to(room).emit("message_edited", updated);
    } catch (err) {
      console.error("edit_message error:", err);
    }
  });

  // DELETE MESSAGE - handled by REST endpoint (/api/messages/:id DELETE)
  // Per-user hiding is done via REST API which properly notifies only the hiding user

  // REACT TO MESSAGE
  socket.on("react", async ({ room, messageId, userId, emoji }) => {
    try {
      // Event room guard for reactions as well
      if (typeof room === 'string' && /^[0-9a-fA-F]{24}$/.test(room)) {
        const maybeEvent = await Event.findById(room).select('_id organizer participants');
        if (maybeEvent) {
          const uidCheck = String((socket.handshake.auth?.user?._id) || (socket.handshake.auth?.user?.id) || userId);
          const isOrganizer = String(maybeEvent.organizer) === uidCheck;
          const isParticipant = (maybeEvent.participants || []).some((p) => String(p) === uidCheck);
          if (!isOrganizer && !isParticipant) return; // silently ignore
        }
      }

      const uid = userId._id || userId.id || userId;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existing = msg.reactions.find((r) => String(r.userId) === String(uid));

      // toggle
      if (existing && existing.emoji === emoji) {
        msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(uid));
      } else {
        msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(uid));
        msg.reactions.push({ userId: uid, emoji });
      }

      await msg.save();

      const populated = await Message.findById(messageId)
        .populate("sender", "username avatar")
        .populate("replyTo")
        .populate("readBy", "username");

      io.to(room).emit("reaction_update", populated);
    } catch (err) {
      console.error("react error:", err);
    }
  });

  // TYPING
  socket.on("typing", ({ room, userId, user, typing }) => {
    // Best-effort event room guard; skip emit if not allowed
    const emitTyping = async () => {
      try {
        if (typeof room === 'string' && /^[0-9a-fA-F]{24}$/.test(room)) {
          const maybeEvent = await Event.findById(room).select('_id organizer participants');
          if (maybeEvent) {
            const uid = String((socket.handshake.auth?.user?._id) || (socket.handshake.auth?.user?.id) || userId);
            const isOrganizer = String(maybeEvent.organizer) === uid;
            const isParticipant = (maybeEvent.participants || []).some((p) => String(p) === uid);
            if (!isOrganizer && !isParticipant) return;
          }
        }
      } catch {}
      socket.to(room).emit("typing", { userId, user, typing });
    };
    emitTyping();
  });

  // MESSAGE DELIVERED
  socket.on("message_delivered", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.deliveredTo.includes(userId)) {
        message.deliveredTo.push(userId);
        await message.save();
        
        const populated = await Message.findById(messageId)
          .populate("sender", "username avatar")
          .populate("deliveredTo", "username")
          .populate("readBy", "username");
        
        io.to(message.room).emit("message_status_update", populated);
      }
    } catch (err) {
      console.error("message_delivered error:", err);
    }
  });

  // MESSAGE READ
  socket.on("message_read", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.readBy.includes(userId)) {
        if (!message.deliveredTo.includes(userId)) {
          message.deliveredTo.push(userId);
        }
        message.readBy.push(userId);
        await message.save();
        
        const populated = await Message.findById(messageId)
          .populate("sender", "username avatar")
          .populate("deliveredTo", "username")
          .populate("readBy", "username");
        
        io.to(message.room).emit("message_status_update", populated);
      }
    } catch (err) {
      console.error("message_read error:", err);
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        io.emit("presence_update", { userId: uid, status: "offline" });
        break;
      }
    }
  });
});

// Global error handler to surface stack traces in logs during debugging
// Keep last in the middleware chain
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal Server Error', details: err?.message || 'unknown' });
});

// Also capture unhandled rejections/exceptions to logs
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

// DB + START SERVER
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces (required for Railway/Render)

mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log("MongoDB connected");
    // Auto-archiving: mark past events with archivedAt
    async function autoArchivePastEvents() {
      try {
        const now = new Date();
        // Archive events where endsAt is in the past, or where starts are past and endsAt missing
        const criteria = {
          $and: [
            { $or: [
              { archivedAt: { $exists: false } },
              { archivedAt: null },
            ] },
            { $or: [
              { endsAt: { $lt: now } },
              { $and: [ { $or: [ { endsAt: { $exists: false } }, { endsAt: null } ] }, { startDate: { $lt: now } } ] },
            ] },
          ],
        };
        const result = await Event.updateMany(criteria, { $set: { archivedAt: now } });
        if (result.modifiedCount) {
          console.log(`[archive] Archived ${result.modifiedCount} past events`);
        }
      } catch (e) {
        console.error('[archive] autoArchivePastEvents failed', e?.message || e);
      }
    }

    // Run at startup and every hour
    autoArchivePastEvents();
    setInterval(autoArchivePastEvents, 60 * 60 * 1000);
    server.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo error:", err);
    process.exit(1);
  });
