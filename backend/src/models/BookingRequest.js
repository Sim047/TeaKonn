import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BookingRequestSchema = new Schema(
  {
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "token_generated"],
      default: "pending",
    },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation" },
    notes: { type: String, default: "" },
    expiresAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

BookingRequestSchema.index({ owner: 1, status: 1 });
BookingRequestSchema.index({ requester: 1, status: 1 });
BookingRequestSchema.index({ venue: 1, status: 1 });

export default mongoose.model("BookingRequest", BookingRequestSchema);
