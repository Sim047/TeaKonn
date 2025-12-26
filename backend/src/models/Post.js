// backend/src/models/Post.js
import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [{
    eventDate: { type: Date },
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    caption: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
    tags: [{ type: String }],
    location: { type: String, default: "" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    captionEditedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient queries
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

export default mongoose.model("Post", PostSchema);
