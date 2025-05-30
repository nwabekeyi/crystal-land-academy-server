const express = require('express');
const { getExpenses, createExpense } = require('../controller/expenseController');
const router = express.Router();

router.get('/api/v1/expenses', getExpenses);
router.post('/api/v1/expense', createExpense);

module.exports = router;
