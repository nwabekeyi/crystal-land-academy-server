// routes/announcement.js
const express = require('express');
const announcementRouter = express.Router();
const isLoggedIn = require('../../../middlewares/isLoggedIn');
const isTeacher = require('../../../middlewares/isTeacher');
const isAdmin = require('../../../middlewares/isAdmin');
const {
  createGeneralAnnouncementController,
  createClassAnnouncementController,
  updateAnnouncementController,
  deleteAnnouncementController,
  getAllAnnouncementsController,
  getAnnouncementByIdController,
} = require('../../../controllers/announcement');

announcementRouter
  .route('/announcement/general')
  .post(isLoggedIn, isAdmin, createGeneralAnnouncementController);

announcementRouter
  .route('/announcement/class')
  .post(isLoggedIn, isTeacher, createClassAnnouncementController);

announcementRouter
  .route('/announcement')
  .get(isLoggedIn, getAllAnnouncementsController);

announcementRouter
  .route('/announcement/:id')
  .get(isLoggedIn, getAnnouncementByIdController)
  .put(isLoggedIn, updateAnnouncementController)
  .delete(isLoggedIn, deleteAnnouncementController);

module.exports = announcementRouter;