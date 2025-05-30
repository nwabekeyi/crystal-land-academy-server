const express = require("express");
const router = express.Router();
const { createStudent } = require("../controller/user"); // Adjust path as necessary

// Route to create a new student
router.post("/students", createStudent);

module.exports = router;
