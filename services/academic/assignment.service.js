const mongoose = require('mongoose');
const Assignment = require('../../models/Academic/assignment.model');
const Student = require('../../models/Students/students.model');
const Teacher = require('../../models/Staff/teachers.model');
const ClassLevel = require('../../models/Academic/class.model');
const { createMulter, deleteFromCloudinary } = require('../../middlewares/fileUpload');

const upload = createMulter();

exports.createAssignmentService = async (data, res) => {
  const { id, session, term, classLevelId, subclass, title, dueDate, description, subjectId, teacherId } = data;

  try {
    // Validate required fields
    if (!id || !session || !term || !classLevelId || !title || !dueDate || !description || !subjectId || !teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Missing required fields' });
    }
    if (!mongoose.isValidObjectId(classLevelId) || !mongoose.isValidObjectId(teacherId) || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid class, teacher, or subject ID' });
    }

    // Validate teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ status: 'failed', message: 'Teacher not found' });
    }

    // Validate class level and teacher authorization
    const classLevel = await ClassLevel.findOne({
      _id: new mongoose.Types.ObjectId(classLevelId),
      'teachers.teacherId': new mongoose.Types.ObjectId(teacherId),
    });
    if (!classLevel) {
      return res.status(403).json({ status: 'failed', message: 'Teacher not authorized for this class' });
    }

    // Validate subject and teacher authorization for the subject
    const subject = await mongoose.model('Subject').findOne({
      _id: new mongoose.Types.ObjectId(subjectId),
      'classLevelSubclasses.classLevel': new mongoose.Types.ObjectId(classLevelId),
      'classLevelSubclasses.teachers': new mongoose.Types.ObjectId(teacherId),
    });
    if (!subject) {
      return res.status(403).json({
        status: 'failed',
        message: 'Teacher not authorized to create assignments for this subject in the specified class',
      });
    }

    // Validate subclass if provided
    if (subclass) {
      if (!classLevel.subclasses.some((sub) => sub.letter === subclass)) {
        return res.status(400).json({ status: 'failed', message: `Invalid subclass: ${subclass}` });
      }
      const subclassValid = subject.classLevelSubclasses.some(
        (cls) => cls.classLevel.toString() === classLevelId && (!cls.subclassLetter || cls.subclassLetter === subclass)
      );
      if (!subclassValid) {
        return res.status(400).json({
          status: 'failed',
          message: `Subclass ${subclass} is not valid for this subject in the specified class`,
        });
      }
    }

    // Validate academic year and session
    const academicYear = await mongoose.model('AcademicYear').findById(classLevel.academicYear);
    if (!academicYear) {
      return res.status(400).json({ status: 'failed', message: 'Invalid academic year' });
    }
    if (academicYear.name !== session) {
      return res.status(400).json({ status: 'failed', message: 'Session does not match current academic year' });
    }

    // Validate term
    const validTerms = ['1st Term', '2nd Term', '3rd Term'];
    if (!validTerms.includes(term)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid term' });
    }

    // Check for duplicate assignment ID
    const existingAssignment = await Assignment.findOne({ id });
    if (existingAssignment) {
      return res.status(409).json({ status: 'failed', message: `Assignment ID ${id} already exists` });
    }

    // Validate due date
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate) || parsedDueDate <= new Date()) {
      return res.status(400).json({ status: 'failed', message: 'Invalid or past due date' });
    }

    // Create new assignment
    const assignment = new Assignment({
      id,
      session,
      term,
      classLevelId: new mongoose.Types.ObjectId(classLevelId),
      subclass,
      title,
      dueDate: parsedDueDate,
      description,
      subjectId: new mongoose.Types.ObjectId(subjectId),
      submissions: [],
      teacherId: new mongoose.Types.ObjectId(teacherId),
    });

    await assignment.save();
    return res.status(201).json({ status: 'success', message: 'Assignment created successfully', data: assignment });
  } catch (error) {
    console.error('Create Assignment Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAssignmentsForStudentService = async (studentId, query, res) => {
  try {
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ status: 'failed', message: `Invalid student ID: ${studentId}` });
    }

    const student = await Student.findById(studentId).select('classLevelId currentClassLevel.subclass firstName lastName');
    if (!student) {
      return res.status(404).json({ status: 'failed', message: 'Student not found' });
    }
    if (!student.classLevelId) {
      return res.status(404).json({ status: 'failed', message: 'Student not assigned to a class' });
    }

    const classLevel = await ClassLevel.findById(student.classLevelId);
    if (!classLevel) {
      return res.status(404).json({ status: 'failed', message: 'Class not found' });
    }

    const filter = { classLevelId: student.classLevelId };
    if (student.currentClassLevel?.subclass) {
      filter.subclass = student.currentClassLevel.subclass;
    }
    if (query.subjectId && mongoose.isValidObjectId(query.subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);
    }

    const assignments = await Assignment.find(filter)
      .populate('submissions.studentId', 'firstName lastName')
      .select('id session term classLevelId subclass title dueDate description subjectId submissions')
      .lean();

    if (!assignments.length) {
      return res.status(404).json({ status: 'failed', message: 'No assignments found for this class' });
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
              deletionScheduledAt: studentSubmission.deletionScheduledAt,
            }
          : null,
      };
    });

    return res.status(200).json({ status: 'success', data: transformedAssignments });
  } catch (error) {
    console.error('Get Assignments Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.submitAssignmentService = async (req, res) => {
  try {
    if (!req.body) {
      console.error('req.body is undefined');
      return res.status(400).json({ status: 'failed', message: 'Request body is missing' });
    }

    const { assignmentId, studentId } = req.body;
    const file = req.file;

    console.log('Submit Assignment Service - Request body:', req.body);
    console.log('Submit Assignment Service - Request file:', req.file);

    if (!assignmentId || !studentId || !file) {
      return res.status(400).json({
        status: 'failed',
        message: 'Missing required fields: assignmentId, studentId, or file',
      });
    }

    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid student ID' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId })
      .populate('submissions.studentId', 'firstName lastName')
      .populate('classLevelId', 'name section');
    if (!assignment) {
      return res.status(404).json({ status: 'failed', message: 'Assignment not found' });
    }

    if (!assignment.teacherId) {
      return res.status(400).json({ status: 'failed', message: 'Assignment is missing teacherId' });
    }

    if (new Date() > new Date(assignment.dueDate)) {
      return res.status(400).json({ status: 'failed', message: 'Submission deadline has passed' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ status: 'failed', message: 'Student not found' });
    }

    const cloudinaryLink = req.file.path;
    const existingSubmission = assignment.submissions.find(
      (sub) => sub.studentId._id.toString() === studentId
    );

    const submission = {
      studentId: student._id,
      name: `${student.firstName} ${student.lastName}`,
      cloudinaryLink,
      submissionDate: new Date(),
      comments: existingSubmission ? existingSubmission.comments : [],
      submitted: true,
      viewed: false,
      viewedAt: null,
      deletionScheduledAt: null,
    };

    const update = existingSubmission
      ? {
          $set: {
            'submissions.$[sub]': submission,
          },
        }
      : {
          $push: { submissions: submission },
        };

    const options = {
      arrayFilters: existingSubmission ? [{ 'sub.studentId': student._id }] : undefined,
      new: true,
      runValidators: true,
      select: '-__v',
    };

    const updatedAssignment = await Assignment.findOneAndUpdate(
      { id: assignmentId },
      update,
      options
    )
      .populate('submissions.studentId', 'firstName lastName')
      .populate('classLevelId', 'name section')
      .lean();

    if (!updatedAssignment) {
      return res.status(404).json({ status: 'failed', message: 'Failed to update assignment' });
    }

    updatedAssignment.studentSubmission = updatedAssignment.submissions.find(
      (sub) => sub.studentId._id.toString() === studentId
    ) || null;
    updatedAssignment.canSubmit = new Date() <= new Date(updatedAssignment.dueDate);

    return res.status(200).json({
      status: 'success',
      message: existingSubmission ? 'Assignment resubmitted successfully' : 'Assignment submitted successfully',
      data: updatedAssignment,
    });
  } catch (error) {
    console.error('Submit Assignment Service Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAssignmentsForTeacherService = async (teacherId, query, res) => {
  try {
    if (!mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid teacher ID' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ status: 'failed', message: 'Teacher not found' });
    }

    const classLevelIds = await ClassLevel.find({ 'teachers.teacherId': new mongoose.Types.ObjectId(teacherId) }).select('_id');
    if (!classLevelIds.length) {
      return res.status(404).json({ status: 'failed', message: 'No classes assigned to teacher' });
    }

    const filter = {
      classLevelId: { $in: classLevelIds.map((c) => c._id) },
      teacherId: new mongoose.Types.ObjectId(teacherId),
    };
    if (query.classLevelId && mongoose.isValidObjectId(query.classLevelId)) {
      if (!classLevelIds.some((c) => c._id.toString() === query.classLevelId)) {
        return res.status(403).json({ status: 'failed', message: 'Teacher not enrolled in this class' });
      }
      filter.classLevelId = new mongoose.Types.ObjectId(query.classLevelId);
    }
    if (query.term) filter.term = query.term;
    if (query.session) filter.session = query.session;
    if (query.subclass) filter.subclass = query.subclass;
    if (query.subjectId && mongoose.isValidObjectId(query.subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);
      const subject = await mongoose.model('Subject').findOne({
        _id: new mongoose.Types.ObjectId(query.subjectId),
        'classLevelSubclasses.classLevel': { $in: classLevelIds.map((c) => c._id) },
        'classLevelSubclasses.teachers': new mongoose.Types.ObjectId(teacherId),
      });
      if (!subject) {
        return res.status(403).json({
          status: 'failed',
          message: 'Teacher not authorized for this subject',
        });
      }
    }

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(filter)
      .populate('submissions.studentId', 'firstName lastName')
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
        deletionScheduledAt: sub.deletionScheduledAt,
      })),
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data: transformedAssignments,
      },
    });
  } catch (error) {
    console.error('Get Assignments Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.addAssignmentCommentService = async (data, res) => {
  const { assignmentId, studentId, comments, teacherId } = data;

  try {
    if (!assignmentId || !mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(teacherId) || !Array.isArray(comments)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid input data' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ status: 'failed', message: 'Assignment not found' });
    }

    const classLevel = await ClassLevel.findOne({
      _id: assignment.classLevelId,
      'teachers.teacherId': teacherId,
    });
    if (!classLevel) {
      return res.status(403).json({ status: 'failed', message: 'Teacher not authorized' });
    }

    const submissionIndex = assignment.submissions.findIndex(
      (sub) => sub.studentId.toString() === studentId
    );
    if (submissionIndex === -1 || !assignment.submissions[submissionIndex].submitted) {
      return res.status(404).json({ status: 'failed', message: 'No submission found' });
    }

    assignment.submissions[submissionIndex].comments = comments;
    assignment.submissions[submissionIndex].viewed = true;
    assignment.submissions[submissionIndex].viewedAt = new Date();
    assignment.submissions[submissionIndex].deletionScheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await assignment.save();

    const populatedAssignment = await Assignment.findOne({ id: assignmentId })
      .populate('submissions.studentId', 'firstName lastName')
      .lean();

    return res.status(200).json({
      status: 'success',
      message: 'Comment added successfully',
      data: populatedAssignment,
    });
  } catch (error) {
    console.error('Add Comment Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.markSubmissionAsViewedService = async (data, res) => {
  const { assignmentId, studentId, teacherId } = data;

  try {
    if (!assignmentId || !mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid input data' });
    }

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ status: 'failed', message: 'Assignment not found' });
    }

    const classLevel = await ClassLevel.findOne({
      _id: assignment.classLevelId,
      'teachers.teacherId': teacherId,
    });
    if (!classLevel) {
      return res.status(403).json({ status: 'failed', message: 'Teacher not authorized' });
    }

    const submissionIndex = assignment.submissions.findIndex(
      (sub) => sub.studentId.toString() === studentId
    );
    if (submissionIndex === -1 || !assignment.submissions[submissionIndex].submitted) {
      return res.status(404).json({ status: 'failed', message: 'No submission found' });
    }

    if (assignment.submissions[submissionIndex].viewed) {
      return res.status(400).json({ status: 'failed', message: 'Submission already marked as viewed' });
    }

    assignment.submissions[submissionIndex].viewed = true;
    assignment.submissions[submissionIndex].viewedAt = new Date();
    assignment.submissions[submissionIndex].deletionScheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await assignment.save();

    const populatedAssignment = await Assignment.findOne({ id: assignmentId })
      .populate('submissions.studentId', 'firstName lastName')
      .lean();

    return res.status(200).json({
      status: 'success',
      message: 'Submission marked as viewed',
      data: populatedAssignment,
    });
  } catch (error) {
    console.error('Mark Submission Viewed Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};


exports.getTeacherSubjectsService = async (teacherId, res) => {
  try {
    if (!mongoose.isValidObjectId(teacherId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid teacher ID' });
    }

    const subjects = await mongoose.model('Subject').find({
      'classLevelSubclasses.teachers': new mongoose.Types.ObjectId(teacherId),
    })
      .populate('name', 'name') // Assuming Subject.name is a reference to SubjectName
      .lean();

    return res.status(200).json({
      status: 'success',
      data: subjects.map((subject) => ({
        _id: subject._id,
        name: subject.name.name, // Adjust based on your SubjectName schema
        description: subject.description,
        classLevelSubclasses: subject.classLevelSubclasses,
      })),
    });
  } catch (error) {
    console.error('Get Teacher Subjects Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getStudentSubjectsService = async (studentId, res) => {
  try {
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid student ID' });
    }

    // Find subjects where the student's classLevel is included in classLevelSubclasses
    const subjects = await mongoose.model('Subject').find({
      'classLevelSubclasses.classLevel': {
        $in: await mongoose.model('ClassLevel').find({ students: new mongoose.Types.ObjectId(studentId) }).distinct('_id'),
      },
    }).lean();

    return res.status(200).json({
      status: 'success',
      data: subjects.map((subject) => ({
        _id: subject._id,
        name: subject.name.name || subject.name, // Handle both name structures
        description: subject.description,
        classLevelSubclasses: subject.classLevelSubclasses,
      })),
    });
  } catch (error) {
    console.error('Get Student Subjects Error:', error.message, error.stack);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};