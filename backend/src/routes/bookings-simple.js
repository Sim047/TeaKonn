// Simple Bookings Routes - Fresh Start
import express from "express";
import BookingSimple from "../models/BookingSimple.js";
import Event from "../models/Event.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// CREATE: Join an event (create booking)
router.post("/create", auth, async (req, res) => {
  try {
    const { eventId, transactionCode } = req.body;
    
    console.log("📝 Creating booking:", { eventId, userId: req.user.id, transactionCode });
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Check if already booked
    const existing = await BookingSimple.findOne({ event: eventId, user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: "You already requested to join this event" });
    }
    
    // Create booking
    const booking = await BookingSimple.create({
      user: req.user.id,
      event: eventId,
      transactionCode: transactionCode || "",
      status: "pending",
    });
    
    console.log("✅ Booking created:", booking._id);
    
    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ Create booking error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// GET: My bookings (requests I made)
router.get("/my-requests", auth, async (req, res) => {
  try {
    const bookings = await BookingSimple.find({ user: req.user.id })
      .populate("event", "title startDate location organizer")
      .populate({
        path: "event",
        populate: { path: "organizer", select: "username avatar" }
      })
      .sort({ createdAt: -1 });
    
    console.log(`📤 User ${req.user.id} has ${bookings.length} requests`);
    res.json({ bookings });
  } catch (err) {
    console.error("Get my requests error:", err);
    res.status(500).json({ error: "Failed to load your requests" });
  }
});

// GET: Bookings to approve (requests for MY events)
router.get("/to-approve", auth, async (req, res) => {
  try {
    // Find all my events
    const myEvents = await Event.find({ organizer: req.user.id }).select("_id");
    const eventIds = myEvents.map(e => e._id);
    
    // Find pending bookings for my events
    const bookings = await BookingSimple.find({ 
      event: { $in: eventIds },
      status: "pending" 
    })
      .populate("user", "username email avatar")
      .populate("event", "title startDate location pricing")
      .sort({ createdAt: -1 });
    
    console.log(`📥 User ${req.user.id} has ${bookings.length} bookings to approve`);
    res.json({ bookings });
  } catch (err) {
    console.error("Get approvals error:", err);
    res.status(500).json({ error: "Failed to load approval requests" });
  }
});

// POST: Approve or reject booking
router.post("/:id/decide", auth, async (req, res) => {
  try {
    const { approved, rejectionReason } = req.body;
    
    const booking = await BookingSimple.findById(req.params.id)
      .populate("event", "organizer participants pricing");
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Check if user is the event organizer
    if (booking.event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    if (approved) {
      booking.status = "approved";
      
      // Add user to event participants AND update count
      const event = await Event.findById(booking.event._id);
      if (!event.participants.includes(booking.user)) {
        event.participants.push(booking.user);
        
        // Update capacity count
        if (event.capacity) {
          event.capacity.current = event.participants.length;
        }
        
        await event.save();
        console.log("✅ Booking approved, user added to event. New participant count:", event.participants.length);
      }
      
      console.log("✅ Booking approved:", booking._id);
    } else {
      booking.status = "rejected";
      booking.rejectionReason = rejectionReason || "No reason provided";
      console.log("❌ Booking rejected:", booking._id);
    }
    
    await booking.save();
    
    // Emit socket notification
    const io = req.app.get("io");
    if (io) {
      io.to(booking.user.toString()).emit("booking_update", {
        bookingId: booking._id,
        status: booking.status,
        message: approved ? "Your booking was approved!" : "Your booking was rejected"
      });
    }
    
    res.json({ success: true, booking });
  } catch (err) {
    console.error("Decide booking error:", err);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// POST: Mark payment as verified
router.post("/:id/verify-payment", auth, async (req, res) => {
  try {
    const booking = await BookingSimple.findById(req.params.id)
      .populate("event", "organizer");
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Check authorization
    if (booking.event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    booking.isPaid = true;
    await booking.save();
    
    console.log("💰 Payment verified for booking:", booking._id);
    
    res.json({ success: true, booking });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
