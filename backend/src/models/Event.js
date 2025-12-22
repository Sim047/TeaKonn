// backend/src/models/Event.js
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    organizer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Optional sport type: when present, treated as a sports event
    sport: { type: String, default: undefined },
    startDate: { type: Date, required: true },
    // Optional end date; when past, event is considered completed and archived
    endsAt: { type: Date },
    time: { type: String },
    location: {
      name: String,
      address: String,
      city: String,
    },
    capacity: {
      max: { type: Number, default: 100 },
      current: { type: Number, default: 0 },
    },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pricing: {
      type: { type: String, enum: ["free", "paid"], default: "free" },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      paymentInstructions: { type: String },
    },
    requiresApproval: { type: Boolean, default: false },
    joinRequests: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        transactionCode: String,
        transactionDetails: String,
        requestedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      },
    ],
    status: { type: String, enum: ["draft", "published", "cancelled"], default: "published" },
    // Auto-archiving marker; when set the event should be hidden from "upcoming" lists
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

EventSchema.index({ startDate: 1 });
EventSchema.index({ endsAt: 1 });
EventSchema.index({ archivedAt: 1 });

export default mongoose.model("Event", EventSchema);
