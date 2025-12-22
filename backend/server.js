import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ROUTES
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import fileRoutes from './routes/files.js';
import statusRoutes from './routes/status.js';   // <-- NEW

// MODELS
import Message from './models/Message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const FRONTEND = process.env.FRONTEND_URL || '*';

const io = new Server(server, {
  cors: {
    origin: FRONTEND,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make socket available to routes
app.set('io', io);

// CORS + JSON
app.use(cors({ origin: FRONTEND }));
app.use(express.json({ limit: '10mb' }));

// Static uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', UPLOAD_DIR)));

// ----------- REGISTER ROUTES -----------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

app.use('/api/status', statusRoutes);     // <-- REQUIRED FOR STATUS FEATURE

// small health check — useful for Load Balancers / probes
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'teakonn-backend' });
});


// =============== SOCKET.IO LOGIC ===============
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('[io] connection', socket.id);

  const clientUser = socket.handshake.auth?.user;
  if (clientUser && (clientUser.id || clientUser._id)) {
    const uid = clientUser.id || clientUser._id;
    onlineUsers.set(uid, socket.id);
    io.emit('presence_update', { userId: uid, status: 'online' });
  }

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  // SEND MESSAGE
  socket.on('send_message', async ({ room, message }) => {
    try {
      const saved = await Message.create({
        sender: message.sender._id || message.sender.id || message.sender,
        text: message.text,
        room,
        fileUrl: message.fileUrl || '',
        replyTo: message.replyTo || null,
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date()
      });

      const populated = await Message.findById(saved._id)
        .populate('sender', 'username avatar')
        .populate('replyTo')
        .populate('readBy', 'username');

      io.to(room).emit('receive_message', populated);

    } catch (err) {
      console.error('[io] send_message error', err);
      socket.emit('error_message', { message: 'failed to save message' });
    }
  });

  // REACTIONS
  socket.on('react', async ({ room, messageId, userId, emoji }) => {
    try {
      if (userId && (userId.id || userId._id)) userId = userId.id || userId._id;
      if (!userId) return;

      const msg = await Message.findById(messageId);
      if (!msg) return;

      const exists = msg.reactions.find(r => String(r.userId) === String(userId));

      if (exists && exists.emoji === emoji) {
        msg.reactions = msg.reactions.filter(r => String(r.userId) !== String(userId));
      } else {
        msg.reactions = msg.reactions.filter(r => String(r.userId) !== String(userId));
        msg.reactions.push({ userId, emoji });
      }

      await msg.save();

      const populated = await Message.findById(messageId)
        .populate('sender', 'username avatar')
        .populate('replyTo')
        .populate('readBy', 'username');

      io.to(room).emit('reaction_update', populated);

    } catch (err) {
      console.error('[io] react error', err);
    }
  });

  // TYPING INDICATOR
  socket.on('typing', ({ room, userId, typing }) => {
    socket.to(room).emit('typing', { userId, typing });
  });

  // DELIVERY
  socket.on('delivered', async ({ room, messageId, userId }) => {
    try {
      if (userId && (userId.id || userId._id)) userId = userId.id || userId._id;

      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (!msg.readBy.map(String).includes(String(userId))) {
        msg.readBy.push(userId);
        await msg.save();
      }

      io.to(room).emit('delivered', { messageId, userId });

    } catch (err) {
      console.error('[io] delivered error', err);
    }
  });

  // READ RECEIPT
  socket.on('read', async ({ room, messageId, userId }) => {
    try {
      if (userId && (userId.id || userId._id)) userId = userId.id || userId._id;

      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (!msg.readBy.map(String).includes(String(userId))) {
        msg.readBy.push(userId);
        await msg.save();
      }

      io.to(room).emit('read', { messageId, userId });

    } catch (err) {
      console.error('[io] read error', err);
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        io.emit('presence_update', { userId: uid, status: 'offline' });
        break;
      }
    }
  });
});

// =============== DB CONNECT ===============
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI not set in environment');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => server.listen(PORT, () => console.log('Server running on', PORT)))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);
  });