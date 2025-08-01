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
assignmentRouter.post('/assignments/submit', upload.single('file'), submitAssignmentController);
assignmentRouter.get('/assignments/teacher', getAssignmentsForTeacherController);
assignmentRouter.post('/assignments/comment', addAssignmentCommentController);
assignmentRouter.post('/assignments/view', markSubmissionAsViewedController);

module.exports = assignmentRouter;