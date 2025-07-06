const express = require('express');
const router = express.Router();
const expenditureController = require('../../../controllers/financials/expenditure.controller');
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require('../../../middlewares/isLoggedIn');

router.post('/expenditure', isLoggedIn, isAdmin, expenditureController.createExpenditureController);
router.get('/expenditure', isLoggedIn, isAdmin, expenditureController.getExpendituresController);
router.put('/expenditure/:id', isLoggedIn, isAdmin, expenditureController.updateExpenditureController);
router.delete('/expenditure/:id', isLoggedIn, isAdmin, expenditureController.deleteExpenditureController);
router.get('/expenditure/:id', isLoggedIn, isAdmin, expenditureController.getExpenditureByIdController);

module.exports = router;