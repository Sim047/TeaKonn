# ✨ TEAKONN - Social Network & Communication Platform

A modern, feature-rich social networking and communication platform built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.IO. TeaKonn combines real-time messaging, social feeds, event management, and sports booking into one seamless experience.

![TeaKonn Logo](frontend/src/assets/teakonn-logo.png)

## 🌐 Live Demo

 - **Frontend:** [https://teakonn-app.vercel.app](https://teakonn-app.vercel.app)
 - **Backend API:** [https://teakonn-app-production.up.railway.app](https://teakonn-app-production.up.railway.app)

## ✨ Features

### Social Feed (Instagram-like Posts)
- **Create posts** with images, captions, location, and tags
- **Like and comment** on posts in real-time
- **Edit posts** - Update captions, location, and tags
- **Delete posts** with confirmation
- **Comment system** with full CRUD operations
- **Like comments** - Show appreciation for individual comments
- **Reply to comments** - Threaded reply system for discussions
- **Collapsible comments** - Show last 3, expand to see all
- **Smart timestamps** - Relative time for recent posts, absolute for older
- **Scroll-to-top button** - Quick navigation for long feeds
- **Image upload** via Cloudinary (persistent storage)

### 💬 Real-Time Messaging
- **Instant messaging** with Socket.IO for real-time communication
- **Private direct messages** with conversation history
- **Message reactions** with emoji support (❤️, 🔥, 😂, 👍, 😮, 😢)
- **Edit and delete** your own messages
- **Typing indicators** to see when others are typing
- **Online/offline status** with green indicator dots
- **Message timestamps** with smart formatting
- **File attachments** and image sharing
- **Per-user message hiding** system

### 🏃 Sports Events & Booking System
- **Create events** - Organize sports activities with details
- **Join events** - Send requests to participate
- **Manage bookings** - Approve/reject join requests
- **Event discovery** - Browse all available sports events
- **My Events** - Track events you've created
- **My Join Requests** - Monitor your pending requests
- **Pending Approvals** - Review incoming requests for your events
- **Real-time updates** - Get notified of booking changes

### 👥 Social Networking
- **User directory** - Browse all registered users with modern card layout
- **Follow/Unfollow** system with counters
- **View followers and following** lists
- **User profiles** with comprehensive information
- **Profile modal** - Quick view user details without navigation
- **Custom status messages** (Available, Busy, Away, Do Not Disturb)
- **Avatar upload** with Cloudinary integration
- **Profile customization** - Update bio and personal info

### 🎨 Modern UI/UX
- **Responsive design** - Works perfectly on desktop, tablet, and mobile
- **Dark mode** with elegant gradient backgrounds
- **Gradient accent colors** (Cyan to Purple theme throughout)
- **Smooth animations** and transitions
- **Compressed dashboard** - Clickable banner cards for clean navigation
- **Loading states** - Skeleton loaders and spinners
- **Empty states** - Friendly messages when no content exists
- **Modal dialogs** - Create posts, events, and manage bookings
- **Toast notifications** - Real-time feedback for actions
- **Headless UI components** - Accessible dropdowns and menus
- **Search functionality** for finding users
- **Avatar system** with fallback to initials

### 🔐 Security & Authentication
- **JWT-based authentication**
- **Secure password hashing**
- **Protected routes and API endpoints**
- **User session management**

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite 5.4** for fast development and building
- **Tailwind CSS 3** for styling
- **Socket.IO Client** for real-time communication
- **Axios** for HTTP requests
- **Day.js** with plugins (relativeTime, localizedFormat) for date formatting
- **Headless UI** for accessible components
- **Lucide React** for modern icons

### Backend
- **Node.js** with Express (ES modules)
- **MongoDB** with Mongoose ODM
- **Socket.IO** for WebSocket communication
- **JWT** for authentication
- **Multer & Sharp** for image processing
- **bcrypt** for password encryption
- **Cloudinary SDK** for cloud image storage
- **CORS** for cross-origin resource sharing

### Deployment
- **Frontend:** Vercel (https://teakonn-app.vercel.app)
- **Backend:** Railway (https://teakonn-app-production.up.railway.app)
- **Database:** MongoDB Atlas
- **Images:** Cloudinary

## 📸 Screenshots

### Social Feed
![Posts Feed](screenshots/posts-feed.png)
*Instagram-like feed with likes, comments, and replies*

### Sports Events
![Events Dashboard](screenshots/events.png)
*Create and manage sports events with booking system*

### Real-Time Chat
![Chat Interface](screenshots/chat.png)
*Private messaging with online status and typing indicators*

### User Directory
![All Users](screenshots/all-users.png)
*Modern user directory with search and follow functionality*

### Dashboard
![Dashboard](screenshots/dashboard.png)
*Compressed banner-style navigation for clean UX*

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Sim047/TeaKonn.git
cd TeaKonn
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Set up environment variables**

Create `.env` file in the `backend` directory:
```env
# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# Cloudinary (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upload Directory (optional, defaults to 'uploads')
UPLOAD_DIR=uploads
```

Create `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000
```

**Setting up Cloudinary (Required for image uploads):**

See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for detailed instructions.

Quick setup:
1. Sign up for free at [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Get 25 GB storage + 25 GB bandwidth/month FREE
3. Copy your Cloud Name, API Key, and API Secret from the dashboard
4. Add them to your backend `.env` file
5. Images will be stored in `teakonn/avatars/` and `teakonn/posts/` folders

5. **Run the application**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## 📱 How to Use

### 1. **Sign Up / Login**
- Create a new account with username, email, and password
- Or login with existing credentials
- JWT tokens keep you securely logged in

### 2. **Social Feed (Posts)**
- Click **Posts** in the sidebar to see the Instagram-like feed
- **Create Post**: Click "Create Post" button at the top
  - Add caption, image, location, and hashtags
  - Images uploaded to Cloudinary for persistence
- **Interact with Posts**:
  - ❤️ Like posts and see like counts
  - 💬 Add comments with full text
  - 👍 Like individual comments
  - 💭 Reply to comments (threaded conversations)
  - ✏️ Edit your own posts and comments
  - 🗑️ Delete your posts/comments
- **Scroll-to-Top**: Use the floating arrow button when scrolling down

### 3. **Sports Events & Bookings**
- **Discover Events**: Browse all available sports activities
- **Create Event**: Click "Create Event" on dashboard
  - Set sport type, location, date/time, max participants
  - Add description and requirements
- **Join Events**: Send requests to participate
- **Manage Your Events**:
  - **My Events**: View events you've created
  - **My Join Requests**: Track your pending requests
  - **Pending Approvals**: Approve/reject requests for your events
- **Event Details**: Click on any event to see participants and details

### 4. **Direct Messages**
- Browse **All Users** to find people
- Click **Message** to start a private conversation
- View your active conversations in **Direct Messages**
- Features:
  - 🟢 See who's online with green status dots
  - ⌨️ Typing indicators when they're typing
  - 😊 React to messages with emojis
  - ✏️ Edit your sent messages
  - 🗑️ Delete messages
  - 📎 Share files and images

### 5. **User Directory & Social**
- **Browse Users**: Modern card layout with search
- **Follow System**: Follow/unfollow users
- **View Profiles**: Click avatars or names to see profiles
- **Followers & Following**: Track your social connections
- **Profile Customization**:
  - Upload profile avatar
  - Set status (Available, Busy, Away, Do Not Disturb)
  - Update bio and personal information

### 6. **Dashboard Navigation**
- **Compressed Banner Cards** for clean navigation
- Click any banner to access:
  - My Events
  - My Join Requests
  - Pending Approvals
  - All Events
  - Sport Events
  - Notifications
- "Ready to Train?" prompt at the bottom

## 🎯 Key Features Explained

### Real-Time Communication
- **Socket.IO Integration**: Instant updates across all features
- **Online Presence**: See who's active with green indicators
- **Typing Indicators**: Know when someone is typing
- **Live Updates**: Posts, comments, likes, and events update in real-time
- **Connection Status**: Automatic reconnection handling

### Social Feed System
- **Instagram-like Interface**: Familiar and intuitive design
- **Rich Interactions**: Like, comment, reply, and share thoughts
- **Smart Timestamps**: Relative time for recent, absolute for older
- **Collapsible Comments**: Clean interface with expandable threads
- **Edit Tracking**: "(edited)" label only when caption/content actually changes
- **Persistent Storage**: Images stored on Cloudinary, not local filesystem

### Booking & Events System
- **Request-Based**: Users request to join, organizers approve
- **Participant Management**: Track who's joined and who's pending
- **Dedicated Pages**: Separate views for My Events, Join Requests, and Approvals
- **Real-Time Updates**: Get notified when requests are approved/rejected
- **Event Discovery**: Browse all available sports activities
- **Capacity Control**: Set max participants for events

### Responsive Design
- **Desktop**: Full sidebar with all features visible
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Compressed view with hamburger menu
- **All Views**: Smooth scrolling and consistent experience
- **Dark Mode**: Elegant gradients and proper contrast

### Security & Data Management
- **JWT Authentication**: Secure token-based auth system
- **Protected Routes**: Both frontend and backend route protection
- **Password Encryption**: bcrypt with salt rounds
- **Per-User Visibility**: Hide messages without deleting
- **Permission Checks**: Only authors can edit, owners can delete
- **CORS Protection**: Restricted to allowed origins

## 🔒 Privacy & Security

- **Password Encryption**: bcrypt with salt rounds for secure hashing
- **JWT Authentication**: Secure token-based session management
- **Protected Endpoints**: Middleware authentication on all routes
- **CORS Configuration**: Restricted to allowed origins only
- **Input Validation**: Server-side validation on all inputs
- **Secure Image Upload**: Cloudinary integration with size limits
- **MongoDB Security**: Connection string encryption and access control

## 📂 Project Structure

```
TeaKonn/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authentication middleware
│   │   ├── models/
│   │   │   ├── User.js           # User schema
│   │   │   ├── Message.js        # Message schema
│   │   │   ├── Conversation.js   # Conversation schema
│   │   │   ├── Post.js           # Post schema (with comments & replies)
│   │   │   ├── Event.js          # Event schema
│   │   │   ├── Booking.js        # Booking schema
│   │   │   └── Status.js         # User status schema
│   │   ├── routes/
│   │   │   ├── auth.js           # Authentication routes
│   │   │   ├── users.js          # User management
│   │   │   ├── messages.js       # Messaging routes
│   │   │   ├── conversations.js  # Conversation routes
│   │   │   ├── posts.js          # Post & comment routes
│   │   │   ├── events.js         # Event management
│   │   │   ├── bookings.js       # Booking system
│   │   │   ├── files.js          # File upload
│   │   │   └── status.js         # User status
│   │   └── server.js             # Main server with Socket.IO
│   ├── package.json
│   └── .env                      # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ConversationsList.tsx
│   │   │   ├── StatusPicker.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx     # Main dashboard
│   │   │   ├── Posts.tsx         # Social feed
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── AllUsers.tsx
│   │   │   ├── SportEvents.tsx
│   │   │   ├── MyEvents.tsx
│   │   │   ├── PendingApprovals.tsx
│   │   │   └── MyJoinRequests.tsx
│   │   ├── utils/
│   │   │   ├── api.ts            # Axios configuration
│   │   │   └── axios.ts
│   │   ├── App.tsx               # Main app component
│   │   ├── socket.tsx            # Socket.IO client
│   │   └── main.tsx
│   ├── package.json
│   └── .env                      # Environment variables
├── App/                          # Expo React Native mobile app (canonical)
│   ├── App.tsx
│   ├── app.json
│   ├── src/
│   │   ├── api.ts               # Axios base using EXPO_PUBLIC_* env
│   │   └── socket.ts            # Socket.IO client
│   └── package.json
├── CLOUDINARY_SETUP.md           # Cloudinary setup guide
├── README.md
└── vercel.json                   # Vercel deployment config
```

## 🚀 Deployment Guide

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variable: `VITE_API_URL=https://your-backend-url`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy automatically on push to main

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL` (comma-separated for multiple domains)

### Mobile (Expo)
1. Use the `App/` folder as the mobile project.
2. Configure environment before running (PowerShell example):
  - `$env:EXPO_PUBLIC_API_URL = "https://teakonn-app-production.up.railway.app/api"`
  - `$env:EXPO_PUBLIC_API_BASE = "https://your-backend-url"`
3. Run from `App/`:
  - `npm install`
  - `npx expo start`
4. Optionally set `extra.apiUrl`/`extra.apiBase` in `App/app.json`.
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Railway auto-deploys on push to main

### Database (MongoDB Atlas)
1. Create a free cluster at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist IP addresses (or use 0.0.0.0/0 for development)
3. Create database user with read/write permissions
4. Copy connection string and add to `MONGO_URI`

## 👨‍💻 Developer

**Created by:** Simon Kathulu  
**GitHub:** [@Sim047](https://github.com/Sim047)  
**Repository:** [TeaKonn-App](https://github.com/Sim047/TeaKonn-App)  
**Copyright:** © 2025 Simon Kathulu

## 📄 License

This project is open source and available under the MIT License.

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea? Open an issue on [GitHub Issues](https://github.com/Sim047/TeaKonn-App/issues)

## 🙏 Acknowledgments

- **Socket.IO** - Real-time bidirectional communication
- **Tailwind CSS** - Utility-first CSS framework
- **Vercel** - Frontend hosting and deployment
- **Railway** - Backend hosting (moved from Render)

### Google Login Setup

- Backend envs (Railway):
  - `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_IDS` (comma-separated for multiple) — set to your Google OAuth Web client ID(s)
  - `JWT_SECRET` — unchanged

- Frontend env (Vercel):
  - `VITE_GOOGLE_CLIENT_ID` — same Web client ID

- Flow:
  - Frontend obtains Google ID token via Google Identity Services and POSTs to `/api/auth/google`.
  - Backend verifies token, creates/updates user, and returns a JWT.
- **MongoDB Atlas** - Cloud database services
- **Cloudinary** - Image hosting and management
- **React** - UI library
- **Express** - Backend framework
- **Headless UI** - Accessible UI components
- **Lucide React** - Beautiful icon library

---

**Connect, Share, and Explore with TEAKONN! 💬✨🏃‍♂️**
