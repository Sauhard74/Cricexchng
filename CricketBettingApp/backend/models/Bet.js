const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  username: { type: String, required: true },
  matchId: { type: String, required: true },

  // ✅ Required only for winner, back, and lay
  team: {
    type: String,
    required: function() {
      return this.betType === 'winner' || this.betType === 'back' || this.betType === 'lay';
    }
  },

  amount: { type: Number, required: true },

  // ✅ Now supports back and lay
  betType: { 
    type: String, 
    required: true, 
    enum: ["winner", "runs", "wickets", "back", "lay"] 
  },

  // ✅ Prediction value for runs/wickets
  predictionValue: {
    type: Number,
    required: function() {
      return this.betType !== 'winner' && this.betType !== 'back' && this.betType !== 'lay';
    }
  },

  // ✅ Odds for back and lay bets
  odds: { 
    type: Number, 
    required: function() {
      return this.betType === 'back' || this.betType === 'lay';
    } 
  },

  // ✅ Liability for lay bets only
  liability: { 
    type: Number, 
    required: function() {
      return this.betType === 'lay';
    } 
  },

  status: { type: String, default: "Pending" }
}, { timestamps: true });

const Bet = mongoose.model("Bet", betSchema);
module.exports = Bet;
