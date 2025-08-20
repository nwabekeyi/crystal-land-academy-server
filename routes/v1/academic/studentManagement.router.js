const express = require("express");
const teacherRouter = express.Router();
const {
  getStudentsByTeacherAndClassController,
  postStudentCommentController,
} = require("../../../controllers/academic/studentManagement.controller");
const isLoggedIn = require("../../../middlewares/isLoggedIn")

teacherRouter
  .route("/students/:section/:className/:subclass")
  .get(isLoggedIn, getStudentsByTeacherAndClassController);

teacherRouter
  .route("/comment")
  .post(isLoggedIn, postStudentCommentController);

module.exports = teacherRouter;