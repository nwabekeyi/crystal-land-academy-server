const express = require("express");
const {
    storeGeneratedCode,
  authenticateCode,
  getAllCodes,
} = require("../controller/codeController");

const router = express.Router();

router.post("/api/v1/generate-code", storeGeneratedCode);
router.post("/api/v1/authenticate-code", authenticateCode);
router.get("/api/v1/get-all-codes", getAllCodes);

module.exports = router;
