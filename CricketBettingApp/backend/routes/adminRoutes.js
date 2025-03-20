const express = require("express");
const Match = require("../models/Match");
const Bet = require("../models/Bet");
const CreditRequest = require("../models/CreditRequest");
const User = require("../models/User");
const { protect, admin } = require("../middleware/auth");
const router = express.Router();


// ✅ Get All Users (Admin Only)
router.get("/users", protect, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ✅ Get All Bets (Admin Only)
router.get("/bets", protect, admin, async (req, res) => {
  try {
    const bets = await Bet.find();
    res.json(bets);
  } catch (error) {
    console.error("❌ [ROUTE ERROR] Failed to fetch bets:", error.message);
    res.status(500).json({ error: "Failed to retrieve bets" });
  }
});

// ✅ Add Credits to User (Admin Only)
router.post("/credits", protect, admin, async (req, res) => {
  const { username, amount } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.credits += amount;
    await user.save();

    res.json({ message: `Added ${amount} credits to ${username}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to update credits" });
  }
});

// ✅ Update Match Result (Admin Only)
router.post("/update-result", async (req, res) => {
    const { matchId, winner } = req.body;

    let match = await Match.findOne({ matchId });
    if (!match) return res.status(404).json({ error: "Match not found" });

    match.status = "completed";
    match.winner = winner;
    await match.save();

    const winningBets = await Bet.find({ matchId, team: winner });
    winningBets.forEach(async (bet) => {
        let user = await User.findOne({ username: bet.username });
        user.credits += bet.amount * 2;  // Double the bet amount if won
        await user.save();
    });

    res.json({ message: "Match updated & winners credited!" });
});

// ✅ Get All Credit Requests (Admin)
router.get("/credit-requests", protect, admin, async (req, res) => {
  try {
    const requests = await CreditRequest.find();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to load credit requests" });
  }
});

// ✅ Approve or Reject Credit Request
router.post("/credit-requests/:id", protect, admin, async (req, res) => {
  const { status, reason } = req.body;

  try {
    const request = await CreditRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (status === "approved") {
      const user = await User.findOne({ username: request.username });
      if (user) {
        user.credits += request.amount;
        await user.save();
      }
    }

    request.status = status;
    if (status === "rejected") {
      request.reason = reason || "No reason provided";
    }
    await request.save();

    res.json({ message: `Credit request ${status}`, request });
  } catch (error) {
    res.status(500).json({ error: "Failed to update credit request" });
  }
});

module.exports = router;
