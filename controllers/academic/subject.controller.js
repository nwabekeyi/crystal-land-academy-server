const {
  createSubjectService,
  getAllSubjectsService,
  getSubjectsService,
  updateSubjectService,
  deleteSubjectService,
  getSubjectsForSubclassService,
  getSubjectsForTeacherService,
} = require("../../services/academic/subject.service");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * @desc Create Subject
 * @route POST /api/v1/subjects/create
 * @access Private
 */
exports.createSubjectController = async (req, res) => {
  try {
    const result = await createSubjectService(req.body);
    responseStatus(res, 201, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get all Subjects
 * @route GET /api/v1/subjects
 * @access Private
 */
exports.getSubjectsController = async (req, res) => {
  try {
    const subjects = await getAllSubjectsService();
    responseStatus(res, 200, "success", subjects);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get single Subject
 * @route GET /api/v1/subjects/:id
 * @access Private
 */
exports.getSubjectController = async (req, res) => {
  try {
    const subject = await getSubjectsService(req.params.id);
    
    responseStatus(res, 200, "success", subject);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Update Subject
 * @route PATCH /api/v1/subjects/:id
 * @access Private
 */
exports.updateSubjectController = async (req, res) => {
  try {
    const result = await updateSubjectService(req.body, req.params.id);
    // Optional: Transform result to include name as string for frontend
    const transformedResult = {
      ...result._doc,
      name: result.name.name, // Extract string name from populated SubjectName
    };
    responseStatus(res, 200, "success", transformedResult);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Delete Subject
 * @route DELETE /api/v1/subjects/:id
 * @access Private
 */
exports.deleteSubjectController = async (req, res) => {
  try {
    const result = await deleteSubjectService(req.params.id);
    responseStatus(res, 200, "success", result);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get Subjects for a Subclass
 * @route POST /api/v1/subjects/subclass
 * @access Private
 */
exports.getSubjectsForSubclassController = async (req, res) => {
  try {
    const subjects = await getSubjectsForSubclassService(req.query); // Use req.query instead of req.body
    console.log(subjects)
    // Transform subjects to include name as string for frontend
    const transformedSubjects = subjects.map(subject => ({
      ...subject._doc,
      name: subject.name?.name || 'Unknown', // Fallback to 'Unknown' if name is missing
    }));

    responseStatus(res, 200, "success", transformedSubjects);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};

/**
 * @desc Get Subjects for a Teacher
 * @route GET /api/v1/subjects/teacher/:teacherId
 * @access Private
 */
exports.getSubjectsForTeacherController = async (req, res) => {
  try {
    const subjects = await getSubjectsForTeacherService(req.params.teacherId);
    // Optional: Transform subjects to include name as string for frontend
    const transformedSubjects = subjects.map(subject => ({
      ...subject._doc,
      name: subject.name.name, // Extract string name from populated SubjectName
    }));
    responseStatus(res, 200, "success", transformedSubjects);
  } catch (error) {
    responseStatus(res, error.statusCode || 500, "failed", error.message);
  }
};