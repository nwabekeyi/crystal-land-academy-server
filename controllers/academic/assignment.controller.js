const {
  createAssignmentService,
  getAssignmentsForStudentService,
  submitAssignmentService,
  getAssignmentsForTeacherService,
  addAssignmentCommentService,
  markSubmissionAsViewedService,
} = require('../../services/academic/assignment.service');
const responseStatus = require('../../handlers/responseStatus.handler');

/**
 * Create a new assignment.
 */
exports.createAssignmentController = async (req, res) => {
  const { id, session, term, classLevelId, subclass, title, dueDate, description, teacherId } = req.body;
  try {
    if (!id || !session || !term || !classLevelId || !title || !dueDate || !description || !teacherId) {
      return responseStatus(res, 400, 'failed', 'Missing required fields');
    }
    return await createAssignmentService(
      { id, session, term, classLevelId, subclass, title, dueDate, description, teacherId },
      res
    );
  } catch (error) {
    console.error('Create Assignment Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Get assignments for a student.
 */
exports.getAssignmentsForStudentController = async (req, res) => {
  const { studentId } = req.query;
  try {
    if (!studentId) {
      return responseStatus(res, 400, 'failed', 'Missing studentId');
    }
    return await getAssignmentsForStudentService(studentId, res);
  } catch (error) {
    console.error('Get Assignments Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Submit an assignment.
 */
exports.submitAssignmentController = async (req, res) => {
  const { assignmentId, studentId } = req.body;
  const file = req.file;
  try {
    if (!assignmentId || !studentId) {
      return responseStatus(res, 400, 'failed', 'Missing assignmentId or studentId');
    }
    return await submitAssignmentService({ assignmentId, studentId }, file, res);
  } catch (error) {
    console.error('Submit Assignment Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Get all assignments for a teacher.
 */
exports.getAssignmentsForTeacherController = async (req, res) => {
  const { teacherId } = req.query;
  try {
    if (!teacherId) {
      return responseStatus(res, 400, 'failed', 'Missing teacherId');
    }
    return await getAssignmentsForTeacherService(teacherId, req.query, res);
  } catch (error) {
    console.error('Get Assignments Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Add comments to a submission.
 */
exports.addAssignmentCommentController = async (req, res) => {
  const { assignmentId, studentId, comments, teacherId } = req.body;
  try {
    if (!assignmentId || !studentId || !comments || !teacherId) {
      return responseStatus(res, 400, 'failed', 'Missing required fields');
    }
    if (!Array.isArray(comments)) {
      return responseStatus(res, 400, 'failed', 'Comments must be an array');
    }
    return await addAssignmentCommentService({ assignmentId, studentId, comments, teacherId }, res);
  } catch (error) {
    console.error('Add Comment Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Mark a submission as viewed by a teacher.
 */
exports.markSubmissionAsViewedController = async (req, res) => {
  const { assignmentId, studentId, teacherId } = req.body;
  try {
    if (!assignmentId || !studentId || !teacherId) {
      return responseStatus(res, 400, 'failed', 'Missing required fields');
    }
    return await markSubmissionAsViewedService({ assignmentId, studentId, teacherId }, res);
  } catch (error) {
    console.error('Mark Submission Viewed Controller Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};