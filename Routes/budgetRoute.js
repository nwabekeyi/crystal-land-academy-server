const express = require('express');
const { getBudgets, createBudget } = require('../controller/budgetController');
const router = express.Router();

router.get('/api/v1/budgets', getBudgets);
router.post('/api/v1/budget', createBudget);

module.exports = router;
