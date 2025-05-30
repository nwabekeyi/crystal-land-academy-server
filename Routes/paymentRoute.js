const express = require('express');
const { paymentReceipt, getAllReceiptsForUser} = require('../controller/paymentReceipt');
const { initializeTransaction, verifyPayment} = require('../controller/payStackPayment');

const router = express.Router();

router.get('/api/v1/payment/singleReceipt/:userId/:paymentId', paymentReceipt);
router.get('/api/v1/payment/student/:userId', getAllReceiptsForUser);
router.post('/api/v1/paystackPayment/:ref', verifyPayment);
router.post('/api/v1/InitPaystackPayment', initializeTransaction);


module.exports = router;
