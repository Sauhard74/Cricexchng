const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Bet = require("../models/Bet");
const CreditRequest = require("../models/CreditRequest");

const { protect, generateToken , user} = require("../middleware/auth");
require("dotenv").config();
const router = express.Router();

// ✅ Refresh Token
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newToken = generateToken(user._id, user.role);
    const newRefreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ error: "Failed to refresh token" });
  }
});


// ✅ User Registration
router.post("/register", async (req, res) => {
  const { username, phone, password } = req.body;

  console.log("🟡 [DEBUG] Registration Attempt:", req.body);

  try {
    // ✅ Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("❌ [DEBUG] Username already exists");
      return res.status(400).json({ error: "Username already exists" });
    }

    // ✅ Check if phone number already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      console.log("❌ [DEBUG] Phone number already exists");
      return res.status(400).json({ error: "Phone number already exists" });
    }

    // ✅ Hash password and create user
    console.log("🟢 [DEBUG] Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🟢 [DEBUG] Creating user...");
    const newUser = new User({
      username,
      phone,
      password: hashedPassword,
    });

    await newUser.save();
    console.log("✅ [DEBUG] User created successfully");

    res.json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("❌ [ERROR] Registration Failed:", error);
    res.status(500).json({ error: "Registration failed", details: error.message });
  }
});
// ✅ User Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
     // ✅ Debugging: Check the format of incoming data
  console.log("🔍 [DEBUG] Incoming Login Payload:", req.body);
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    // ✅ Include role in the token
    const token = generateToken(user._id, user.role);
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      refreshToken, // ✅ Include refresh token in response
      user: {
        username: user.username,
        role: user.role,
        phone: user.phone,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error("❌ [AUTH ERROR]:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ Get User Profile (Includes Bets & Credits)
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    const bets = await Bet.find({ username: user.username });

    res.json({
      username: user.username,
      phone: user.phone,
      credits: user.credits,
      bets
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// ✅ Logout
router.post("/logout", protect, (req, res) => {
  try {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// ✅ Request Credits (User)
router.post("/request-credits", protect, user, async (req, res) => {
  const { amount } = req.body;

  try {
    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Auto-populate phone number from user profile
    const request = new CreditRequest({
      username: user.username,
      phone: user.phone,
      amount
    });

    await request.save();

    res.json({ message: "Credit request submitted", request });
  } catch (error) {
    console.error("❌ [ROUTE ERROR] Failed to request credits:", error.message);
    res.status(500).json({ error: "Failed to request credits" });
  }
});

// ✅ Get User Credit Requests
router.get("/credit-requests", protect, user, async (req, res) => {
  try {
    const requests = await CreditRequest.find({ username: req.user.username });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to load credit requests" });
  }
});

module.exports = router;
