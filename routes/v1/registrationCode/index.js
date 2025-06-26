const express = require('express');
const router = express.Router();
const registrationCodeController = require('../../../controllers/registrationCode');
// middleware
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");

router.post('/registration-code', isLoggedIn, isAdmin, registrationCodeController.createCode);
router.post('/registration-code/validate', registrationCodeController.validateCode);
router.delete('/registration-code/:id', isLoggedIn, isAdmin, registrationCodeController.deleteCode);
router.get('/registration-code', isLoggedIn, isAdmin, registrationCodeController.getAllCodes);

module.exports = router;