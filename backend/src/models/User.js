// backend/src/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: false,
      default: undefined,
    },

    avatar: {
      type: String,
      default: "",
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    favoriteSports: [
      {
        type: String,
      },
    ],

    role: {
      type: String,
      enum: ["user", "event_creator", "venue_owner"],
      default: "user",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
