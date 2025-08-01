const mongoose = require('mongoose');
const Assignment = require('../../models/Academic/assignment.model');
const Student = require('../../models/Students/students.model');
const Teacher = require('../../models/Staff/teachers.model');
const ClassLevel = require('../../models/Academic/class.model');
const responseStatus = require('../../handlers/responseStatus.handler');
const { deleteFromCloudinary } = require('../../middlewares/fileUpload');

/**
 * Create an assignment for a class by a teacher.
 * @param {Object} data - Assignment data.
 * @param {Object} res - Response object.
 */
exports.createAssignmentService = async (data, res) => {
  const { id, session, term, classLevelId, subclass, title, dueDate, description, teacherId } = data;

  try {
    // Validate required fields
    if (!id || !session || !term || !classLevelId || !title || !dueDate || !description || !teacherId) {
      return responseStatus(res, 400, 'failed', 'Missing required fields');
    }
    if (!mongoose.isValidObjectId(classLevelId) || !mongoose.isValidObjectId(teacherId)) {
      return responseStatus(res, 400, 'failed', 'Invalid class or teacher ID');
    }

    // Check teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, 'failed', 'Teacher not found');
    }

    // Check classLevel and teacher authorization
    const classLevel = await ClassLevel.findOne({
      _id: new mongoose.Types.ObjectId(classLevelId),
      'teachers.teacherId': new mongoose.Types.ObjectId(teacherId),
    });
    if (!classLevel) {
      return responseStatus(res, 403, 'failed', 'Teacher not authorized for this class');
    }

    // Validate academic year and term
    const academicYear = await mongoose.model('AcademicYear').findById(classLevel.academicYear);
    if (!academicYear) {
      return responseStatus(res, 400, 'failed', 'Invalid academic year');
    }
    if (academicYear.name !== session) {
      return responseStatus(res, 400, 'failed', 'Session does not match current academic year');
    }
    const validTerms = ['1st Term', '2nd Term', '3rd Term'];
    if (!validTerms.includes(term)) {
      return responseStatus(res, 400, 'failed', 'Invalid term');
    }

    // Validate subclass
    if (subclass && !classLevel.subclasses.some((sub) => sub.letter === subclass)) {
      return responseStatus(res, 400, 'failed', `Invalid subclass: ${subclass}`);
    }

    // Check for duplicate assignment ID
    const existingAssignment = await Assignment.findOne({ id });
    if (existingAssignment) {
      return responseStatus(res, 409, 'failed', `Assignment ID ${id} already exists`);
    }

    // Validate due date
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate) || parsedDueDate <= new Date()) {
      return responseStatus(res, 400, 'failed', 'Invalid or past due date');
    }

    // Create and save assignment
    const assignment = new Assignment({
      id,
      session,
      term,
      classLevelId: new mongoose.Types.ObjectId(classLevelId),
      subclass,
      title,
      dueDate: parsedDueDate,
      description,
      submissions: [],
      teacherId: new mongoose.Types.ObjectId(teacherId),
    });

    await assignment.save();
    return responseStatus(res, 201, 'success', assignment);
  } catch (error) {
    console.error('Create Assignment Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Get assignments for a student's class.
 * @param {string} studentId - Student ID.
 * @param {Object} res - Response object.
 */
exports.getAssignmentsForStudentService = async (studentId, res) => {
  try {
    if (!mongoose.isValidObjectId(studentId)) {
      return responseStatus(res, 400, 'failed', `Invalid student ID: ${studentId}`);
    }

    const student = await Student.findById(studentId).select('classLevelId currentClassLevel.subclass firstName lastName');
    if (!student) {
      return responseStatus(res, 404, 'failed', 'Student not found');
    }
    if (!student.classLevelId) {
      return responseStatus(res, 404, 'failed', 'Student not assigned to a class');
    }

    const classLevel = await ClassLevel.findById(student.classLevelId);
    if (!classLevel) {
      return responseStatus(res, 404, 'failed', 'Class not found');
    }

    const filter = { classLevelId: student.classLevelId };
    if (student.currentClassLevel?.subclass) {
      filter.subclass = student.currentClassLevel.subclass;
    }

    const assignments = await Assignment.find(filter)
      .populate('submissions.studentId', 'firstName lastName')
      .select('id session term classLevelId subclass title dueDate description submissions')
      .lean();

    if (!assignments.length) {
      return responseStatus(res, 404, 'failed', 'No assignments found for this class');
    }

    const currentDate = new Date();
    const transformedAssignments = assignments.map((assignment) => {
      const studentSubmission = assignment.submissions.find(
        (sub) => sub.studentId._id.toString() === studentId
      );
      return {
        ...assignment,
        canSubmit: currentDate <= new Date(assignment.dueDate),
        studentSubmission: studentSubmission
          ? {
              ...studentSubmission,
              viewed: studentSubmission.viewed,
              viewedAt: studentSubmission.viewedAt,
            }
          : null,
      };
    });

    return responseStatus(res, 200, 'success', transformedAssignments);
  } catch (error) {
    console.error('Get Assignments Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Submit an assignment by a student.
 * @param {Object} data - Submission data.
 * @param {Object} file - Uploaded file.
 * @param {Object} res - Response object.
 */
exports.submitAssignmentService = async (data, file, res) => {
  const { assignmentId, studentId } = data;

  try {
    if (!assignmentId || !mongoose.isValidObjectId(studentId)) {
      return responseStatus(res, 400, 'failed', 'Invalid assignment or student ID');
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return responseStatus(res, 404, 'failed', 'Assignment not found');
    }

    const student = await Student.findById(studentId).select('firstName lastName classLevelId');
    if (!student) {
      return responseStatus(res, 404, 'failed', 'Student not found');
    }
    if (student.classLevelId.toString() !== assignment.classLevelId.toString()) {
      return responseStatus(res, 403, 'failed', 'Student not enrolled in this class');
    }

    const currentDate = new Date();
    if (currentDate > new Date(assignment.dueDate)) {
      return responseStatus(res, 400, 'failed', 'Submission deadline passed');
    }

    let cloudinaryLink = file ? file.path : null;
    if (!file && !assignment.submissions.some((sub) => sub.studentId.toString() === studentId)) {
      return responseStatus(res, 400, 'failed', 'File required for new submission');
    }

    const submission = {
      studentId,
      name: `${student.firstName} ${student.lastName}`,
      cloudinaryLink,
      submissionDate: currentDate,
      comments: [],
      submitted: true,
      viewed: false,
      viewedAt: null,
    };

    const existingSubmissionIndex = assignment.submissions.findIndex(
      (sub) => sub.studentId.toString() === studentId
    );

    if (existingSubmissionIndex !== -1) {
      if (file && assignment.submissions[existingSubmissionIndex].cloudinaryLink) {
        await deleteFromCloudinary(assignment.submissions[existingSubmissionIndex].cloudinaryLink);
      }
      assignment.submissions[existingSubmissionIndex] = {
        ...assignment.submissions[existingSubmissionIndex],
        ...submission,
        cloudinaryLink: cloudinaryLink || assignment.submissions[existingSubmissionIndex].cloudinaryLink,
        comments: assignment.submissions[existingSubmissionIndex].comments,
      };
    } else {
      assignment.submissions.push(submission);
    }

    await assignment.save();
    const populatedAssignment = await Assignment.findOne({ id: assignmentId }).populate(
      'submissions.studentId',
      'firstName lastName'
    );

    return responseStatus(res, 200, 'success', populatedAssignment);
  } catch (error) {
    console.error('Submit Assignment Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Get all assignments for a teacher's classes, with or without submissions.
 * @param {string} teacherId - Teacher ID.
 * @param {Object} query - Query parameters.
 * @param {Object} res - Response object.
 */
exports.getAssignmentsForTeacherService = async (teacherId, query, res) => {
  try {
    if (!mongoose.isValidObjectId(teacherId)) {
      return responseStatus(res, 400, 'failed', 'Invalid teacher ID');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return responseStatus(res, 404, 'failed', 'Teacher not found');
    }

    const classLevelIds = await ClassLevel.find({ 'teachers.teacherId': new mongoose.Types.ObjectId(teacherId) }).select('_id');
    if (!classLevelIds.length) {
      return responseStatus(res, 404, 'failed', 'No classes assigned to teacher');
    }

    const filter = {
      classLevelId: { $in: classLevelIds.map((c) => c._id) },
      teacherId: new mongoose.Types.ObjectId(teacherId),
    };
    if (query.classLevelId && mongoose.isValidObjectId(query.classLevelId)) {
      if (!classLevelIds.some((c) => c._id.toString() === query.classLevelId)) {
        return responseStatus(res, 403, 'failed', 'Teacher not enrolled in this class');
      }
      filter.classLevelId = new mongoose.Types.ObjectId(query.classLevelId);
    }
    if (query.term) filter.term = query.term;
    if (query.session) filter.session = query.session;
    if (query.subclass) filter.subclass = query.subclass;

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(filter)
      .populate('submissions.studentId', 'firstName lastName studentId')
      .populate('classLevelId', 'name section')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Assignment.countDocuments(filter);

    const currentDate = new Date();
    const transformedAssignments = assignments.map((assignment) => ({
      ...assignment,
      canSubmit: currentDate <= new Date(assignment.dueDate),
      submissions: assignment.submissions.map((sub) => ({
        ...sub,
        student: sub.studentId,
        viewed: sub.viewed,
        viewedAt: sub.viewedAt,
      })),
    }));

    return responseStatus(res, 200, 'success', {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: transformedAssignments,
    });
  } catch (error) {
    console.error('Get Assignments Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Add comments to a student's submission.
 * @param {Object} data - Comment data.
 * @param {Object} res - Response object.
 */
exports.addAssignmentCommentService = async (data, res) => {
  const { assignmentId, studentId, comments, teacherId } = data;

  try {
    if (!assignmentId || !mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(teacherId) || !Array.isArray(comments)) {
      return responseStatus(res, 400, 'failed', 'Invalid input data');
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return responseStatus(res, 404, 'failed', 'Assignment not found');
    }

    const classLevel = await ClassLevel.findOne({
      _id: assignment.classLevelId,
      'teachers.teacherId': teacherId,
    });
    if (!classLevel) {
      return responseStatus(res, 403, 'failed', 'Teacher not authorized');
    }

    const submissionIndex = assignment.submissions.findIndex(
      (sub) => sub.studentId.toString() === studentId
    );
    if (submissionIndex === -1 || !assignment.submissions[submissionIndex].submitted) {
      return responseStatus(res, 404, 'failed', 'No submission found');
    }

    assignment.submissions[submissionIndex].comments = comments;
    assignment.submissions[submissionIndex].viewed = true;
    assignment.submissions[submissionIndex].viewedAt = new Date();

    await assignment.save();

    const populatedAssignment = await Assignment.findOne({ id: assignmentId }).populate(
      'submissions.studentId',
      'firstName lastName'
    );

    return responseStatus(res, 200, 'success', populatedAssignment);
  } catch (error) {
    console.error('Add Comment Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};

/**
 * Mark a student's submission as viewed by a teacher.
 * @param {Object} data - Data containing assignmentId, studentId, and teacherId.
 * @param {Object} res - Response object.
 */
exports.markSubmissionAsViewedService = async (data, res) => {
  const { assignmentId, studentId, teacherId } = data;

  try {
    if (!assignmentId || !mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(teacherId)) {
      return responseStatus(res, 400, 'failed', 'Invalid input data');
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return responseStatus(res, 404, 'failed', 'Assignment not found');
    }

    const classLevel = await ClassLevel.findOne({
      _id: assignment.classLevelId,
      'teachers.teacherId': teacherId,
    });
    if (!classLevel) {
      return responseStatus(res, 403, 'failed', 'Teacher not authorized');
    }

    const submissionIndex = assignment.submissions.findIndex(
      (sub) => sub.studentId.toString() === studentId
    );
    if (submissionIndex === -1 || !assignment.submissions[submissionIndex].submitted) {
      return responseStatus(res, 404, 'failed', 'No submission found');
    }

    assignment.submissions[submissionIndex].viewed = true;
    assignment.submissions[submissionIndex].viewedAt = new Date();

    await assignment.save();

    const populatedAssignment = await Assignment.findOne({ id: assignmentId }).populate(
      'submissions.studentId',
      'firstName lastName'
    );

    return responseStatus(res, 200, 'success', populatedAssignment);
  } catch (error) {
    console.error('Mark Submission Viewed Error:', error.message, error.stack);
    return responseStatus(res, 500, 'error', error.message);
  }
};