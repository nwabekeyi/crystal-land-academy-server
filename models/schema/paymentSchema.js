const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "Student", required: true }, // Reference to the User model
    amount: { type: Number, required: true, min: 0 }, // Payment amount, with a minimum value
    method: {
      type: String,
      enum: ["credit_card", "debit_card", "paypal", "bank_transfer", "others"],
    }, // Payment method
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "in_review"],
      default: "pending",
    }, // Payment status
    transactionId: { type: String, unique: true, required: true }, // Unique transaction ID
    timestamp: { type: Date, default: Date.now }, // Time of the payment
  },
  { timestamps: true }
);

// Indexes for optimized queries
paymentSchema.index({ userId: 1 }); // Index for userId queries
paymentSchema.index({ transactionId: 1 }, { unique: true }); // Unique index for transactionId

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
