import express from "express";
import auth from "../middleware/auth.js";
import BookingToken from "../models/BookingToken.js";
import BookingRequest from "../models/BookingRequest.js";
import Payment from "../models/Payment.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

function randomCode(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// POST /api/tokens/generate
router.post("/generate", auth, async (req, res) => {
  try {
    const { bookingRequestId, expiresInHours = 72 } = req.body || {};
    // Populate venue and users so notification includes readable names
    const br = await BookingRequest
      .findById(bookingRequestId)
      .populate('venue', 'name')
      .populate('owner', 'username avatar')
      .populate('requester', 'username avatar');
    if (!br) return res.status(404).json({ error: "Booking request not found" });
    const brOwnerId = br.owner && br.owner._id ? String(br.owner._id) : String(br.owner);
    if (brOwnerId !== String(req.user.id)) {
      return res.status(403).json({ error: "Only venue owner can generate token" });
    }

    // Prevent duplicate tokens for the same booking request
    const existingActive = await BookingToken.findOne({ bookingRequest: br._id, status: 'active' });
    if (existingActive || br.status === 'token_generated') {
      return res.status(400).json({ error: 'Token already generated for this request' });
    }

    // Ensure a successful payment exists by owner for this bookingRequest
    const payment = await Payment.findOne({ bookingRequest: br._id, initiator: req.user.id, status: "success" });
    if (!payment) return res.status(400).json({ error: "Payment required before token generation" });

    const code = randomCode(12);
    const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
    const token = await BookingToken.create({
      code,
      venue: br.venue, // can be populated doc; Mongoose will persist ObjectId
      requester: br.requester,
      owner: br.owner,
      bookingRequest: br._id,
      status: "active",
      expiresAt,
      payment: payment._id,
    });

    br.status = "token_generated";
    await br.save();

    // Notify requester directly so Notifications page updates, without DM message spam
    const io = req.app.get("io");
    if (io) {
      try {
        // Emit minimal, readable details for UI
        io.to(String(br.requester?._id || br.requester)).emit('notification', {
          kind: 'booking_token',
          title: `Token generated`,
          message: `A booking token was issued`,
          date: new Date().toISOString(),
          venue: br.venue && br.venue._id ? { _id: br.venue._id, name: br.venue.name } : br.venue,
          requester: br.requester && br.requester._id ? { _id: br.requester._id, username: br.requester.username, avatar: br.requester.avatar } : br.requester,
          owner: br.owner && br.owner._id ? { _id: br.owner._id, username: br.owner.username, avatar: br.owner.avatar } : br.owner,
          bookingRequestId: br._id,
          token: { code: token.code, expiresAt: token.expiresAt }
        });

        // Also send a DM message in the existing (or new) 1:1 conversation
        const ownerId = br.owner?._id || br.owner;
        const requesterId = br.requester?._id || br.requester;
        let conv = await Conversation.findOne({ participants: { $all: [ownerId, requesterId] }, isGroup: false });
        if (!conv) {
          conv = await Conversation.create({ participants: [ownerId, requesterId], isGroup: false });
        }

        const dmText = `Booking token issued for ${br.venue?.name || 'venue'}\nCode: ${token.code}\nExpires: ${token.expiresAt.toISOString()}`;
        const saved = await Message.create({
          room: conv._id.toString(),
          sender: ownerId,
          text: dmText,
          fileUrl: "",
          replyTo: null,
          createdAt: new Date(),
        });

        try {
          await Conversation.findByIdAndUpdate(conv._id, { lastMessage: saved._id, updatedAt: new Date() });
        } catch {}

        const populatedMsg = await Message.findById(saved._id)
          .populate('sender', 'username avatar');
        io.to(conv._id.toString()).emit('receive_message', populatedMsg);
      } catch (e) {
        console.warn('token notify emit failed:', e?.message || e);
      }
    }

    res.status(201).json(token);
  } catch (err) {
    console.error("Generate token error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// POST /api/tokens/verify
router.post("/verify", auth, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code required" });
    const token = await BookingToken.findOne({ code }).populate("venue");
    if (!token) return res.status(404).json({ error: "Token not found" });
    if (token.status !== "active") return res.status(400).json({ error: "Token is not active" });
    if (new Date() > token.expiresAt) return res.status(400).json({ error: "Token has expired" });
    // Token must be tied to current requester
    if (String(token.requester) !== String(req.user.id)) return res.status(403).json({ error: "Token not issued to this user" });

    res.json({ valid: true, venue: token.venue, token: { code: token.code, expiresAt: token.expiresAt } });
  } catch (err) {
    console.error("Verify token error:", err);
    res.status(500).json({ error: "Failed to verify token" });
  }
});

export default router;
// List tokens generated by venue owner
router.get('/my/generated', auth, async (req, res) => {
  try {
    const list = await BookingToken.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .populate('venue')
      .populate('requester', 'username avatar');
    res.json({ tokens: list });
  } catch (err) {
    console.error('List my generated tokens error:', err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// List tokens received by event creator
router.get('/my/received', auth, async (req, res) => {
  try {
    const list = await BookingToken.find({ requester: req.user.id })
      .sort({ createdAt: -1 })
      .populate('venue')
      .populate('owner', 'username avatar');
    res.json({ tokens: list });
  } catch (err) {
    console.error('List my received tokens error:', err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// POST /api/tokens/revoke { code }
router.post('/revoke', auth, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const token = await BookingToken.findOne({ code });
    if (!token) return res.status(404).json({ error: 'Token not found' });
    if (String(token.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
    if (token.status !== 'active') return res.status(400).json({ error: 'Only active tokens can be revoked' });
    token.status = 'expired';
    token.expiresAt = new Date();
    await token.save();
    res.json({ success: true, token });
  } catch (err) {
    console.error('Revoke token error:', err);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// POST /api/tokens/extend { code, hours }
router.post('/extend', auth, async (req, res) => {
  try {
    const { code, hours = 24 } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const token = await BookingToken.findOne({ code });
    if (!token) return res.status(404).json({ error: 'Token not found' });
    if (String(token.owner) !== String(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
    if (token.status !== 'active') return res.status(400).json({ error: 'Only active tokens can be extended' });
    const addMs = Number(hours) * 60 * 60 * 1000;
    token.expiresAt = new Date(token.expiresAt.getTime() + addMs);
    await token.save();
    res.json({ success: true, token });
  } catch (err) {
    console.error('Extend token error:', err);
    res.status(500).json({ error: 'Failed to extend token' });
  }
});
