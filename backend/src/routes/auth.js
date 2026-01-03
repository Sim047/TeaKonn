import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req,res)=>{
  try{
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'User exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET);
    res.json({ user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }, token });
  }catch(err){
    console.error('[auth/register] ', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET);
    res.json({ user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }, token });
  }catch(err){
    console.error('[auth/login] ', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Current user from JWT
router.get('/me', auth, async (req, res) => {
  try {
    const id = req.user?.id;
    const user = await User.findById(id).select('username email avatar role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('[auth/me] ', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
 
// --- Google Sign-In (ID token) ---
// POST /api/auth/google { idToken: string }
// Verifies Google's ID token, finds/creates a user, and returns our JWT.
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    // Verify id token with Google tokeninfo endpoint
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(verifyUrl);
    if (!resp.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    const info = await resp.json();

    const aud = info.aud;
    const email = info.email;
    const emailVerified = info.email_verified === 'true' || info.email_verified === true;
    const name = info.name || '';
    const picture = info.picture || '';

    if (!email || !emailVerified) {
      return res.status(401).json({ message: 'Google email not verified' });
    }

    // Optional audience check against env client IDs
    const allowedAudiences = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowedAudiences.length > 0 && !allowedAudiences.includes(aud)) {
      return res.status(401).json({ message: 'Google client mismatch' });
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      // Derive username from email local part; ensure uniqueness
      const base = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_\.\-]/g, '');
      let candidate = base || 'user';
      let suffix = 0;
      while (await User.findOne({ username: candidate })) {
        suffix += 1;
        candidate = `${base}${suffix}`;
      }
      user = await User.create({
        username: candidate,
        email,
        avatar: picture,
      });
    } else if (!user.avatar && picture) {
      // Optionally enrich avatar on first Google login
      user.avatar = picture;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET);
    return res.json({ user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }, token });
  } catch (err) {
    console.error('[auth/google] ', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
