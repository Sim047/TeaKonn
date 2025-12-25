import express from "express";
import auth from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import BookingRequest from "../models/BookingRequest.js";

const router = express.Router();

// POST /api/payments/initiate
router.post("/initiate", auth, async (req, res) => {
  try {
    const { bookingRequestId, amount, currency, idempotencyKey } = req.body || {};
    if (!bookingRequestId || !amount) {
      return res.status(400).json({ error: "bookingRequestId and amount required" });
    }
    const br = await BookingRequest.findById(bookingRequestId);
    if (!br) return res.status(404).json({ error: "Booking request not found" });
    // Only venue owner can initiate payment
    if (String(br.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only venue owner can initiate payment" });
    }

    if (idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) return res.json(existing);
    }

    const payment = await Payment.create({
      initiator: req.user.id,
      bookingRequest: br._id,
      amount: Number(amount),
      currency: currency || "KES",
      channel: "mpesa",
      status: "initiated",
      idempotencyKey: idempotencyKey || undefined,
      meta: { brId: String(br._id) },
    });

    // TODO: Integrate actual M-PESA STK push here using credentials
    // For now, return initiated status and expect callback to update success
    res.status(201).json(payment);
  } catch (err) {
    console.error("Initiate payment error:", err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// POST /api/payments/callback
router.post("/callback", async (req, res) => {
  try {
    const { externalRef, status, idempotencyKey } = req.body || {};
    // In production, verify signature and payload from M-PESA
    const payment = await Payment.findOne(
      idempotencyKey ? { idempotencyKey } : { externalRef }
    );
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    payment.status = status === "success" ? "success" : "failed";
    payment.externalRef = externalRef || payment.externalRef;
    await payment.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("Payment callback error:", err);
    res.status(500).json({ error: "Failed to process callback" });
  }
});

export default router;
