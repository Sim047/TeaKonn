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
    const { name, location, city, capacityMin, capacityMax } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const q = { available: true };
    if (name) q.name = { $regex: String(name), $options: "i" };
    const cityValue = city || (typeof location === "string" ? location : undefined);
    if (cityValue) q["location.city"] = { $regex: String(cityValue), $options: "i" };
    const minCap = capacityMin ? Number(capacityMin) : undefined;
    const maxCap = capacityMax ? Number(capacityMax) : undefined;
    if (minCap !== undefined || maxCap !== undefined) {
      q["capacity.max"] = {};
      if (minCap !== undefined) q["capacity.max"].$gte = minCap;
      if (maxCap !== undefined) q["capacity.max"].$lte = maxCap;
    }

    const [venues, total] = await Promise.all([
      Venue.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Venue.countDocuments(q),
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
