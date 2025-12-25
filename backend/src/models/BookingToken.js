import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BookingTokenSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    venue: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingRequest: { type: Schema.Types.ObjectId, ref: "BookingRequest", required: true },
    status: { type: String, enum: ["active", "used", "expired", "payment_pending"], default: "payment_pending" },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

BookingTokenSchema.index({ code: 1 });
BookingTokenSchema.index({ requester: 1, status: 1 });
BookingTokenSchema.index({ owner: 1, status: 1 });

export default mongoose.model("BookingToken", BookingTokenSchema);
