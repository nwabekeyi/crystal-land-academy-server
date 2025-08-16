const {
  createAssignmentService,
  getAssignmentsForStudentService,
  submitAssignmentService,
  getAssignmentsForTeacherService,
  addAssignmentCommentService,
  markSubmissionAsViewedService,
  getTeacherSubjectsService ,
  getStudentSubjectsService ,
} = require('../../services/academic/assignment.service');

exports.createAssignmentController = async (req, res) => {
  const { id, session, term, classLevelId, subclass, title, dueDate, description, subjectId, teacherId } = req.body;
  try {
    if (!id || !session || !term || !classLevelId || !title || !dueDate || !description || !subjectId || !teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }
    return await createAssignmentService(
      { id, session, term, classLevelId, subclass, title, dueDate, description, subjectId, teacherId },
      res
    );
  } catch (error) {
    console.error('Create Assignment Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAssignmentsForStudentController = async (req, res) => {
  const { studentId, subjectId } = req.query;
  try {
    if (!studentId) {
      return res.status(400).json({ status: 'failed', message: 'Missing studentId' });
    }
    return await getAssignmentsForStudentService(studentId, { subjectId }, res);
  } catch (error) {
    console.error('Get Assignments Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.submitAssignmentController = async (req, res) => {
  try {
    console.log('Submit Assignment Controller - Request body:', req.body);
    console.log('Submit Assignment Controller - Request file:', req.file);
    return await submitAssignmentService(req, res);
  } catch (error) {
    console.error('Submit Assignment Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAssignmentsForTeacherController = async (req, res) => {
  const { teacherId, classLevelId, term, session, subclass, subjectId, page, limit } = req.query;
  try {
    if (!teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing teacherId' });
    }
    return await getAssignmentsForTeacherService(teacherId, { classLevelId, term, session, subclass, subjectId, page, limit }, res);
  } catch (error) {
    console.error('Get Assignments Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.addAssignmentCommentController = async (req, res) => {
  const { assignmentId, studentId, comments, teacherId } = req.body;
  try {
    if (!assignmentId || !studentId || !comments || !teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }
    if (!Array.isArray(comments)) {
      return res.status(400).json({ status: 'failed', message: 'Comments must be an array' });
    }
    return await addAssignmentCommentService({ assignmentId, studentId, comments, teacherId }, res);
  } catch (error) {
    console.error('Add Comment Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.markSubmissionAsViewedController = async (req, res) => {
  const { assignmentId, studentId, teacherId } = req.body;
  try {
    if (!assignmentId || !studentId || !teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }
    return await markSubmissionAsViewedService({ assignmentId, studentId, teacherId }, res);
  } catch (error) {
    console.error('Mark Submission Viewed Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getTeacherSubjectsController = async (req, res) => {
  const { teacherId } = req.query;
  try {
    if (!teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing teacherId' });
    }
    return await getTeacherSubjectsService(teacherId, res);
  } catch (error) {
    console.error('Get Teacher Subjects Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getStudentSubjectsController = async (req, res) => {
  const { studentId } = req.query;
  try {
    if (!studentId) {
      return res.status(400).json({ status: 'failed', message: 'Missing studentId' });
    }
    return await getStudentSubjectsService(studentId, res);
  } catch (error) {
    console.error('Get Student Subjects Controller Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};