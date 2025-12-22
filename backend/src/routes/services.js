// backend/src/routes/services.js
import express from "express";
import Service from "../models/Service.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET all services with filtering (public for discovery)
router.get("/", async (req, res) => {
  try {
    const {
      search,
      sport,
      category,
      city,
      locationType,
      minPrice,
      maxPrice,
      minRating,
      featured,
      active = "true",
      sortBy = "rating",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (active === "true") query.active = true;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Filters
    if (sport) query.sport = sport;
    if (category) query.category = category;
    if (city) query["location.city"] = { $regex: city, $options: "i" };
    if (locationType) query["location.type"] = locationType;
    if (featured === "true") query.featured = true;

    // Price range
    if (minPrice || maxPrice) {
      query["pricing.amount"] = {};
      if (minPrice) query["pricing.amount"].$gte = Number(minPrice);
      if (maxPrice) query["pricing.amount"].$lte = Number(maxPrice);
    }

    // Rating filter
    if (minRating) {
      query["rating.average"] = { $gte: Number(minRating) };
    }

    // Sorting
    const sortOptions = {};
    if (sortBy === "rating") {
      sortOptions["rating.average"] = order === "asc" ? 1 : -1;
    } else if (sortBy === "price") {
      sortOptions["pricing.amount"] = order === "asc" ? 1 : -1;
    } else if (sortBy === "bookings") {
      sortOptions.totalBookings = order === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const services = await Service.find(query)
      .populate("provider", "username email avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(query);

    res.json({
      services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("Get services error:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// GET single service (public for discovery)
router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("provider", "username email avatar")
      .populate("reviews.userId", "username avatar");

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Increment views
    service.views = (service.views || 0) + 1;
    await service.save();

    res.json(service);
  } catch (err) {
    console.error("Get service error:", err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
});

// GET user's created services
router.get("/my/created", auth, async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user.id })
      .populate("provider", "username email avatar")
      .sort({ createdAt: -1 });

    res.json({ services });
  } catch (err) {
    console.error("Get my services error:", err);
    res.status(500).json({ error: "Failed to fetch your services" });
  }
});

// POST create service
router.post("/", auth, async (req, res) => {
  try {
    const serviceData = {
      ...req.body,
      provider: req.user.id,
    };

    const service = await Service.create(serviceData);
    await service.populate("provider", "username email avatar");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("new_service", service);
    }

    res.status(201).json(service);
  } catch (err) {
    console.error("Create service error:", err);
    res.status(500).json({ error: "Failed to create service" });
  }
});

// PUT update service
router.put("/:id", auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Check if user is provider
    if (service.provider.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    Object.assign(service, req.body);
    await service.save();
    await service.populate("provider", "username email avatar");

    res.json(service);
  } catch (err) {
    console.error("Update service error:", err);
    res.status(500).json({ error: "Failed to update service" });
  }
});

// DELETE service
router.delete("/:id", auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.provider.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await service.deleteOne();

    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Delete service error:", err);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// POST add review
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Check if user already reviewed
    const existingReview = service.reviews.find(
      (r) => r.userId.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ error: "You already reviewed this service" });
    }

    service.reviews.push({
      userId: req.user.id,
      rating,
      comment,
    });

    // Recalculate average
    const totalRating = service.reviews.reduce((sum, r) => sum + r.rating, 0);
    service.rating.average = totalRating / service.reviews.length;
    service.rating.count = service.reviews.length;

    await service.save();
    await service.populate("reviews.userId", "username avatar");

    res.json(service);
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ error: "Failed to add review" });
  }
});

// Like/Unlike service
router.post("/:id/like", auth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const likeIndex = service.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Unlike
      service.likes.splice(likeIndex, 1);
    } else {
      // Like
      service.likes.push(req.user.id);
    }

    await service.save();
    res.json({ likes: service.likes.length, liked: likeIndex === -1 });
  } catch (err) {
    console.error("Like service error:", err);
    res.status(500).json({ error: "Failed to like service" });
  }
});

export default router;
