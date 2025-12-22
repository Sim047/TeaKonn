// backend/src/models/Marketplace.js - Marketplace Items Model
import mongoose from "mongoose";

const MarketplaceSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      required: true,
      enum: [
        "Sports Equipment",
        "Apparel & Clothing",
        "Footwear",
        "Accessories",
        "Supplements & Nutrition",
        "Fitness Tech & Wearables",
        "Training Gear",
        "Recovery & Wellness",
        "Team Sports Gear",
        "Individual Sports Gear",
        "Outdoor & Adventure",
        "Other"
      ]
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    condition: {
      type: String,
      enum: ["New", "Like New", "Good", "Fair", "For Parts"],
      required: true
    },
    images: [{ type: String }],
    location: { type: String, required: true },
    shippingAvailable: { type: Boolean, default: false },
    shippingCost: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 0 },
    brand: { type: String },
    size: { type: String },
    color: { type: String },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "sold", "reserved", "inactive"],
      default: "active"
    },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    contactPreference: {
      type: String,
      enum: ["message", "email", "phone"],
      default: "message"
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
MarketplaceSchema.index({ seller: 1, createdAt: -1 });
MarketplaceSchema.index({ category: 1, status: 1 });
MarketplaceSchema.index({ status: 1, createdAt: -1 });
MarketplaceSchema.index({ location: 1 });
MarketplaceSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("Marketplace", MarketplaceSchema);
