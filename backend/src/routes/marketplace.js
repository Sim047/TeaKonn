// backend/src/routes/marketplace.js
import express from "express";
import Marketplace from "../models/Marketplace.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get all marketplace items with filters (public route for discovery)
router.get("/", async (req, res) => {
  try {
    const { category, condition, status, search, minPrice, maxPrice, location } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (status) query.status = status;
    else query.status = "active"; // Default to active items
    if (location) query.location = new RegExp(location, "i");
    
    if (search) {
      // Use regex search instead of text index to avoid index errors
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const items = await Marketplace.find(query)
      .populate("seller", "username avatar email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Marketplace.countDocuments(query);

    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (err) {
    console.error("Get marketplace items error:", err);
    res.status(500).json({ error: "Failed to fetch marketplace items" });
  }
});

// Get single marketplace item (public)
router.get("/:id", async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id)
      .populate("seller", "username avatar email");

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Increment views
    item.views += 1;
    await item.save();

    res.json(item);
  } catch (err) {
    console.error("Get marketplace item error:", err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// Get user's listings
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const items = await Marketplace.find({ seller: req.params.userId })
      .populate("seller", "username avatar email")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error("Get user listings error:", err);
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

// Create marketplace item
router.post("/", auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      price,
      condition,
      images,
      location,
      shippingAvailable,
      shippingCost,
      quantity,
      brand,
      size,
      color,
      tags,
      contactPreference
    } = req.body;

    const item = new Marketplace({
      seller: req.user.id,
      title,
      description,
      category,
      price,
      condition,
      images: images || [],
      location,
      shippingAvailable: shippingAvailable || false,
      shippingCost: shippingCost || 0,
      quantity: quantity || 1,
      brand,
      size,
      color,
      tags: tags || [],
      contactPreference: contactPreference || "message",
      status: "active"
    });

    await item.save();
    await item.populate("seller", "username avatar email");

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("new_marketplace_item", item);
    }

    res.status(201).json(item);
  } catch (err) {
    console.error("Create marketplace item error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// Update marketplace item
router.put("/:id", auth, async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if user is the seller
    if (item.seller.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const {
      title,
      description,
      category,
      price,
      condition,
      images,
      location,
      shippingAvailable,
      shippingCost,
      quantity,
      brand,
      size,
      color,
      tags,
      status,
      contactPreference
    } = req.body;

    if (title) item.title = title;
    if (description) item.description = description;
    if (category) item.category = category;
    if (price !== undefined) item.price = price;
    if (condition) item.condition = condition;
    if (images) item.images = images;
    if (location) item.location = location;
    if (shippingAvailable !== undefined) item.shippingAvailable = shippingAvailable;
    if (shippingCost !== undefined) item.shippingCost = shippingCost;
    if (quantity !== undefined) item.quantity = quantity;
    if (brand) item.brand = brand;
    if (size) item.size = size;
    if (color) item.color = color;
    if (tags) item.tags = tags;
    if (status) item.status = status;
    if (contactPreference) item.contactPreference = contactPreference;

    await item.save();
    await item.populate("seller", "username avatar email");

    res.json(item);
  } catch (err) {
    console.error("Update marketplace item error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete marketplace item
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if user is the seller
    if (item.seller.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await item.deleteOne();

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Delete marketplace item error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Like/Unlike marketplace item
router.post("/:id/like", auth, async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const userId = req.user.id;
    const likeIndex = item.likes.indexOf(userId);

    if (likeIndex === -1) {
      item.likes.push(userId);
    } else {
      item.likes.splice(likeIndex, 1);
    }

    await item.save();
    await item.populate("seller", "username avatar email");

    res.json(item);
  } catch (err) {
    console.error("Like marketplace item error:", err);
    res.status(500).json({ error: "Failed to like item" });
  }
});

export default router;
