const express = require('express');
const router = express.Router();
const PinController = require('../../../controllers/Pin');
const isAdmin = require("../../../middlewares/isAdmin");

router.post('/generate-pin', isAdmin, PinController.generatePin);
router.post('/verify-pin', PinController.verifyPin);

module.exports = router;