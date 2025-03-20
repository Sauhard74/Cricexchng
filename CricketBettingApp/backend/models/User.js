const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true, // ✅ Ensure username is unique
    },
    phone: {
      type: String,
      required: true,
      unique: true, // ✅ Ensure phone is unique
    },
    password: {
      type: String,
      required: true,
    },
    credits: {
      type: Number,
      default: 1000,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  refreshToken: {
  type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
