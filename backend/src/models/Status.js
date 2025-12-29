import mongoose from "mongoose";

const StatusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    mood: { type: String, default: "", trim: true, maxlength: 40 },      // e.g. "Busy", "Away", custom text (max 40 chars)
    emoji: { type: String, default: "", maxlength: 8 },                  // optional emoji/icon (max 8 chars)
    expiresAt: { type: Date, default: null }, // optional (not required for simple mood statuses)
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
StatusSchema.index({ user: 1 });

export default mongoose.model("Status", StatusSchema);
