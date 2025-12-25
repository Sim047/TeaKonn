import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PaymentSchema = new Schema(
  {
    initiator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingRequest: { type: Schema.Types.ObjectId, ref: "BookingRequest" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "KES" },
    channel: { type: String, enum: ["mpesa"], default: "mpesa" },
    status: { type: String, enum: ["initiated", "success", "failed"], default: "initiated" },
    externalRef: { type: String },
    idempotencyKey: { type: String, unique: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PaymentSchema.index({ initiator: 1, status: 1 });

export default mongoose.model("Payment", PaymentSchema);
