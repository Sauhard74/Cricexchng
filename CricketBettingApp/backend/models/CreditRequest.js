const mongoose = require("mongoose");

const creditRequestSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reason: {
      type: String
    }
  },
  { timestamps: true }
);

const CreditRequest = mongoose.model("CreditRequest", creditRequestSchema);
module.exports = CreditRequest;
