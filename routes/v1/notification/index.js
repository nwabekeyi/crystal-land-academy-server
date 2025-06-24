const express = require('express');
const router = express.Router();
const NotificationController = require('../../../controllers/notification');
const isLoggedIn = require("../../../middlewares/isLoggedIn");

router.post('/notification', isLoggedIn, NotificationController.createNotification);
router.get('/notification', isLoggedIn, NotificationController.getNotifications);

module.exports = router;