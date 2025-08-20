const express = require('express');
const assignmentRouter = express.Router();
const {
  createAssignmentController,
  getAssignmentsForStudentController,
  submitAssignmentController,
  getAssignmentsForTeacherController,
  addAssignmentCommentController,
  markSubmissionAsViewedController,
  getTeacherSubjectsController,
  getStudentSubjectsController,
} = require('../../../controllers/academic/assignment.controller');
const { createMulter } = require('../../../middlewares/fileUpload');
const isLoggedIn = require('../../../middlewares/isLoggedIn');

const upload = createMulter();

assignmentRouter.post('/assignments',isLoggedIn, createAssignmentController);
assignmentRouter.get('/assignments/student',isLoggedIn, getAssignmentsForStudentController);
assignmentRouter.post(
  '/assignments/submit',
  (req, res, next) => {
    console.log('Request headers:', req.headers);
    console.log('Request body (before multer):', req.body);
    next();
  },
  upload.single('file'),
  (req, res, next) => {
    console.log('Request body (after multer):', req.body);
    console.log('Request file:', req.file);
    next();
  },
  isLoggedIn,
  submitAssignmentController
);
assignmentRouter.get('/assignments/teacher',isLoggedIn, getAssignmentsForTeacherController);
assignmentRouter.post('/assignments/comment',isLoggedIn, addAssignmentCommentController);
assignmentRouter.post('/assignments/view',isLoggedIn, markSubmissionAsViewedController);
assignmentRouter.get('/assignments/teacher-subjects',isLoggedIn, getTeacherSubjectsController);

  assignmentRouter.get('/assignments/student-subjects',isLoggedIn, getStudentSubjectsController);

module.exports = assignmentRouter;