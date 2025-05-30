const Paystack = require('paystack-node');
const { Student } = require("../models/schema/onlineUsers");
const { Course } = require("../models/schema/courseSchema");
const Payment  = require("../models/schema/paymentSchema");
const { paystackKey } = require('../configs/dotenv'); // Paystack secret key

const environment = process.env.NODE_ENV;
const paystack = new Paystack(paystackKey, environment);

// Initialize Payment
const initializeTransaction = async (req, res) => {
  const { userId, paymentAmount } = req.body;

  try {
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ status: "failed", message: "Student not found" });
    }

    const course = await Course.findOne({ courseName: student.program });
    if (!course) {
      return res.status(404).json({ status: "failed", message: "Course not found" });
    }

    // Ensure the current amount paid is less than the course cost
    if (student.amountPaid >= course.cost) {
      return res.status(200).json({ status: "success", message: "User has already made full payment" });
    }

    // Calculate remaining balance for validation (optional)
    const remainingBalance = course.cost - student.amountPaid;

    // Ensure the payment amount doesn't exceed the remaining balance
    if (paymentAmount > remainingBalance) {
      return res.status(400).json({ status: "failed", message: "Payment amount exceeds remaining balance" });
    }

    // Prepare transaction data
    const transactionData = {
      amount: paymentAmount * 100,  // Convert to Kobo (Naira x 100)
      email: student.email,
      reference: `${userId}-${Date.now()}`,  // Unique transaction reference
    };

    const response = await paystack.initializeTransaction(transactionData);
    const paymentUrl = response.body.data.authorization_url;

    res.status(200).json({
      payment_url: paymentUrl,
      reference: transactionData.reference,
      email: student.email,
      amount: paymentAmount,
      userId,
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    res.status(500).json({ status: "error", message: "Error initializing payment" });
  }
};

// Verify and Process Payment
// Verify and Process Payment
const verifyPayment = async (req, res) => {
  const { ref } = req.params; // Get reference from URL params

  try {
    // Verify the transaction with Paystack
    const response = await paystack.verifyTransaction({ reference: ref }); // Pass the reference as an object
    const output = response.body.data;
    console.log(output);

    const { amount, reference: transactionId } = output;

    // Get the userId from the metadata or session (if available)
    const userId =  output.metadata.userId; // Assuming Paystack passes metadata
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ status: "failed", message: "Student not found" });
    }

    const course = await Course.findOne({ courseName: student.program });
    if (!course) {
      return res.status(404).json({ status: "failed", message: "Course not found" });
    }

    // Convert amount from Kobo to Naira and add to the student's amountPaid
    const paymentAmount = amount / 100; // Amount in Naira

    // Update the student's amountPaid field
    student.amountPaid += paymentAmount; // Add the payment amount to the existing amountPaid

    // If the student has paid in full, update the payment status
    if (student.amountPaid >= course.cost) {
      student.paymentStatus = "completed";
    }

    // Create a new payment entry in the Payment model
    const payment = new Payment({
      userId: userId,
      amount: paymentAmount, // Amount in Naira
      transactionId,
      method: "credit_card", // Adjust based on the payment method
      status: "completed", // Assuming payment was successful
    });

    await payment.save();
    await student.save();

    res.status(200).json({
      status: "success",
      message: "Payment verified and updated successfully",
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while verifying payment",
    });
  }
};


module.exports = { initializeTransaction, verifyPayment };
