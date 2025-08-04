const express = require('express');
const announcementRouter = express.Router();
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const isTeacher = require('../../../middlewares/isTeacher');
const isAdmin = require('../../../middlewares/isAdmin');
const isStudent = require('../../../middlewares/isStudent'); // Assumes this exists
const {
  createGeneralAnnouncementController,
  createClassAnnouncementController,
  updateAnnouncementController,
  deleteAnnouncementController,
  getAllAnnouncementsController,
  getAnnouncementByIdController,
  getAnnouncementsByClassLevelController,
} = require('../../../controllers/announcement');

// Create a general announcement (Admin only)
announcementRouter
  .route('/announcement/general')
  .post(isLoggedIn, isAdmin, createGeneralAnnouncementController);

// Create a class announcement (Teacher or Admin)
announcementRouter
  .route('/announcement/class')
  .post(isLoggedIn, isTeacher, createClassAnnouncementController);

// Get all announcements (Admin, Teacher, or Student)
announcementRouter
  .route('/announcement')
  .get(isLoggedIn, getAllAnnouncementsController);


// Get announcements by class level and optional subclass (Admin, Teacher, or Student)
announcementRouter
  .route('/announcement/class-level')
  .get(isLoggedIn, isStudent, getAnnouncementsByClassLevelController);

  // Get, update, or delete a specific announcement
announcementRouter
.route('/announcement/:id')
.get(isLoggedIn, getAnnouncementByIdController)
.put(isLoggedIn, updateAnnouncementController)
.delete(isLoggedIn, deleteAnnouncementController);

module.exports = announcementRouter;