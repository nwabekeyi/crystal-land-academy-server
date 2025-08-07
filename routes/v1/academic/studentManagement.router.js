const express = require("express");
const teacherRouter = express.Router();
const {
  getStudentsByTeacherAndClassController,
  postStudentCommentController,
} = require("../../../controllers/academic/studentManagement.controller");

teacherRouter
  .route("/students/:section/:className/:subclass")
  .get( getStudentsByTeacherAndClassController);

teacherRouter
  .route("/comment")
  .post( postStudentCommentController);

module.exports = teacherRouter;