import express from "express";
import auth from "../middleware/auth.js";
import Venue from "../models/Venue.js";

const router = express.Router();

// Temporarily allow any authenticated user to manage venues
function ensureVenueOwner(req, res, next) {
  next();
}

// POST /api/venues/create
router.post("/create", auth, ensureVenueOwner, async (req, res) => {
  try {
    const { name, location, capacity, description, images } = req.body || {};
    if (!name || !location || !capacity?.max) {
      return res.status(400).json({ error: "name, location, and capacity.max are required" });
    }
    const venue = await Venue.create({
      owner: req.user.id,
      name,
      location: {
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        coordinates: location.coordinates,
      },
      capacity: { max: Number(capacity.max) },
      description: description || "",
      images: Array.isArray(images) ? images.slice(0, 10) : [],
    });
    res.status(201).json(venue);
  } catch (err) {
    console.error("Create venue error:", err);
    res.status(500).json({ error: "Failed to create venue" });
  }
});

// GET /api/venues/search?name=&city=&capacityMin=&capacityMax=&page=&limit=
router.get("/search", async (req, res) => {
  try {
    const { name, location, city, capacityMin, capacityMax, status, onlyAvailable, q } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = {};
    if (String(onlyAvailable).toLowerCase() === 'true') {
      query.available = true;
    }
    if (status) {
      query.status = String(status);
    }
    if (name) query.name = { $regex: String(name), $options: "i" };
    const cityValue = city || (typeof location === "string" ? location : undefined);
    if (cityValue) query["location.city"] = { $regex: String(cityValue), $options: "i" };
    const minCap = capacityMin ? Number(capacityMin) : undefined;
    const maxCap = capacityMax ? Number(capacityMax) : undefined;
    if (minCap !== undefined || maxCap !== undefined) {
      query["capacity.max"] = {};
      if (minCap !== undefined) query["capacity.max"].$gte = minCap;
      if (maxCap !== undefined) query["capacity.max"].$lte = maxCap;
    }
    // Deep text search across multiple fields if q is provided
    if (q && String(q).trim()) {
      const term = String(q).trim();
      const regex = { $regex: term, $options: 'i' };
      // Combine with existing filters using $and
      const andParts = [query];
      andParts.push({ $or: [
        { name: regex },
        { description: regex },
        { 'location.name': regex },
        { 'location.address': regex },
        { 'location.city': regex },
        { 'location.state': regex },
        { 'location.country': regex },
      ]});
      // Replace query with $and
      // If query was empty object initially, $and with {} is fine
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      query.$and = andParts.filter(Boolean);
      // Remove top-level fields already merged in $and to avoid conflicts
      for (const k of Object.keys(query)) {
        if (k !== '$and') delete query[k];
      }
    }

    const [venues, total] = await Promise.all([
      Venue.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'username avatar'),
      Venue.countDocuments(query),
    ]);

    res.json({ venues, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error("Search venues error:", err);
    res.status(500).json({ error: "Failed to search venues" });
  }
});

export default router;
// Additional: list my venues
router.get('/my', auth, ensureVenueOwner, async (req, res) => {
  try {
    const list = await Venue.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ venues: list });
  } catch (err) {
    console.error('List my venues error:', err);
    res.status(500).json({ error: 'Failed to fetch my venues' });
  }
});

// PUT /api/venues/:id - update venue (owner only)
router.put('/:id', auth, ensureVenueOwner, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (String(venue.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only owner can update venue' });
    }

    const allowed = ['name','location','capacity','description','images','status','available'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'location' && typeof req.body.location === 'object') {
          venue.location = venue.location || {};
          const loc = req.body.location;
          if (loc.name !== undefined) venue.location.name = loc.name;
          if (loc.address !== undefined) venue.location.address = loc.address;
          if (loc.city !== undefined) venue.location.city = loc.city;
          if (loc.state !== undefined) venue.location.state = loc.state;
          if (loc.country !== undefined) venue.location.country = loc.country;
          if (loc.coordinates && typeof loc.coordinates === 'object') {
            venue.location.coordinates = venue.location.coordinates || {};
            if (loc.coordinates.lat !== undefined) venue.location.coordinates.lat = Number(loc.coordinates.lat);
            if (loc.coordinates.lng !== undefined) venue.location.coordinates.lng = Number(loc.coordinates.lng);
          }
        } else if (key === 'capacity' && typeof req.body.capacity === 'object') {
          venue.capacity = venue.capacity || {};
          if (req.body.capacity.max !== undefined) venue.capacity.max = Number(req.body.capacity.max);
        } else {
          venue[key] = req.body[key];
        }
      }
    }

    await venue.save();
    res.json(venue);
  } catch (err) {
    console.error('Update venue error:', err);
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// DELETE /api/venues/:id - delete venue (owner only)
router.delete('/:id', auth, ensureVenueOwner, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (String(venue.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only owner can delete venue' });
    }

    await Venue.deleteOne({ _id: venue._id });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete venue error:', err);
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

// POST /api/venues/:id/unlock - owner can reset venue to available
router.post('/:id/unlock', auth, ensureVenueOwner, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (String(venue.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only owner can unlock venue' });
    }
    venue.status = 'available';
    venue.available = true;
    await venue.save();
    res.json({ success: true, venue });
  } catch (err) {
    console.error('Unlock venue error:', err);
    res.status(500).json({ error: 'Failed to unlock venue' });
  }
});

// POST /api/venues/unlock-all - owner can reset all their venues to available
router.post('/unlock-all', auth, ensureVenueOwner, async (req, res) => {
  try {
    const result = await Venue.updateMany(
      { owner: req.user.id },
      { $set: { status: 'available', available: true } }
    );
    res.json({ success: true, updatedCount: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (err) {
    console.error('Unlock all venues error:', err);
    res.status(500).json({ error: 'Failed to unlock all venues' });
  }
});
