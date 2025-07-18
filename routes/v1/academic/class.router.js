const express = require("express");
const classRouter = express.Router();
// Middleware
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
// Controllers
const {
  getClassLevelsController,
  createClassLevelController,
  getClassLevelController,
  updateClassLevelController,
  deleteClassLevelController,
  signUpClassDataController,
  getClassLevelsAndSubclassesForTeacherController,
} = require("../../../controllers/academic/class.controller");

classRouter
  .route("/class-levels")
  .get(isLoggedIn, isAdmin, getClassLevelsController)
  .post(isLoggedIn, isAdmin, createClassLevelController);
classRouter
  .route("/class-levels/sign-up-data")
  .get(isLoggedIn, isAdmin, signUpClassDataController);
classRouter
  .route("/class-levels/:id")
  .get(isLoggedIn, isAdmin, getClassLevelController)
  .patch(isLoggedIn, isAdmin, updateClassLevelController)
  .delete(isLoggedIn, isAdmin, deleteClassLevelController);
classRouter
  .route("/class-levels/teacher/:teacherId")
  .get(isLoggedIn, isAdmin, getClassLevelsAndSubclassesForTeacherController);

module.exports = classRouter;