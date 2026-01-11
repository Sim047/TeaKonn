// backend/src/routes/users.js
import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';

import auth from "../middleware/auth.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/* ---------------------------------------------
   CLOUDINARY CONFIG
--------------------------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/* ---------------------------------------------
   MULTER MEMORY STORAGE
--------------------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ---------------------------------------------
   1) UPLOAD AVATAR (CLOUDINARY)
--------------------------------------------- */
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Resize avatar to 800x800
    const resizedBuffer = await sharp(req.file.buffer)
      .resize({ width: 800, height: 800, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'teakonn/avatars',
          public_id: `user_${req.user.id}_${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'fill' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(resizedBuffer);
    });

    // Update user with Cloudinary URL
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      { avatar: result.secure_url },
      { new: true }
    ).select("_id username email avatar role");

    res.json({ success: true, avatar: result.secure_url, user: updatedUser });
  } catch (err) {
    console.error("POST /api/users/avatar ERROR:", err);
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

/* ---------------------------------------------
   2) GET ALL USERS (except self)
--------------------------------------------- */
router.get("/all", auth, async (req, res) => {
  try {
    const meId = req.user.id;
    const searchQuery = String(req.query.search || "");
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '24'), 10) || 24, 1), 100);
    const skip = (page - 1) * limit;

    // Build search filter and exclude self
    const filter = { _id: { $ne: meId } };
    if (searchQuery) {
      filter.$or = [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter, "username email avatar followers following")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = users.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      followersCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
      isFollowed: (u.followers || []).map(String).includes(String(meId)),
    }));

    res.json({ users: formatted, total, page, limit });
  } catch (err) {
    console.error("GET /api/users/all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   3) GET LOGGED-IN USER PROFILE
   IMPORTANT: Must come BEFORE /:id route
--------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .select("username email avatar followers following bio about location favoriteSports")
      .populate("followers", "username avatar email")
      .populate("following", "username avatar email");

    if (!me) return res.status(404).json({ message: "User not found" });

    res.json({
      ...me.toObject(),
      followersCount: me.followers.length,
      followingCount: me.following.length,
    });
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   UPDATE LOGGED-IN USER PROFILE
   Allowed fields: username, email, bio, about, location
--------------------------------------------- */
router.put("/me", auth, async (req, res) => {
  try {
    const { name, username, email, about, location } = req.body || {};
    const update = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof username === 'string' && username.trim()) update.username = username.trim();
    if (typeof email === 'string' && email.trim()) update.email = email.trim().toLowerCase();
    if (typeof about === 'string') update.about = about;
    if (typeof location === 'string') update.location = location;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Enforce username handle constraints (preserve case for display)
    if (update.username) {
      function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
      const clean = update.username.replace(/[^a-zA-Z0-9_\.\-]/g, '');
      update.username = clean || update.username;
      const lengthOk = clean.length >= 3 && clean.length <= 30;
      if (!lengthOk) return res.status(400).json({ message: "Username must be 3-30 characters" });
      // Case-insensitive uniqueness check
      const exists = await User.findOne({
        username: { $regex: '^' + escapeRegExp(update.username) + '$', $options: 'i' },
        _id: { $ne: req.user.id },
      });
      if (exists) return res.status(400).json({ message: "Username already taken" });
    }

    // Email uniqueness
    if (update.email) {
      const existsEmail = await User.findOne({ email: update.email, _id: { $ne: req.user.id } });
      if (existsEmail) return res.status(400).json({ message: "Email already in use" });
    }

    const updated = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select("_id username email avatar role bio about location favoriteSports followers following");

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ user: updated });
  } catch (err) {
    console.error("PUT /api/users/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete my account
router.delete("/me", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword } = req.body || {};
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If password exists, require correct current password
    if (user.password) {
      if (!currentPassword) return res.status(400).json({ message: "Current password required" });
      const ok = await (await import('bcrypt')).default.compare(currentPassword, user.password);
      if (!ok) return res.status(400).json({ message: "Invalid current password" });
    }

    await User.deleteOne({ _id: userId });
    // Note: related content (messages, events) are not removed here
    return res.json({ success: true });
  } catch (err) {
    console.error('[users/delete] ', err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   CHANGE PASSWORD
   Requires: currentPassword (if existing), newPassword
--------------------------------------------- */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.id).select('password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hasExisting = !!user.password;
    if (hasExisting) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /api/users/change-password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   4) GET PROFILE BY ID (FULL FIX)
--------------------------------------------- */
router.get("/:id", auth, async (req, res) => {
  try {
    const viewerId = req.user.id;

    const user = await User.findById(req.params.id)
      .select("username email avatar followers following about bio location")
      .populate("followers", "username email avatar")
      .populate("following", "username email avatar");

    if (!user) return res.status(404).json({ message: "User not found" });

    const formattedFollowers = user.followers.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      isFollowed: user.following.map(String).includes(String(u._id)),
    }));

    const formattedFollowing = user.following.map((u) => ({
      _id: u._id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      isFollowed: true, // you follow these people
    }));

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      about: user.about || "",
      bio: user.bio || "",
      location: user.location || "",
      followers: formattedFollowers,
      following: formattedFollowing,
      followersCount: formattedFollowers.length,
      followingCount: formattedFollowing.length,
      isFollowed: formattedFollowers.some((f) => String(f._id) === viewerId),
    });
  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   5) FOLLOW USER
--------------------------------------------- */
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.id;

    if (meId === otherId) return res.status(400).json({ message: "Cannot follow yourself" });

    const me = await User.findById(meId);
    const other = await User.findById(otherId);

    if (!me || !other) return res.status(404).json({ message: "User not found" });

    if (!other.followers.map(String).includes(meId)) other.followers.push(meId);
    if (!me.following.map(String).includes(otherId)) me.following.push(otherId);

    await me.save();
    await other.save();

    // Emit realtime notification to the followed user
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(String(otherId)).emit('notification', {
          kind: 'follow',
          title: `${me.username || 'Someone'} followed you`,
          message: '',
          date: new Date().toISOString(),
          user: { _id: me._id, username: me.username, avatar: me.avatar }
        });
      }
    } catch (e) {
      console.warn('follow notify emit failed:', e?.message || e);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /follow error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   6) UNFOLLOW USER
--------------------------------------------- */
router.post("/:id/unfollow", auth, async (req, res) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.id;

    const me = await User.findById(meId);
    const other = await User.findById(otherId);

    if (!me || !other) return res.status(404).json({ message: "User not found" });

    me.following = me.following.filter((f) => String(f) !== String(otherId));
    other.followers = other.followers.filter((f) => String(f) !== String(meId));

    await me.save();
    await other.save();

    res.json({ success: true });
  } catch (err) {
    console.error("POST /unfollow error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   7) START 1:1 CONVERSATION
--------------------------------------------- */
router.post("/conversations/start", auth, async (req, res) => {
  try {
    const me = req.user.id;
    const { partnerId } = req.body;

    if (!partnerId) return res.status(400).json({ message: "partnerId required" });

    let conv = await Conversation.findOne({
      participants: { $all: [me, partnerId] },
      isGroup: false,
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [me, partnerId],
        isGroup: false,
      });
    }

    const populated = await Conversation.findById(conv._id).populate(
      "participants",
      "username avatar email"
    );

    res.json(populated);
  } catch (err) {
    console.error("POST /conversations/start error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------
   FAVORITE SPORTS ROUTES
--------------------------------------------- */
// Add a sport to favorites
router.post("/favorite-sports", auth, async (req, res) => {
  try {
    const { sport } = req.body;
    if (!sport) return res.status(400).json({ message: "Sport name required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.favoriteSports) user.favoriteSports = [];
    
    if (!user.favoriteSports.includes(sport)) {
      user.favoriteSports.push(sport);
      await user.save();
    }

    res.json({ favoriteSports: user.favoriteSports });
  } catch (err) {
    console.error("POST /api/users/favorite-sports error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a sport from favorites
router.delete("/favorite-sports/:sport", auth, async (req, res) => {
  try {
    const { sport } = req.params;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.favoriteSports) user.favoriteSports = [];
    
    user.favoriteSports = user.favoriteSports.filter(s => s !== sport);
    await user.save();

    res.json({ favoriteSports: user.favoriteSports });
  } catch (err) {
    console.error("DELETE /api/users/favorite-sports error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's favorite sports
router.get("/favorite-sports/list", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("favoriteSports");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ favoriteSports: user.favoriteSports || [] });
  } catch (err) {
    console.error("GET /api/users/favorite-sports/list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

/* ---------------------------------------------
   ROLE MANAGEMENT (TESTING/DEV)
   Allows a user to set their own role to 'event_creator' or 'venue_owner'.
--------------------------------------------- */
router.post('/role', auth, async (req, res) => {
  try {
    const { role } = req.body || {};
    const allowed = ['event_creator', 'venue_owner', 'user'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const me = await User.findByIdAndUpdate(req.user.id, { role }, { new: true })
      .select('_id username email avatar role');
    // Emit presence update or notify as needed (optional)
    return res.json({ success: true, user: me });
  } catch (err) {
    console.error('POST /api/users/role error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

