// backend/src/models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingType: {
      type: String,
      enum: ["service", "event", "coach-session"],
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: String, // e.g., "10:00 AM"
    duration: {
      value: Number,
      unit: String,
    },
    location: {
      type: String,
      enum: ["in-person", "online", "tbd"],
      default: "tbd",
    },
    locationDetails: String,
    meetingLink: String, // for online sessions
    pricing: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "USD",
      },
      paid: {
        type: Boolean,
        default: false,
      },
      paymentMethod: String,
      paymentId: String,
      transactionCode: String,
      transactionDetails: String,
      paymentInstructions: String,
    },
    status: {
      type: String,
      enum: ["pending", "pending-approval", "payment-pending", "confirmed", "cancelled", "completed", "no-show", "rejected"],
      default: "payment-pending",
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: String,
    notes: String,
    clientNotes: String,
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    completedAt: Date,
    reminderSent: {
      type: Boolean,
      default: false,
    },
    rating: {
      clientRating: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
      },
      providerRating: {
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
      },
    },
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ client: 1, scheduledDate: -1 });
bookingSchema.index({ provider: 1, scheduledDate: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ scheduledDate: 1 });

export default mongoose.model("Booking", bookingSchema);
