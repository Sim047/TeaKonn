import mongoose from "mongoose";

const StatusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    mood: { type: String, default: "" },      // e.g. "Busy", "Away", "In a meeting", or custom text
    emoji: { type: String, default: "" },     // optional emoji/icon string
    expiresAt: { type: Date, default: null }, // optional (not required for simple mood statuses)
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
StatusSchema.index({ user: 1 });

export default mongoose.model("Status", StatusSchema);
