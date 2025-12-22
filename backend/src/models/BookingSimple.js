// Simple Booking Model - Fresh Start
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Who is booking
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    // What event they're booking
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    
    // Simple status: pending → approved → confirmed
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    
    // Payment info (if paid event)
    transactionCode: { type: String, default: "" },
    isPaid: { type: Boolean, default: false },
    
    // Rejection reason
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for fast queries
bookingSchema.index({ event: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });

export default mongoose.model("BookingSimple", bookingSchema);
