const express = require("express");
const studentPaymentRouter = express.Router();
const loggedIn = require("../../../middlewares/isLoggedIn");
// controllers
const {
  createStudentPaymentController,
  getAllStudentPaymentsController,
  getStudentPaymentByIdController,
  updateStudentPaymentController,
  deleteStudentPaymentController,
} = require("../../../controllers/academic/schoolFees.controller");

// GET: Fetch all student payment records
studentPaymentRouter
  .route("/student-payments")
  .get(getAllStudentPaymentsController);

// GET, PATCH, DELETE: Manage a single student payment record by ID
studentPaymentRouter
  .route("/student-payments/:id")
  .get(getStudentPaymentByIdController)
  .patch(updateStudentPaymentController)
  .delete(deleteStudentPaymentController);

// POST: Create a new student payment record
studentPaymentRouter
  .route("/create-student-payment")
  .post(createStudentPaymentController);

module.exports = studentPaymentRouter;