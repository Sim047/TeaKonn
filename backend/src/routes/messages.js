// backend/src/routes/messages.js
import express from "express";
import auth from "../middleware/auth.js";
import Message from "../models/Message.js";
import Event from "../models/Event.js";

const router = express.Router();

/**
 * GET /api/messages/:room
 * Returns messages for a room OR conversation, excluding messages hidden for the current user.
 */
router.get("/:room", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const room = req.params.room;

    const msgs = await Message.find({
      room,
      // exclude messages where hiddenFor contains current user
      hiddenFor: { $ne: userId },
    })
      .populate("sender", "username avatar")
      .populate("replyTo")
      .populate("readBy", "username")
      .sort({ createdAt: 1 })
      .limit(2000);

    res.json(msgs);
  } catch (err) {
    console.error("[messages/get]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/messages/:id
 * Edit message (only sender allowed)
 */
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { text } = req.body;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (String(msg.sender) !== String(userId)) {
      return res.status(403).json({ message: "Not allowed to edit" });
    }

    msg.text = text;
    msg.edited = true;
    await msg.save();

    const populated = await Message.findById(id).populate("sender", "username avatar");
    // emit via socket if you want (server has io in app.set)
    const io = req.app.get("io");
    if (io) io.to(msg.room).emit("message_edited", populated);

    res.json(populated);
  } catch (err) {
    console.error("[messages/put]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/messages/:id
 * Per-user hide: mark message as hidden FOR THE CURRENT USER (so other users still see it).
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Add user to hiddenFor set
    await Message.findByIdAndUpdate(id, { $addToSet: { hiddenFor: userId } });

    // Notify only the requester via their socket (so they can remove from UI)
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers"); // if you attach the map to app
    if (io && onlineUsers && onlineUsers.has(userId)) {
      const sid = onlineUsers.get(userId);
      io.to(sid).emit("message_hidden", { messageId: id });
    }

    res.json({ success: true, messageId: id });
  } catch (err) {
    console.error("[messages/delete]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/messages/:id/restore
 * Remove the hide flag for current user (un-hide a message for them)
 */
router.post("/:id/restore", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await Message.findByIdAndUpdate(id, { $pull: { hiddenFor: userId } });

    res.json({ success: true, messageId: id });
  } catch (err) {
    console.error("[messages/restore]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/messages/:id/force
 * Owner-only permanent delete (optional) - this will remove the message document for everyone.
 */
router.delete("/:id/force", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const msg = await Message.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Allow deletion if sender OR organizer of the Event room
    let allowed = String(msg.sender) === String(userId);
    if (!allowed && typeof msg.room === 'string' && /^[0-9a-fA-F]{24}$/.test(String(msg.room))) {
      try {
        const ev = await Event.findById(msg.room).select('organizer');
        if (ev && String(ev.organizer) === String(userId)) allowed = true;
      } catch {}
    }
    if (!allowed) return res.status(403).json({ message: "Not allowed" });

    await Message.findByIdAndDelete(id);

    // broadcast deletion to room so all clients can remove it
    const io = req.app.get("io");
    if (io) io.to(msg.room).emit("message_deleted", id);

    res.json({ success: true });
  } catch (err) {
    console.error("[messages/deleteForce]", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/messages/room/:roomId/clear
 * Clear all messages in a room/chat (hide for current user only)
 */
router.delete("/room/:roomId/clear", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    
    // Add current user to hiddenFor array for all messages in this room
    await Message.updateMany(
      { room: roomId },
      { $addToSet: { hiddenFor: userId } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("[messages/clearRoom]", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
