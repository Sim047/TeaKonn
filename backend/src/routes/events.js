// backend/src/routes/events.js
import express from "express";
import Event from "../models/Event.js";
import Message from "../models/Message.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET /api/events - list events (simple)
router.get("/", async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const q = { status: "published" };
    if (!includeArchived) {
      q.$or = [
        { archivedAt: { $exists: false } },
        { archivedAt: null }
      ];
    }
    if (req.query.sport && String(req.query.sport).trim()) {
      q.sport = req.query.sport;
    }
    if (req.query.category) {
      const cat = String(req.query.category).toLowerCase();
      if (cat === "sports") {
        q.sport = { $exists: true, $nin: [null, ""] };
      } else if (cat === "other") {
        // events without a sport set are considered "Other Events"
        q.$or = [{ sport: { $exists: false } }, { sport: null }, { sport: "" }];
      }
    }
    if (req.query.search && String(req.query.search).trim()) {
      const s = String(req.query.search).trim();
      const rx = new RegExp(s, "i");
      const or = [
        { title: rx },
        { description: rx },
        { sport: rx },
        { "location.name": rx },
        { "location.city": rx },
        { "location.address": rx },
      ];
      q.$or = q.$or ? q.$or.concat(or) : or;
    }
    // Optional field selection to slim payloads in preview lists
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[\,\s]+/).filter(Boolean).join(" ") : null;

    // Pagination params
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const baseQuery = Event.find(q)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);
    if (selectFields) baseQuery.select(selectFields);

    const [events, total] = await Promise.all([
      baseQuery.populate("organizer", "username avatar"),
      Event.countDocuments(q),
    ]);

    res.json({
      events,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// GET /api/events/user/:userId - list published events organized by a specific user (paginated)
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const query = { status: "published", organizer: userId };
    if (!includeArchived) {
      query.$or = [
        ...(query.$or || []),
        { archivedAt: { $exists: false } },
        { archivedAt: null }
      ];
    }
    if (req.query.sport && String(req.query.sport).trim()) {
      query.sport = req.query.sport;
    }
    if (req.query.category) {
      const cat = String(req.query.category).toLowerCase();
      if (cat === "sports") {
        query.sport = { $exists: true, $nin: [null, ""] };
      } else if (cat === "other") {
        query.$or = [{ sport: { $exists: false } }, { sport: null }, { sport: "" }];
      }
    }
    if (req.query.search && String(req.query.search).trim()) {
      const s = String(req.query.search).trim();
      const rx = new RegExp(s, "i");
      const or = [
        { title: rx },
        { description: rx },
        { sport: rx },
        { "location.name": rx },
        { "location.city": rx },
        { "location.address": rx },
      ];
      query.$or = query.$or ? query.$or.concat(or) : or;
    }
    // Optional field selection to slim payloads in preview lists
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[,\s]+/).filter(Boolean).join(" ") : null;

    const baseQuery = Event.find(query)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);
    if (selectFields) baseQuery.select(selectFields);

    const [events, total] = await Promise.all([
      baseQuery.populate("organizer", "username avatar"),
      Event.countDocuments(query),
    ]);

    res.json({
      events,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("Get events by user error:", err);
    res.status(500).json({ error: "Failed to fetch user's events" });
  }
});

// GET /api/events/my/created - events organized by current user
router.get("/my/created", auth, async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const q = { organizer: req.user.id };
    if (!includeArchived) {
      q.$or = [
        { archivedAt: { $exists: false } },
        { archivedAt: null },
      ];
    }
    const events = await Event.find(q)
      .sort({ startDate: -1 })
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email")
      .populate("joinRequests.user", "username avatar email");
    res.json({ events });
  } catch (err) {
    console.error("Get my created events error:", err);
    res.status(500).json({ error: "Failed to fetch created events" });
  }
});

// PUT /api/events/:id - update event (organizer only)
router.put("/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizer) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only organizer can update event" });
    }

    const allowed = [
      "title","description","sport","startDate","time","location",
      "requiresApproval","status","image","skillLevel",
      "capacity","pricing","archivedAt"
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'capacity' && typeof req.body.capacity === 'object') {
          event.capacity = event.capacity || {};
          if (req.body.capacity.max !== undefined) event.capacity.max = req.body.capacity.max;
          if (req.body.capacity.current !== undefined) event.capacity.current = req.body.capacity.current;
        } else if (key === 'pricing' && typeof req.body.pricing === 'object') {
          event.pricing = event.pricing || {};
          if (req.body.pricing.type !== undefined) event.pricing.type = req.body.pricing.type;
          if (req.body.pricing.amount !== undefined) event.pricing.amount = req.body.pricing.amount;
          if (req.body.pricing.currency !== undefined) event.pricing.currency = req.body.pricing.currency;
          if (req.body.pricing.paymentInstructions !== undefined) event.pricing.paymentInstructions = req.body.pricing.paymentInstructions;
        } else if (key === 'archivedAt') {
          // Allow archiving/restoring events
          if (req.body.archivedAt === null) {
            event.archivedAt = null;
          } else if (req.body.archivedAt) {
            event.archivedAt = new Date(req.body.archivedAt);
          }
        } else {
          event[key] = req.body[key];
        }
      }
    }

    await event.save();
    const populated = await Event.findById(event._id)
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email")
      .populate("joinRequests.user", "username avatar email");

    res.json(populated);
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// GET /api/events/my/joined - events where current user is a participant
router.get("/my/joined", auth, async (req, res) => {
  try {
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const q = { participants: req.user.id };
    if (!includeArchived) {
      q.$or = [
        { archivedAt: { $exists: false } },
        { archivedAt: null },
      ];
    }
    const events = await Event.find(q)
      .sort({ startDate: -1 })
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email")
      .populate("joinRequests.user", "username avatar email");
    res.json({ events });
  } catch (err) {
    console.error("Get my joined events error:", err);
    res.status(500).json({ error: "Failed to fetch joined events" });
  }
});

// GET /api/events/my/archived - archived events where current user is organizer or participant
router.get("/my/archived", auth, async (req, res) => {
  try {
    const archivedCriteria = { $and: [
      { $or: [ { archivedAt: { $exists: true } }, { archivedAt: { $ne: null } } ] },
    ] };

    const [createdArchived, joinedArchived] = await Promise.all([
      Event.find({ ...archivedCriteria, organizer: req.user.id })
        .sort({ startDate: -1 })
        .populate("organizer", "username avatar")
        .populate("participants", "username avatar email"),
      Event.find({ ...archivedCriteria, participants: req.user.id })
        .sort({ startDate: -1 })
        .populate("organizer", "username avatar")
        .populate("participants", "username avatar email"),
    ]);

    // Dedupe across created/joined
    const seen = new Set();
    const combined = [...createdArchived, ...joinedArchived].filter((e) => {
      const id = String(e._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json({ events: combined });
  } catch (err) {
    console.error("Get my archived events error:", err);
    res.status(500).json({ error: "Failed to fetch archived events" });
  }
});

// GET /api/events/my/pending - events where current user has a pending join request
router.get("/my/pending", auth, async (req, res) => {
  try {
    const events = await Event.find({
      "joinRequests.user": req.user.id,
      "joinRequests.status": "pending",
    })
      .sort({ startDate: -1 })
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email")
      .populate("joinRequests.user", "username avatar email");
    res.json({ events });
  } catch (err) {
    console.error("Get my pending events error:", err);
    res.status(500).json({ error: "Failed to fetch pending events" });
  }
});

// GET /api/events/:id
router.get("/:id", async (req, res) => {
  try {
    // Optional field selection; if provided we still populate common relations when possible
    const fieldsParam = String(req.query.fields || "").trim();
    const selectFields = fieldsParam ? fieldsParam.split(/[,\s]+/).filter(Boolean).join(" ") : null;
    const byIdQuery = Event.findById(req.params.id);
    if (selectFields) byIdQuery.select(selectFields);
    const event = await byIdQuery
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email")
      .populate("joinRequests.user", "username avatar email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("Get event error:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// POST /api/events - create
router.post("/", auth, async (req, res) => {
  try {
    const { bookingTokenCode } = req.body || {};

    // Path A: Venue-based event using a booking token (existing flow)
    if (bookingTokenCode) {
      const { default: BookingToken } = await import("../models/BookingToken.js");
      const { default: Venue } = await import("../models/Venue.js");

      const token = await BookingToken.findOne({ code: bookingTokenCode }).populate("venue");
      if (!token) return res.status(404).json({ error: "Invalid booking token" });
      if (token.status !== "active") return res.status(400).json({ error: "Token is not active" });
      if (new Date() > token.expiresAt) return res.status(400).json({ error: "Token has expired" });
      if (String(token.requester) !== String(req.user.id)) return res.status(403).json({ error: "Token not issued to this user" });

      const venue = token.venue;
      if (!venue) return res.status(400).json({ error: "Token missing venue" });

      // Build event payload: location auto-populated and locked
      const data = { ...req.body, organizer: req.user.id };
      data.venue = venue._id;
      data.location = {
        name: venue.location?.name || venue.name,
        address: venue.location?.address,
        city: venue.location?.city,
        state: venue.location?.state,
        country: venue.location?.country,
      };
      data.bookingTokenCode = bookingTokenCode;

      // Remove client-provided free-text venue fields to prevent override
      delete data.locationName;
      delete data.address;
      delete data.city;
      delete data.state;
      delete data.country;

      const event = await Event.create(data);
      await event.populate("organizer", "username avatar");

      // Consume token (do not lock venue to allow multiple bookings)
      token.status = "used";
      token.consumedAt = new Date();
      await token.save();
      // Previously: mark venue as booked/unavailable.
      // Now: keep venue available so multiple events can book the same venue.

      return res.status(201).json(event);
    }

    // Path B: General event creation without a booking token (allow for everyone)
    const data = { ...req.body, organizer: req.user.id };

    // If client provided free-text location fields, map into location
    const locName = data.locationName || data.location?.name;
    const loc = {
      name: locName || undefined,
      address: data.address || data.location?.address,
      city: data.city || data.location?.city,
      state: data.state || data.location?.state,
      country: data.country || data.location?.country,
    };
    // Only set location if at least one value provided
    if (Object.values(loc).some((v) => v)) {
      data.location = loc;
    }

    // Ensure venue, bookingTokenCode are unset in general events
    delete data.venue;
    delete data.bookingTokenCode;

    const event = await Event.create(data);
    await event.populate("organizer", "username avatar");

    return res.status(201).json(event);
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// POST /api/events/:id/join
router.post("/:id/join", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const event = await Event.findById(req.params.id).populate("organizer", "username avatar");
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Duplicate check
    if ((event.participants || []).some(p => String(p) === String(userId))) {
      return res.status(400).json({ error: "You have already joined this event" });
    }

    // Capacity guard
    const max = Number(event.capacity?.max || 1000);
    if ((event.participants?.length || 0) >= max) {
      return res.status(400).json({ error: "Event is full" });
    }

    // Immediate free join: ignore pricing and approval
    event.participants = event.participants || [];
    event.participants.push(userId);
    if (event.capacity) event.capacity.current = event.participants.length;

    await event.save();

    const io = req.app.get("io");
    if (io) io.emit("participant_joined", { eventId: event._id, participantId: userId });

    return res.json({ success: true, message: "Successfully joined event" });
  } catch (err) {
    console.error("Join event error:", err);
    res.status(500).json({ error: "Failed to join event", details: err.message });
  }
});

// POST approve request (organizer)
router.post("/:id/approve-request/:requestId", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizer) !== String(req.user.id)) return res.status(403).json({ error: "Not authorized" });

    const reqObj = event.joinRequests.id(req.params.requestId);
    if (!reqObj) return res.status(404).json({ error: "Request not found" });
    if (reqObj.status !== "pending") return res.status(400).json({ error: "Request already processed" });
    // Capacity guard
    const currentCount = (event.participants || []).length;
    const max = Number(event.capacity?.max || 1000);
    if (currentCount >= max) {
      // mark request rejected due to full capacity and notify
      reqObj.status = "rejected";
      reqObj.rejectionReason = "Event full";
      await event.save();
      const ioFull = req.app.get("io");
      if (ioFull) ioFull.emit("join_request_rejected", { eventId: event._id, userId: String(reqObj.user), reason: "Event is full" });
      return res.status(400).json({ error: "Event is at full capacity" });
    }

    // Prevent double adding
    if ((event.participants || []).some(p => String(p) === String(reqObj.user))) {
      reqObj.status = "approved";
      await event.save();
      return res.json({ success: true, message: "Request approved (user already a participant)" });
    }

    // Approve and add participant
    event.participants = event.participants || [];
    event.participants.push(reqObj.user);
    reqObj.status = "approved";
    if (event.capacity) event.capacity.current = event.participants.length;
    await event.save();

    // Populate for richer emit
    await event.populate("participants", "username avatar email");
    await event.populate("joinRequests.user", "username avatar email");

    const io = req.app.get("io");
    if (io) {
      io.emit("join_request_approved", { eventId: event._id, userId: String(reqObj.user) });
      io.emit("participant_joined", { eventId: event._id, participantId: String(reqObj.user) });
    }

    res.json({ success: true, message: "Request approved", event });
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ error: "Failed to approve request" });
  }
});

// POST reject request (organizer)
router.post("/:id/reject-request/:requestId", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizer) !== String(req.user.id)) return res.status(403).json({ error: "Not authorized" });

    const reqObj = event.joinRequests.id(req.params.requestId);
    if (!reqObj) return res.status(404).json({ error: "Request not found" });
    if (reqObj.status !== "pending") return res.status(400).json({ error: "Request already processed" });
    const { reason } = req.body || {};
    reqObj.status = "rejected";
    if (reason) reqObj.rejectionReason = String(reason).slice(0, 500);
    await event.save();

    const io = req.app.get("io");
    if (io) io.emit("join_request_rejected", { eventId: event._id, userId: String(reqObj.user), reason: reqObj.rejectionReason || null });

    res.json({ success: true, message: "Request rejected", requestId: reqObj._id });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});
 

// GET my join requests (events I've requested to join)
router.get("/my-join-requests", auth, async (req, res) => {
  try {
    console.log("Fetching join requests for user:", req.user.id);
    
    // Find events where user has a join request
    const events = await Event.find({
      "joinRequests.user": req.user.id,
    })
      .populate("organizer", "username avatar")
      .populate("joinRequests.user", "username avatar")
      .lean();

    console.log("Found events with requests:", events.length);

    // Map to simpler structure
    const myRequests = events
      .map(event => {
        if (!event.joinRequests || !Array.isArray(event.joinRequests)) {
          return null;
        }
        
        const request = event.joinRequests.find(
          r => r.user && r.user._id && r.user._id.toString() === req.user.id
        );
        
        if (!request) return null;
        
        return {
          event: {
            _id: event._id,
            title: event.title,
            startDate: event.startDate,
            location: event.location,
            organizer: event.organizer,
          },
          request,
        };
      })
      .filter(Boolean); // Remove null entries

    console.log("Returning requests:", myRequests.length);
    res.json(myRequests);
  } catch (err) {
    console.error("Get my join requests error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to fetch join requests",
      message: err.message 
    });
  }
});

// GET pending join requests for my events (as organizer)
router.get("/my-events-requests", auth, async (req, res) => {
  try {
    console.log("=== FETCHING EVENT REQUESTS ===");
    console.log("Organizer ID:", req.user.id);
    
    // Find all events organized by this user
    const events = await Event.find({
      organizer: req.user.id,
      "joinRequests.0": { $exists: true } // Has at least one join request
    })
      .populate("joinRequests.user", "username avatar email")
      .lean();

    console.log("Events with join requests:", events.length);

    // Extract pending requests
    const pendingRequests = [];
    
    events.forEach(event => {
      if (!event.joinRequests || !Array.isArray(event.joinRequests)) {
        return;
      }
      
      console.log(`Event "${event.title}" has ${event.joinRequests.length} join requests`);
      
      event.joinRequests.forEach(request => {
        if (!request.user) {
          console.log(`  Skipping request with no user`);
          return;
        }
        
        console.log(`  Request from ${request.user.username || 'unknown'} - status: ${request.status}`);
        
        if (request.status === "pending") {
          pendingRequests.push({
            requestId: request._id,
            event: {
              _id: event._id,
              title: event.title,
              startDate: event.startDate,
              pricing: event.pricing,
            },
            user: request.user,
            transactionCode: request.transactionCode,
            requestedAt: request.requestedAt,
          });
        }
      });
    });

    console.log("Returning pending requests:", pendingRequests.length);
    res.json(pendingRequests);
  } catch (err) {
    console.error("Get events requests error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to fetch event requests",
      message: err.message 
    });
  }
});

// POST leave event
router.post("/:id/leave", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Find participant by string comparison to support ObjectId arrays
    const idx = (event.participants || []).findIndex(
      (p) => String(p?._id || p) === String(req.user.id)
    );
    if (idx === -1) return res.status(400).json({ error: "Not a participant" });

    // Remove participant and update capacity safely
    event.participants.splice(idx, 1);
    if (event.capacity && typeof event.capacity.current === 'number') {
      event.capacity.current = Math.max(0, (event.capacity.current || 0) - 1);
    }

    // Optional: move from waitlist if present (guard undefined)
    if (Array.isArray(event.waitlist) && event.waitlist.length > 0) {
      const nextUser = event.waitlist.shift();
      event.participants.push(nextUser);
      if (event.capacity && typeof event.capacity.current === 'number') {
        event.capacity.current = (event.capacity.current || 0) + 1;
      }
    }

    await event.save();
    await event.populate("participants", "username avatar");
    return res.json(event);
  } catch (err) {
    console.error("Leave event error:", err);
    return res.status(500).json({ error: "Failed to leave event" });
  }
});

// POST /api/events/:id/remove-participant/:userId (organizer only)
router.post("/:id/remove-participant/:userId", auth, async (req, res) => {
  try {
    const organizerId = req.user.id;
    const eventId = req.params.id;
    const participantId = req.params.userId;

    const event = await Event.findById(eventId).populate("participants", "username avatar");
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizer) !== String(organizerId)) {
      return res.status(403).json({ error: "Only organizer can remove participants" });
    }

    const idx = (event.participants || []).findIndex((p) => String(p._id || p) === String(participantId));
    if (idx === -1) return res.status(400).json({ error: "User is not a participant" });

    // Remove from participants
    event.participants.splice(idx, 1);
    if (event.capacity && typeof event.capacity.current === 'number' && event.capacity.current > 0) {
      event.capacity.current = Math.max(0, (event.capacity.current || 0) - 1);
    }

    await event.save();

    // Delete participant's messages in this event room
    const toDelete = await Message.find({ room: event._id, sender: participantId }).select('_id');
    const ids = toDelete.map((m) => String(m._id));
    if (ids.length > 0) {
      await Message.deleteMany({ room: event._id, sender: participantId });
    }

    // Emit socket updates
    const io = req.app.get("io");
    if (io) {
      const removedUser = (event.participants || []).find((p) => String(p._id || p) === String(participantId));
      io.to(String(event._id)).emit("participant_removed", { eventId: String(event._id), userId: String(participantId) });
      if (ids.length > 0) io.to(String(event._id)).emit("messages_bulk_deleted", { ids, by: String(organizerId), userId: String(participantId), reason: 'participant_removed' });
    }

    const populated = await Event.findById(event._id)
      .populate("organizer", "username avatar")
      .populate("participants", "username avatar email");

    res.json({ success: true, event: populated, deletedMessageIds: ids });
  } catch (err) {
    console.error("Remove participant error:", err);
    res.status(500).json({ error: "Failed to remove participant" });
  }
});

export default router;

// DELETE /api/events/:id - delete event (organizer only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizer) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only organizer can delete event" });
    }

    await Event.deleteOne({ _id: event._id });
    const io = req.app.get("io");
    if (io) io.emit("event_deleted", { eventId: String(event._id) });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return res.status(500).json({ error: "Failed to delete event" });
  }
});
