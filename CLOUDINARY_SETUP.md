# 📸 Cloudinary Setup Guide for TeaKonn

## Why Cloudinary?

Railway (and most cloud platforms) use **ephemeral storage** - files uploaded to the filesystem are deleted when the container restarts. Cloudinary provides **persistent cloud storage** for all your images.

## 🚀 Quick Setup (5 minutes)

### 1. Create Free Cloudinary Account

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up with your email
3. Verify your email address
4. You get **25 GB storage** and **25 GB bandwidth/month** FREE!

### 2. Get Your Credentials

1. Log in to Cloudinary Dashboard
2. You'll see your credentials on the main page:
   - **Cloud Name** (e.g., `dxxxxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

### 3. Add to Railway Environment Variables

Go to your Railway service → **Variables** tab and add:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Redeploy

Railway will automatically redeploy with the new environment variables.

## ✅ Testing

1. Upload a profile picture in your app
2. Restart your Railway service
3. The image should still be there! 🎉

## 📁 Where Images Are Stored

- **Profile Pictures**: `teakonn/avatars/` folder in Cloudinary
- **Chat Images**: `teakonn/messages/` folder in Cloudinary

## 🔧 Troubleshooting

### "No file uploaded" error
- Check that all 3 Cloudinary env vars are set in Railway
- Redeploy after adding env vars

### Images not loading
- Check browser console for CORS errors
- Cloudinary URLs should start with `https://res.cloudinary.com/`

### Upload fails
- Check file size (max 5MB for avatars, 10MB for messages)
- Verify image format (JPG, PNG, WEBP)

## 💰 Pricing

Cloudinary Free Tier includes:
- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ Unlimited transformations
- ✅ 500,000 transformations/month

Perfect for small to medium apps! 🚀

## 🔗 Useful Links

- [Cloudinary Dashboard](https://console.cloudinary.com/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Usage Statistics](https://console.cloudinary.com/console/usage)
