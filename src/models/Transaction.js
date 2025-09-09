const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Order",
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number, // Store in kobo for accuracy
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    gatewayResponse: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    metadata: {
      type: Object, // store anything extra (like product info)
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
