const express = require("express");
const studentPaymentRouter = express.Router();
const loggedIn = require("../../../middlewares/isLoggedIn");
const {
  createStudentPaymentController,
  getAllStudentPaymentsController,
  getStudentPaymentByIdController,
  deleteStudentPaymentController,
} = require("../../../controllers/academic/schoolFees.controller");

// POST: Create a new student payment record
studentPaymentRouter.post("/payment", loggedIn, createStudentPaymentController);

// GET: Fetch all student payment records with pagination
studentPaymentRouter.get("/payment", getAllStudentPaymentsController);

// GET: Fetch a single student payment record by ID
studentPaymentRouter.get("/payment/:id", getStudentPaymentByIdController);

// DELETE: Delete a student payment record by ID
studentPaymentRouter.delete("/payment/:id", loggedIn, deleteStudentPaymentController);

module.exports = studentPaymentRouter;