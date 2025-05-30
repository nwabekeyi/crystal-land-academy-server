const Payment = require("../models/schema/paymentSchema");
const { Student } = require("../models/schema/onlineUsers");

// Fetch all receipts for a specific user
const getAllReceiptsForUser = async (req, res) => {
  const { userId } = req.params; // Extract userId from request params
  console.log(userId)
  try {
    // Fetch all payments for the given userId
    const payments = await Payment.find({ userId });

    // Check if any payments exist for the user
    if (!payments || payments.length === 0) {
      return res
        .status(404)
        .json({ message: "No receipts found for the provided user ID" });
    }

    // Find the user details in the Student collection
    const user = await Student.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Map over the payments to create an array of receipts
    const receipts = payments.map((payment) => ({
      paymentDetails: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        timestamp: payment.timestamp,
      },
      userDetails: {
        firstName: user.firstName,
        lastName: user.lastName,
        program: user.program,
      },
    }));

    // Send all receipts as response
    return res
      .status(200)
      .json({ message: "Receipts fetched successfully", receipts });
  } catch (error) {
    // Handle any errors
    return res
      .status(500)
      .json({ message: "Error retrieving receipts", error: error.message });
  }
};

// Existing function to send a specific receipt
const paymentReceipt = async (req, res) => {
  const { userId, paymentId } = req.params; // Extract userId and paymentId from request params

  try {
    // Find the payment using paymentId
    const payment = await Payment.findById(paymentId);

    // Check if payment exists
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Verify if the payment is linked to the provided userId
    if (payment.userId.toString() !== userId) {
      return res
        .status(400)
        .json({ message: "User ID does not match with the payment record" });
    }

    // Find the user in the Student collection using userId
    const user = await Student.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Construct the receipt data
    const receipt = {
      paymentDetails: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        timestamp: payment.timestamp,
      },
      userDetails: {
        firstName: user.firstName,
        lastName: user.lastName,
        program: user.program,
      },
    };

    // Send receipt as response
    return res
      .status(200)
      .json({ message: "Receipt sent successfully", receipt });
  } catch (error) {
    // Handle any errors
    return res
      .status(500)
      .json({ message: "Error retrieving receipt", error: error.message });
  }
};

module.exports = { paymentReceipt, getAllReceiptsForUser };
