const express = require('express');
const { getInvoices, createInvoice } = require('../controller/invoiceController');
const router = express.Router();

router.get('/api/v1/invoices', getInvoices);
router.post('/api/v1/invoice', createInvoice);

module.exports = router;
