import express from "express";
import auth from "../middleware/auth.js";
import Venue from "../models/Venue.js";
import BookingRequest from "../models/BookingRequest.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

// POST /api/booking-requests/create
router.post("/create", auth, async (req, res) => {
  try {
    const { venueId, notes } = req.body || {};
    if (!venueId) return res.status(400).json({ error: "venueId required" });
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: "Venue not found" });
    // Allow booking requests even if a venue already has events; venue remains available

    // Create 1:1 conversation between requester and owner specific to this booking
    const conversation = await Conversation.create({
      participants: [req.user.id, venue.owner],
      isGroup: false,
      name: `Booking: ${venue.name}`,
      meta: { bookingVenueId: String(venue._id) },
    });

    const br = await BookingRequest.create({
      venue: venue._id,
      requester: req.user.id,
      owner: venue.owner,
      status: "pending",
      conversation: conversation._id,
      notes: notes || "",
    });

    const populated = await BookingRequest.findById(br._id)
      .populate("venue")
      .populate("requester", "username avatar")
      .populate("owner", "username avatar")
      .populate("conversation");

    // Realtime notifications: owner gets 'booking_received', requester gets 'booking_sent'
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(String(populated.owner?._id || populated.owner)).emit('notification', {
          kind: 'booking_received',
          title: `New booking request for ${populated.venue?.name || 'your venue'}`,
          message: `From ${populated.requester?.username || 'someone'}`,
          date: populated.createdAt || new Date().toISOString(),
          venue: populated.venue,
          requester: populated.requester,
          owner: populated.owner,
          bookingRequestId: populated._id,
          status: populated.status,
        });
        io.to(String(populated.requester?._id || populated.requester)).emit('notification', {
          kind: 'booking_sent',
          title: `Your booking request to ${populated.venue?.name || 'venue'}`,
          message: `Status: ${populated.status || 'pending'}`,
          date: populated.createdAt || new Date().toISOString(),
          venue: populated.venue,
          requester: populated.requester,
          owner: populated.owner,
          bookingRequestId: populated._id,
          status: populated.status,
        });
      }
    } catch (e) {
      console.warn('booking create notify emit failed:', e?.message || e);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error("Create booking request error:", err);
    res.status(500).json({ error: "Failed to create booking request" });
  }
});

// GET /api/booking-requests/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const br = await BookingRequest.findById(req.params.id)
      .populate("venue")
      .populate("requester", "username avatar")
      .populate("owner", "username avatar")
      .populate("conversation");
    if (!br) return res.status(404).json({ error: "Booking request not found" });
    const uid = String(req.user.id);
    const allowed = [String(br.requester), String(br.owner)].includes(uid);
    if (!allowed) return res.status(403).json({ error: "Not authorized" });
    res.json(br);
  } catch (err) {
    console.error("Get booking request error:", err);
    res.status(500).json({ error: "Failed to fetch booking request" });
  }
});

export default router;
// List my sent requests (event creators)
router.get('/my/sent', auth, async (req, res) => {
  try {
    const list = await BookingRequest.find({ requester: req.user.id })
      .sort({ createdAt: -1 })
      .populate('venue')
      .populate('owner', 'username avatar');
    res.json({ requests: list });
  } catch (err) {
    console.error('List my sent booking requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// List my received requests (venue owners)
router.get('/my/received', auth, async (req, res) => {
  try {
    const list = await BookingRequest.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .populate('venue')
      .populate('requester', 'username avatar');
    res.json({ requests: list });
  } catch (err) {
    console.error('List my received booking requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});
