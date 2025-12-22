import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for avatars
});

const router = express.Router();

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
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
    
    // Update user avatar URL
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { avatar: result.secure_url }, 
      { new: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (err) {
    console.error('[users/avatar] ', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;