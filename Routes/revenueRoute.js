const express = require('express');
const { getRevenues, createRevenue } = require('../controller/revenueController');
const router = express.Router();

router.get('/api/v1/revenues', getRevenues);
router.post('/api/v1/revenue', createRevenue);

module.exports = router;
