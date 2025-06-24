// routes/academic/subject.route.js
const express = require("express");
const subjectRouter = express.Router();
// Middlewares
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
// Controllers
const {
  getSubjectsController,
  getSubjectController,
  updateSubjectController,
  deleteSubjectController,
  createSubjectController,
} = require("../../../controllers/academic/subject.controller");

subjectRouter.route("/subjects").get(isLoggedIn, isAdmin, getSubjectsController);
subjectRouter.route("/subjects/create").post(isLoggedIn, isAdmin, createSubjectController);
subjectRouter
  .route("/subjects/:id")
  .get(isLoggedIn, isAdmin, getSubjectController)
  .patch(isLoggedIn, isAdmin, updateSubjectController)
  .delete(isLoggedIn, isAdmin, deleteSubjectController);

module.exports = subjectRouter;