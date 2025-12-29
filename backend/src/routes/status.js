import express from "express";
import auth from "../middleware/auth.js";
import Status from "../models/Status.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * GET all statuses (public for authenticated users)
 * Returns current statuses for users (populated with username & avatar)
 */
router.get("/", auth, async (req, res) => {
  try {
    const statuses = await Status.find()
      .populate("user", "username avatar")
      .sort({ updatedAt: -1 });

    res.json(statuses);
  } catch (err) {
    console.error("[status/get]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET single user's status
 */
router.get("/user/:id", auth, async (req, res) => {
  try {
    const st = await Status.findOne({ user: req.params.id }).populate("user", "username avatar");
    if (!st) return res.status(404).json({ message: "Not found" });
    res.json(st);
  } catch (err) {
    console.error("[status/get-user]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * SET / UPDATE status for current user
 * Body: { mood: string, emoji?: string, expiresAt?: string|null }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { mood = "", emoji = "", expiresAt = null } = req.body;
    const moodSafe = String(mood || "").slice(0, 40).trim();
    const emojiSafe = String(emoji || "").slice(0, 8);

    // upsert
    const updated = await Status.findOneAndUpdate(
      { user: req.user.id },
      { mood: moodSafe, emoji: emojiSafe, expiresAt: expiresAt ? new Date(expiresAt) : null },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("user", "username avatar");

    // broadcast via socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("status_update", updated);
    }

    res.json({ success: true, status: updated });
  } catch (err) {
    console.error("[status/post]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * CLEAR status for current user
 */
router.delete("/", auth, async (req, res) => {
  try {
    const st = await Status.findOneAndDelete({ user: req.user.id });
    if (st) {
      const io = req.app.get("io");
      if (io) {
        io.emit("status_update", { user: req.user.id, cleared: true });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[status/delete]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
