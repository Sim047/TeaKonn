import mongoose from "mongoose";

const Schema = mongoose.Schema;

const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const CapacitySchema = new Schema(
  {
    max: { type: Number, required: true },
  },
  { _id: false }
);

const VenueSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    location: { type: LocationSchema, required: true },
    capacity: { type: CapacitySchema, required: true },
    description: { type: String, default: "" },
    images: [{ type: String }],
    status: { type: String, enum: ["available", "booked"], default: "available" },
    available: { type: Boolean, default: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

VenueSchema.index({ name: 1 });
VenueSchema.index({ "location.city": 1 });
VenueSchema.index({ owner: 1 });

export default mongoose.model("Venue", VenueSchema);
