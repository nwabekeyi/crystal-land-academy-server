const express = require("express");
const classRouter = express.Router();
const isAdmin = require("../../../middlewares/isAdmin");
const isLoggedIn = require("../../../middlewares/isLoggedIn");
const {
  getClassLevelsController,
  createClassLevelController,
  getClassLevelController,
  updateClassLevelController,
  deleteClassLevelController,
  signUpClassDataController,
  getClassLevelsAndSubclassesForTeacherController,
  assignTeachersToClassController,
  addSubclassToClassLevelController,
} = require("../../../controllers/academic/class.controller");

classRouter
  .route("/class-levels")
  .get(isLoggedIn, getClassLevelsController)
  .post(isLoggedIn, isAdmin, createClassLevelController);
classRouter
  .route("/class-levels/sign-up-data")
  .get(isLoggedIn, isAdmin, signUpClassDataController);
classRouter
  .route("/class-levels/:id")
  .get(isLoggedIn, getClassLevelController)
  .patch(isLoggedIn, isAdmin, updateClassLevelController)
  .delete(isLoggedIn, isAdmin, deleteClassLevelController);
classRouter
  .route("/class-levels/teacher/:teacherId")
  .get(isLoggedIn, getClassLevelsAndSubclassesForTeacherController);
classRouter
  .route("/class-levels/:id/assign-teachers")
  .patch(isLoggedIn, isAdmin, assignTeachersToClassController);

  classRouter
  .route("/class-levels/:id/add-subclass")
  .post(isLoggedIn, isAdmin, addSubclassToClassLevelController);

module.exports = classRouter;