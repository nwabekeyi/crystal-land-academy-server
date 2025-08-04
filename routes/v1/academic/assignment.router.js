const express = require('express');
const assignmentRouter = express.Router();
const {
  createAssignmentController,
  getAssignmentsForStudentController,
  submitAssignmentController,
  getAssignmentsForTeacherController,
  addAssignmentCommentController,
  markSubmissionAsViewedController,
} = require('../../../controllers/academic/assignment.controller');
const { createMulter } = require('../../../middlewares/fileUpload');

const upload = createMulter();

assignmentRouter.post('/assignments', createAssignmentController);
assignmentRouter.get('/assignments/student', getAssignmentsForStudentController);
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
  submitAssignmentController
);
assignmentRouter.get('/assignments/teacher', getAssignmentsForTeacherController);
assignmentRouter.post('/assignments/comment', addAssignmentCommentController);
assignmentRouter.post('/assignments/view', markSubmissionAsViewedController);

module.exports = assignmentRouter;