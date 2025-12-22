// backend/src/routes/bookings.js
import express from "express";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Event from "../models/Event.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET all bookings for current user (my-bookings endpoint - where I'm the CLIENT)
router.get("/my-bookings", auth, async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;

    const query = { client: req.user.id };

    if (status) query.status = status;
    if (type) query.bookingType = type;

    const bookings = await Booking.find(query)
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("service", "name category pricing")
      .populate("event", "title sport startDate location")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    console.log(`[my-bookings] User ${req.user.id} has ${bookings.length} bookings as client`);
    res.json({ bookings });
  } catch (err) {
    console.error("Get my bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET all bookings for current user
router.get("/", auth, async (req, res) => {
  try {
    const { status, type, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {
      $or: [{ client: req.user.id }, { provider: req.user.id }],
    };

    if (status) query.status = status;
    if (type) query.bookingType = type;

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const bookings = await Booking.find(query)
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("service", "name category pricing")
      .populate("event", "title sport startDate")
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// GET single booking
router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("service")
      .populate("event");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check authorization
    if (
      booking.client.toString() !== req.user.id &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(booking);
  } catch (err) {
    console.error("Get booking error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// GET pending approval requests (for coaches/providers)
router.get("/pending-approvals/list", auth, async (req, res) => {
  try {
    console.log("[pending-approvals] Query for provider:", req.user.id);
    
    const pendingBookings = await Booking.find({
      provider: req.user.id,
      $or: [
        { status: "pending-approval", approvalStatus: "pending" },
        { status: "payment-pending", approvalStatus: "approved", paymentVerified: false }
      ]
    })
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("service")
      .populate("event")
      .sort({ createdAt: -1 });

    console.log("[pending-approvals] Found", pendingBookings.length, "bookings");
    res.json({ bookings: pendingBookings, count: pendingBookings.length });
  } catch (err) {
    console.error("Get pending approvals error:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// POST create booking
router.post("/", auth, async (req, res) => {
  try {
    const {
      bookingType,
      serviceId,
      eventId,
      providerId,
      scheduledDate,
      scheduledTime,
      location,
      notes,
      transactionCode,
      transactionDetails,
    } = req.body;

    let bookingData = {
      client: req.user.id,
      bookingType,
      scheduledDate,
      scheduledTime,
      location,
      clientNotes: notes,
      status: "payment-pending",
    };

    // Handle different booking types
    if (bookingType === "service") {
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      bookingData.service = serviceId;
      bookingData.provider = service.provider;
      bookingData.pricing = {
        amount: service.pricing.amount,
        currency: service.pricing.currency,
        transactionCode,
        transactionDetails,
      };
      bookingData.duration = service.duration;

      // Increment service booking count
      service.totalBookings += 1;
      await service.save();
    } else if (bookingType === "event") {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      bookingData.event = eventId;
      bookingData.provider = event.organizer;
      bookingData.pricing = {
        amount: event.pricing.amount,
        currency: event.pricing.currency,
        transactionCode,
        transactionDetails,
        paymentInstructions: event.pricing.paymentInstructions,
      };
      // Event bookings require coach approval
      bookingData.status = "pending-approval";
      bookingData.approvalStatus = "pending";
    } else if (bookingType === "coach-session") {
      bookingData.provider = providerId;
      bookingData.pricing = {
        ...req.body.pricing,
        transactionCode,
        transactionDetails,
      };
      bookingData.duration = req.body.duration;
    }

    const booking = await Booking.create(bookingData);

    await booking.populate("client provider service event");

    res.status(201).json(booking);
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// PUT update booking status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check authorization
    if (
      booking.client.toString() !== req.user.id &&
      booking.provider.toString() !== req.user.id
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    booking.status = status;

    if (status === "cancelled") {
      booking.cancelledBy = req.user.id;
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason;
    } else if (status === "completed") {
      booking.completedAt = new Date();
    }

    await booking.save();
    await booking.populate("client provider service event");

    res.json(booking);
  } catch (err) {
    console.error("Update booking status error:", err);
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// POST approve/reject booking (for coaches/providers)
router.post("/:id/approve", auth, async (req, res) => {
  try {
    const { approved, rejectionReason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is the provider
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the provider can approve/reject bookings" });
    }

    if (approved) {
      booking.approvalStatus = "approved";
      booking.approvedAt = new Date();
      booking.approvedBy = req.user.id;
      
      // If there's a payment amount, mark as payment-pending, otherwise confirmed
      if (booking.pricing && booking.pricing.amount > 0) {
        booking.status = "payment-pending";
      } else {
        booking.status = "confirmed";
        booking.paymentVerified = true;
      }

      // If this is an event booking, add user to event participants
      if (booking.bookingType === "event" && booking.event) {
        const Event = (await import("../models/Event.js")).default;
        const event = await Event.findById(booking.event);
        
        if (event && !event.participants.includes(booking.client)) {
          event.participants.push(booking.client);
          event.capacity.current = event.participants.length;
          
          // Update or remove the join request status
          const requestIndex = event.joinRequests.findIndex(
            (r) => r.user.toString() === booking.client.toString()
          );
          if (requestIndex > -1) {
            event.joinRequests[requestIndex].status = "approved";
          }
          
          await event.save();
        }
      }
    } else {
      booking.approvalStatus = "rejected";
      booking.status = "rejected";
      booking.rejectionReason = rejectionReason || "No reason provided";

      // If this is an event booking, update join request status
      if (booking.bookingType === "event" && booking.event) {
        const Event = (await import("../models/Event.js")).default;
        const event = await Event.findById(booking.event);
        
        if (event) {
          const requestIndex = event.joinRequests.findIndex(
            (r) => r.user.toString() === booking.client.toString()
          );
          if (requestIndex > -1) {
            event.joinRequests[requestIndex].status = "rejected";
          }
          await event.save();
        }
      }
    }

    await booking.save();
    await booking.populate("client provider service event");

    // Emit socket event to client about approval/rejection
    const io = req.app.get("io");
    if (io) {
      io.to(booking.client._id.toString()).emit("booking_status_update", {
        bookingId: booking._id,
        status: booking.status,
        approvalStatus: booking.approvalStatus,
        approved,
        rejectionReason: booking.rejectionReason,
        message: approved 
          ? `Your booking for "${booking.event?.title || booking.service?.name || 'this service'}" has been approved!`
          : `Your booking for "${booking.event?.title || booking.service?.name || 'this service'}" was rejected.`,
      });
    }

    res.json(booking);
  } catch (err) {
    console.error("Approve/reject booking error:", err);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// POST verify payment (for coaches/providers)
router.post("/:id/verify-payment", auth, async (req, res) => {
  try {
    const { verified, notes } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if user is the provider
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the provider can verify payment" });
    }

    booking.paymentVerified = verified;
    booking.verifiedAt = new Date();
    booking.verifiedBy = req.user.id;

    if (verified) {
      booking.status = "confirmed";
      booking.pricing.paid = true;
      
      if (notes) {
        booking.notes = notes;
      }
    } else {
      booking.status = "payment-pending";
      if (notes) {
        booking.notes = `Payment verification failed: ${notes}`;
      }
    }

    await booking.save();
    await booking.populate("client provider service event");

    // Emit socket event to client about payment verification
    const io = req.app.get("io");
    if (io) {
      io.to(booking.client._id.toString()).emit("booking_status_update", {
        bookingId: booking._id,
        status: booking.status,
        paymentVerified: booking.paymentVerified,
        message: verified 
          ? `Payment verified! Your booking for "${booking.event?.title || booking.service?.name || 'this service'}" is confirmed.`
          : `Payment verification failed for "${booking.event?.title || booking.service?.name || 'this service'}". Please contact the provider.`,
      });
    }

    res.json(booking);
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// POST add rating to booking
router.post("/:id/rate", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ error: "Can only rate completed bookings" });
    }

    // Determine if rating is from client or provider
    if (booking.client.toString() === req.user.id) {
      booking.rating.clientRating = { score: rating, comment };
    } else if (booking.provider.toString() === req.user.id) {
      booking.rating.providerRating = { score: rating, comment };
    } else {
      return res.status(403).json({ error: "Not authorized" });
    }

    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error("Rate booking error:", err);
    res.status(500).json({ error: "Failed to rate booking" });
  }
});

// POST verify payment and approve booking (provider only)
router.post("/:id/verify-payment", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("event", "title sport");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Only the provider (event organizer) can verify payment
    if (booking.provider._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the event organizer can verify payment" });
    }

    booking.paymentVerified = true;
    booking.verifiedAt = new Date();
    booking.verifiedBy = req.user.id;
    booking.status = "confirmed";

    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// POST reject booking payment (provider only)
router.post("/:id/reject-payment", auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate("client", "username email avatar")
      .populate("provider", "username email avatar")
      .populate("event", "title sport");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Only the provider can reject payment
    if (booking.provider._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the event organizer can reject payment" });
    }

    booking.status = "cancelled";
    booking.cancelledBy = req.user.id;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Payment verification failed";

    await booking.save();

    res.json(booking);
  } catch (err) {
    console.error("Reject payment error:", err);
    res.status(500).json({ error: "Failed to reject payment" });
  }
});

export default router;

