const Code = require("../models/schema/codes");

// Function to store a generated code
exports.storeGeneratedCode = async (req, res) => {
  const {
    code,
    generatedDate,
    generatedTime,
    studentType,
    amountPaid,
    userId,
  } = req.body;

  try {
    // Validate required fields
    if (!code || !generatedDate || !generatedTime || !studentType) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Create a new code document
    const newCode = new Code({
      code,
      generatedDate,
      generatedTime,
      studentType,
      amountPaid: studentType === "online" ? amountPaid : null, // AmountPaid only for online students
      used: false, // Default to unused
      usedDate: null, // Initially null
      usedTime: null, // Initially null
      userId: userId || null, // Optional field
    });

    // Save the code to the database
    const savedCode = await newCode.save();

    res.status(201).json({
      message: "Code generated and stored successfully.",
      codeDetails: savedCode,
    });
  } catch (error) {
    console.error("Error storing generated code:", error);

    // Handle unique code violation
    if (error.code === 11000) {
      return res.status(409).json({ error: "Code already exists. Generate a new code." });
    }

    res.status(500).json({ error: "Internal server error. Please try again later." });
  }
};

// Function to authenticate and mark a code as used
exports.authenticateCode = async (req, res) => {
  const { inputCode } = req.body;

  try {
    // Validate input
    if (!inputCode || typeof inputCode !== "string") {
      return res.status(400).json({ error: "Invalid input code provided." });
    }

    // Get current date and time in UTC
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const formattedTime = now.toISOString().split("T")[1].slice(0, 8); // HH:mm:ss

    // Find and update the code atomically
    const codeDoc = await Code.findOneAndUpdate(
      { code: inputCode, used: false },
      { used: true, usedDate: formattedDate, usedTime: formattedTime },
      { new: true } // Returns the updated document
    );

    if (!codeDoc) {
      return res.status(404).json({ error: "Invalid or already used code." });
    }

    // Respond with success
    res.status(200).json({
      message: "User authenticated successfully",
      code: codeDoc.code,
      usedDate: codeDoc.usedDate,
      usedTime: codeDoc.usedTime,
    });
  } catch (error) {
    console.error("Error authenticating code:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
};


// Function to retrieve all codes
exports.getAllCodes = async (req, res) => {
  try {
    // Fetch all codes from the database
    const codes = await Code.find();

    if (!codes.length) {
      return res.status(404).json({ message: "No codes found." });
    }

    res.status(200).json({
      message: "Codes retrieved successfully.",
      codes,
    });
  } catch (error) {
    console.error("Error fetching codes:", error);
    res.status(500).json({ error: "Internal server error. Please try again later." });
  }
};
