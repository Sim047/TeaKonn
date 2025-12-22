// backend/src/routes/coaches.js
import express from "express";
import Coach from "../models/Coach.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET all coaches with filtering and search
router.get("/", auth, async (req, res) => {
  try {
    const {
      search,
      sport,
      city,
      minRate,
      maxRate,
      minRating,
      verified,
      featured,
      sortBy = "rating",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const query = { active: true };

    // Search by name or bio
    if (search) {
      const users = await User.find({
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      query.$or = [
        { userId: { $in: users.map((u) => u._id) } },
        { bio: { $regex: search, $options: "i" } },
        { specialties: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Filter by sport
    if (sport) {
      query.sports = { $in: [sport] };
    }

    // Filter by city
    if (city) {
      query["location.city"] = { $regex: city, $options: "i" };
    }

    // Filter by hourly rate
    if (minRate || maxRate) {
      query["pricing.hourlyRate"] = {};
      if (minRate) query["pricing.hourlyRate"].$gte = Number(minRate);
      if (maxRate) query["pricing.hourlyRate"].$lte = Number(maxRate);
    }

    // Filter by minimum rating
    if (minRating) {
      query["rating.average"] = { $gte: Number(minRating) };
    }

    // Filter by verified status
    if (verified === "true") {
      query.verified = true;
    }

    // Filter by featured
    if (featured === "true") {
      query.featured = true;
    }

    // Sorting
    const sortOptions = {};
    if (sortBy === "rating") {
      sortOptions["rating.average"] = order === "asc" ? 1 : -1;
    } else if (sortBy === "price") {
      sortOptions["pricing.hourlyRate"] = order === "asc" ? 1 : -1;
    } else if (sortBy === "experience") {
      sortOptions.experience = order === "asc" ? 1 : -1;
    } else if (sortBy === "sessions") {
      sortOptions.totalSessions = order === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const coaches = await Coach.find(query)
      .populate("userId", "username email avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Coach.countDocuments(query);

    res.json({
      coaches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Get coaches error:", err);
    res.status(500).json({ error: "Failed to fetch coaches" });
  }
});

// GET single coach by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id)
      .populate("userId", "username email avatar")
      .populate("reviews.userId", "username avatar");

    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    res.json(coach);
  } catch (err) {
    console.error("Get coach error:", err);
    res.status(500).json({ error: "Failed to fetch coach" });
  }
});

// POST create/update coach profile
router.post("/profile", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const coachData = {
      userId,
      ...req.body,
    };

    let coach = await Coach.findOne({ userId });

    if (coach) {
      // Update existing
      Object.assign(coach, coachData);
      await coach.save();
    } else {
      // Create new
      coach = await Coach.create(coachData);
    }

    await coach.populate("userId", "username email avatar");

    res.json(coach);
  } catch (err) {
    console.error("Create/update coach error:", err);
    res.status(500).json({ error: "Failed to save coach profile" });
  }
});

// POST add review to coach
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    // Check if user already reviewed
    const existingReview = coach.reviews.find(
      (r) => r.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ error: "You already reviewed this coach" });
    }

    // Add review
    coach.reviews.push({
      userId: req.user.id,
      rating,
      comment,
    });

    // Recalculate average rating
    const totalRating = coach.reviews.reduce((sum, r) => sum + r.rating, 0);
    coach.rating.average = totalRating / coach.reviews.length;
    coach.rating.count = coach.reviews.length;

    await coach.save();
    await coach.populate("reviews.userId", "username avatar");

    res.json(coach);
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ error: "Failed to add review" });
  }
});

// GET nearby coaches (geospatial)
router.get("/nearby/:lng/:lat", auth, async (req, res) => {
  try {
    const { lng, lat } = req.params;
    const { maxDistance = 50000, limit = 20 } = req.query; // 50km default

    const coaches = await Coach.find({
      active: true,
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(maxDistance),
        },
      },
    })
      .populate("userId", "username email avatar")
      .limit(Number(limit));

    res.json(coaches);
  } catch (err) {
    console.error("Get nearby coaches error:", err);
    res.status(500).json({ error: "Failed to fetch nearby coaches" });
  }
});

export default router;
