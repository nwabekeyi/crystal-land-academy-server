// routes/announcementRoutes.js

const express = require('express');
const router = express.Router();
const announcementController = require('../controller/announcement');

// Route for submitting a new announcement
router.post('/api/v1/announcement', announcementController.submitAnnouncement);

// Route for getting all announcements
router.get('/api/v1/announcement', announcementController.getAllAnnouncements);

// Route for updating an announcement
router.put('/api/v1/announcement/:id', announcementController.updateAnnouncement);

// Route for deleting an announcement
router.delete('/api/v1/announcement/:id', announcementController.deleteAnnouncement);

module.exports = router;