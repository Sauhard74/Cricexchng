const express = require("express");
const Match = require("../models/Match");
const Bet = require("../models/Bet");
const CreditRequest = require("../models/CreditRequest");
const User = require("../models/User");
const { protect, admin } = require("../middleware/auth");
const mongoose = require("mongoose");
const router = express.Router();

/**
 * Utility function to update user credits
 * @param {string} username - Username to update
 * @param {number} amount - Amount to add (positive) or subtract (negative)
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise<Object>} - Object with success flag and user data
 */
async function updateUserCredits(username, amount, operation) {
  try {
    // Ensure amount is a number
    const changeAmount = parseInt(amount);
    if (isNaN(changeAmount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error(`User ${username} not found`);
    }
    
    // Ensure current credits is a number
    const currentCredits = parseInt(user.credits || 0);
    
    // Update credits
    user.credits = currentCredits + changeAmount;
    
    console.log(`[CREDITS] ${operation} for ${username}: ${currentCredits} → ${user.credits} (${changeAmount >= 0 ? '+' : ''}${changeAmount})`);
    
    // Save changes
    await user.save();
    
    // Verify update
    const updatedUser = await User.findOne({ username });
    const expectedCredits = currentCredits + changeAmount;
    
    if (updatedUser.credits !== expectedCredits) {
      console.error(`[CREDITS] WARNING: Credit update mismatch for ${username}! Expected ${expectedCredits} but got ${updatedUser.credits}`);
    }
    
    return {
      success: true,
      previousCredits: currentCredits,
      changeAmount: changeAmount,
      newCredits: updatedUser.credits,
      user: updatedUser
    };
  } catch (error) {
    console.error(`[CREDITS] Error updating credits for ${username}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

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

  if (!username || !amount) {
    return res.status(400).json({ error: "Username and amount are required" });
  }

  try {
    // Use the utility function
    const result = await updateUserCredits(username, amount, "Admin credit addition");
    
    if (result.success) {
      res.json({ 
        message: `Added ${amount} credits to ${username}`,
        previousCredits: result.previousCredits,
        newCredits: result.newCredits
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error("Failed to update credits:", error);
    res.status(500).json({ error: "Failed to update credits" });
  }
});

// ✅ Update Match Result (Admin Only)
router.post("/update-result", async (req, res) => {
    const { matchId, winner } = req.body;

    try {
        let match = await Match.findOne({ matchId });
        if (!match) return res.status(404).json({ error: "Match not found" });

        match.status = "completed";
        match.winner = winner;
        await match.save();

        console.log(`[MATCH] Updated match ${matchId} with winner: ${winner}`);

        // Find all winning bets - using case-insensitive comparison
        const winningBets = await Bet.find({ 
            matchId, 
            team: winner,
            status: { $regex: new RegExp("^pending$", "i") } // Case-insensitive 'pending'
        });
        console.log(`[MATCH] Found ${winningBets.length} winning bets for match ${matchId}`);

        // Process each winning bet
        for (const bet of winningBets) {
            try {
                const winAmount = parseInt(bet.amount) * 2;  // Double the bet amount if won
                
                // Use the utility function to add winnings
                const creditResult = await updateUserCredits(
                    bet.username, 
                    winAmount, 
                    `Match win: ${matchId}`
                );
                
                if (creditResult.success) {
                    // Update bet status
                    await Bet.findByIdAndUpdate(bet._id, { status: "won" });
                    console.log(`[MATCH] Bet ${bet._id} marked as won`);
                } else {
                    console.error(`[MATCH] Failed to add winnings for ${bet.username}: ${creditResult.error}`);
                }
            } catch (err) {
                console.error(`[MATCH] Error processing winning bet for ${bet.username}:`, err);
            }
        }

        // Update losing bets - using case-insensitive comparison
        await Bet.updateMany(
            { 
                matchId, 
                team: { $ne: winner }, 
                status: { $regex: new RegExp("^pending$", "i") } // Case-insensitive 'pending'
            },
            { status: "lost" }
        );

        res.json({ message: "Match updated & winners credited!" });
    } catch (error) {
        console.error("[MATCH] Error updating match result:", error);
        res.status(500).json({ error: "Failed to update match result" });
    }
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
    // Validate status
    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const request = await CreditRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Make sure the request is still pending
    if (request.status !== "pending") {
      return res.status(400).json({ 
        error: `Cannot ${status} request that is already ${request.status}` 
      });
    }

    let creditResult = null;
    if (status === "approved") {
      // Validate the amount
      const creditAmount = parseInt(request.amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ error: "Invalid credit amount" });
      }

      // Use the utility function to add credits
      creditResult = await updateUserCredits(
        request.username, 
        creditAmount, 
        "Credit request approval"
      );
      
      if (!creditResult.success) {
        return res.status(400).json({ error: creditResult.error });
      }
    }

    // Delete the request after processing
    await CreditRequest.findByIdAndDelete(req.params.id);

    // Return appropriate response
    if (status === "approved" && creditResult) {
      res.json({ 
        message: `Credit request ${status}`, 
        request: { ...request.toObject(), status },
        previousCredits: creditResult.previousCredits,
        creditAmount: creditResult.changeAmount,
        newCredits: creditResult.newCredits
      });
    } else {
      res.json({ 
        message: `Credit request ${status}`, 
        request: { ...request.toObject(), status } 
      });
    }
  } catch (error) {
    console.error("Error processing credit request:", error);
    res.status(500).json({ error: "Failed to update credit request" });
  }
});

// ✅ Debug route to check user credits
router.get("/user-credits/:username", protect, admin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ 
      username: user.username, 
      credits: user.credits,
      _id: user._id
    });
  } catch (error) {
    console.error("Error fetching user credits:", error);
    res.status(500).json({ error: "Failed to fetch user credits" });
  }
});

// ✅ Delete Bet and Refund Credits
router.delete("/bets/:id", protect, admin, async (req, res) => {
  try {
    console.log(`[BET CANCEL] Starting cancellation for bet ID: ${req.params.id}`);
    
    // First, find the bet
    const bet = await Bet.findById(req.params.id);
    if (!bet) {
      console.log(`[BET CANCEL] Bet not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: "Bet not found" });
    }
    
    console.log(`[BET CANCEL] Found bet: ${bet._id}, status: "${bet.status}", amount: ${bet.amount}, user: ${bet.username}`);
    console.log(`[BET CANCEL] Bet status type: ${typeof bet.status}, Is pending? ${bet.status === "pending"}`);
    console.log(`[BET CANCEL] Full bet object:`, JSON.stringify(bet, null, 2));

    let refunded = false;
    let creditResult = null;

    // Only refund if bet is still pending
    if (bet.status.toLowerCase() === "pending") {
      console.log(`[BET CANCEL] Bet is pending, proceeding with refund`);
      
      // Validate the amount
      const refundAmount = parseInt(bet.amount);
      if (isNaN(refundAmount) || refundAmount <= 0) {
        return res.status(400).json({ error: "Invalid bet amount for refund" });
      }
      
      // Use the utility function to update credits
      creditResult = await updateUserCredits(
        bet.username, 
        refundAmount, 
        "Bet refund"
      );
      
      refunded = creditResult.success;
      
      if (!refunded) {
        console.error(`[BET CANCEL] Failed to refund credits: ${creditResult.error}`);
      }
    } else {
      console.log(`[BET CANCEL] Bet status is "${bet.status}", not "pending", no refund needed`);
    }

    // Delete the bet regardless of refund result
    await Bet.findByIdAndDelete(req.params.id);
    console.log(`[BET CANCEL] Bet deleted from database`);
    
    // Return appropriate response
    if (refunded) {
      res.json({ 
        message: "Bet cancelled and credits refunded",
        refunded: true,
        previousCredits: creditResult.previousCredits,
        refundAmount: creditResult.changeAmount,
        newCredits: creditResult.newCredits
      });
    } else if (creditResult && creditResult.error) {
      res.json({
        message: "Bet cancelled but refund failed",
        refunded: false,
        error: creditResult.error
      });
    } else {
      res.json({ 
        message: "Bet cancelled without refund",
        refunded: false
      });
    }
  } catch (error) {
    console.error("[BET CANCEL] Error cancelling bet:", error);
    res.status(500).json({ error: "Failed to cancel bet: " + error.message });
  }
});

// ✅ Direct credits adjustment (for debugging)
router.post("/debug/add-credits", protect, admin, async (req, res) => {
  const { username, amount } = req.body;
  
  if (!username || !amount) {
    return res.status(400).json({ error: "Username and amount are required" });
  }
  
  const creditAmount = parseInt(amount);
  if (isNaN(creditAmount)) {
    return res.status(400).json({ error: "Amount must be a number" });
  }
  
  try {
    // Use the utility function
    const result = await updateUserCredits(username, creditAmount, "Debug credit addition");
    
    if (result.success) {
      res.json({
        message: `Added ${creditAmount} credits to ${username}`,
        previousCredits: result.previousCredits,
        newCredits: result.newCredits
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error("[DEBUG] Error adding credits:", error);
    res.status(500).json({ error: "Failed to add credits" });
  }
});

// ✅ Verify user credits directly from MongoDB
router.get("/verify-credits/:username", protect, admin, async (req, res) => {
  try {
    // Direct MongoDB query to get raw user data
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get same user through Mongoose for comparison
    const mongooseUser = await User.findOne({ username: req.params.username });
    
    res.json({
      username: req.params.username,
      rawCredits: user.credits,
      rawCreditsType: typeof user.credits,
      modelCredits: mongooseUser.credits,
      modelCreditsType: typeof mongooseUser.credits,
      match: user.credits === mongooseUser.credits
    });
  } catch (error) {
    console.error("Error verifying credits:", error);
    res.status(500).json({ error: "Failed to verify credits" });
  }
});

// ✅ Force cancel bet with refund (admin debug tool)
router.post("/bets/force-cancel/:id", protect, admin, async (req, res) => {
  try {
    console.log(`[FORCE CANCEL] Starting force cancellation for bet ID: ${req.params.id}`);
    
    // Find the bet
    const bet = await Bet.findById(req.params.id);
    if (!bet) {
      console.log(`[FORCE CANCEL] Bet not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: "Bet not found" });
    }
    
    console.log(`[FORCE CANCEL] Found bet: ${bet._id}, status: "${bet.status}", amount: ${bet.amount}, user: ${bet.username}`);

    // Validate the amount
    const refundAmount = parseInt(bet.amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ error: "Invalid bet amount for refund" });
    }
    
    // Force refund regardless of status
    const creditResult = await updateUserCredits(
      bet.username, 
      refundAmount, 
      "Force bet refund"
    );
    
    if (!creditResult.success) {
      console.error(`[FORCE CANCEL] Failed to refund credits: ${creditResult.error}`);
      return res.status(500).json({ error: creditResult.error });
    }
    
    // Delete the bet
    await Bet.findByIdAndDelete(req.params.id);
    console.log(`[FORCE CANCEL] Bet deleted from database`);
    
    // Return success response
    res.json({ 
      message: "Bet force cancelled and credits refunded",
      refunded: true,
      previousCredits: creditResult.previousCredits,
      refundAmount: creditResult.changeAmount,
      newCredits: creditResult.newCredits
    });
  } catch (error) {
    console.error("[FORCE CANCEL] Error force-cancelling bet:", error);
    res.status(500).json({ error: "Failed to force-cancel bet: " + error.message });
  }
});

module.exports = router;

