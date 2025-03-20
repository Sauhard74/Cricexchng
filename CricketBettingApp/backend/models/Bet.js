const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  username: { type: String, required: true },
  matchId: { type: String, required: true },

  // ✅ team should be required only if betType = "winner"
  team: {
    type: String,
    required: function() {
      return this.betType === 'winner';
    }
  },

  amount: { type: Number, required: true },

  // ✅ New bet types included
  betType: { type: String, required: true, enum: ["winner", "runs", "wickets"] },

  // ✅ Prediction value for runs or wickets
  predictionValue: {
    type: Number,
    required: function() {
      return this.betType !== 'winner';
    }
  },

  status: { type: String, default: "Pending" }
}, { timestamps: true });

const Bet = mongoose.model("Bet", betSchema);
module.exports = Bet;
