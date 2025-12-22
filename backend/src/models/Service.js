// backend/src/models/Service.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "personal-training",
        "group-classes",
        "nutrition",
        "physiotherapy",
        "sports-massage",
        "mental-coaching",
        "technique-analysis",
        "custom-program",
        "online-coaching",
        "other",
      ],
    },
    sport: {
      type: String,
      required: true,
    },
    pricing: {
      type: {
        type: String,
        enum: ["per-session", "per-hour", "package", "monthly", "custom"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      packages: [
        {
          name: String,
          sessions: Number,
          price: Number,
          validityDays: Number,
          description: String,
        },
      ],
    },
    paymentInstructions: {
      type: String,
    },
    duration: {
      value: Number, // e.g., 60
      unit: {
        type: String,
        enum: ["minutes", "hours", "days", "weeks"],
        default: "minutes",
      },
    },
    location: {
      type: {
        type: String,
        enum: ["in-person", "online", "hybrid"],
        default: "in-person",
      },
      address: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
    },
    availability: {
      schedule: {
        type: Map,
        of: [String], // e.g., "Monday": ["9:00-12:00", "14:00-18:00"]
      },
      timezone: String,
    },
    requirements: [String],
    included: [String], // What's included in the service
    maxParticipants: {
      type: Number,
      default: 1, // 1 for personal training, more for group classes
    },
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"],
      default: "all",
    },
    images: [String],
    video: String, // promo video URL
    tags: [String],
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalBookings: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

// Indexes
serviceSchema.index({ category: 1, sport: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ "location.city": 1 });
serviceSchema.index({ "rating.average": -1 });
serviceSchema.index({ featured: -1, "rating.average": -1 });
serviceSchema.index({ active: 1, featured: -1 });
serviceSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("Service", serviceSchema);
