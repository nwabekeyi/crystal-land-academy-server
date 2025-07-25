const express = require("express");
const subjectNameRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const {
  createSubjectNameController,
  getAllSubjectNamesController,
  getSubjectNameController,
  updateSubjectNameController,
  deleteSubjectNameController,
} = require("../../../controllers/academic/subjectName.controller");

subjectNameRouter
  .route("/subject-names")
  .get(isLoggedIn, isAdmin, getAllSubjectNamesController)
  .post(isLoggedIn, isAdmin, createSubjectNameController);

subjectNameRouter
  .route("/subject-names/:id")
  .get(isLoggedIn, getSubjectNameController)
  .patch(isLoggedIn, updateSubjectNameController)
  .delete(isLoggedIn, deleteSubjectNameController);

module.exports = subjectNameRouter;