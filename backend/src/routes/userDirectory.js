import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';

const router = express.Router();

// Search users by q (name or email) - returns limited results
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    const users = await User.find({ $or: [{ username: regex }, { email: regex }] }).limit(30).select('username email avatar');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// All users (careful - may be large)
router.get('/all', auth, async (req, res) => {
  try {
    const users = await User.find().select('username email avatar');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Start or get existing conversation between current user and partnerId
router.post('/conversations/start', auth, async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ message: 'partnerId required' });

    // check existing one-to-one conversation
    let conv = await Conversation.findOne({ isGroup: false, participants: { $all: [req.user.id, partnerId] } });
    if (!conv) {
      conv = await Conversation.create({ participants: [req.user.id, partnerId], isGroup: false });
    }
    conv = await Conversation.findById(conv._id).populate('participants', 'username avatar');
    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
