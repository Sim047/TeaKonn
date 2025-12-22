// backend/src/models/Coach.js
import mongoose from "mongoose";

const coachSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sports: [
      {
        type: String,
        required: true,
      },
    ],
    specialties: [String],
    bio: {
      type: String,
      maxlength: 500,
    },
    experience: {
      type: Number, // years
      min: 0,
    },
    certifications: [
      {
        name: String,
        issuer: String,
        year: Number,
      },
    ],
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
    },
    pricing: {
      hourlyRate: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      packageDeals: [
        {
          name: String,
          sessions: Number,
          price: Number,
          description: String,
        },
      ],
    },
    availability: {
      schedule: {
        type: Map,
        of: [String], // e.g., "Monday": ["9:00-12:00", "14:00-18:00"]
      },
      timezone: String,
    },
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
    verified: {
      type: Boolean,
      default: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalClients: {
      type: Number,
      default: 0,
    },
    socialLinks: {
      instagram: String,
      twitter: String,
      linkedin: String,
      website: String,
    },
    gallery: [String], // image URLs
    achievements: [
      {
        title: String,
        description: String,
        date: Date,
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
coachSchema.index({ sports: 1 });
coachSchema.index({ "location.city": 1 });
coachSchema.index({ "rating.average": -1 });
coachSchema.index({ featured: -1, "rating.average": -1 });
coachSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("Coach", coachSchema);
