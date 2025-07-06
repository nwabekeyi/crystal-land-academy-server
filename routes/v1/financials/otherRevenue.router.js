const express = require('express');
const router = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const otherRevenueController = require('../../../controllers/financials/otherRevenue.controller');

router.post('/other-revenue/', isLoggedIn, isAdmin, otherRevenueController.createOtherRevenueController);
router.get('/other-revenue', isLoggedIn, isAdmin, otherRevenueController.getOtherRevenuesController);
router.put('/other-revenue/:id', isLoggedIn, isAdmin, otherRevenueController.updateOtherRevenueController);
router.delete('/other-revenue/:id', isLoggedIn, isAdmin, otherRevenueController.deleteOtherRevenueController);
router.get('/other-revenue/:id', isLoggedIn, isAdmin, otherRevenueController.getOtherRevenueByIdController);

module.exports = router;