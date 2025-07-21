// services/academic/curriculum.service.js
const Curriculum = require("../../models/Academic/curriculum.model");
const responseStatus = require("../../handlers/responseStatus.handler");

/**
 * Create Curriculum service.
 *
 * @param {Object} data - The data containing information about the Curriculum.
 * @param {string} data.subjectId - The ID of the subject.
 * @param {string} data.academicTermId - The ID of the academic term.
 * @param {string} data.classLevelId - The ID of the class level.
 * @param {string} data.courseDuration - The duration of the course.
 * @param {Array} data.topics - Array of topics with topic, description, duration, and resources.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.createCurriculumService = async (data, res) => {
  const { subjectId, academicTermId, classLevelId, courseDuration, topics } = data;

  // Check if the Curriculum already exists for this subject, term, and class level
  const curriculumFound = await Curriculum.findOne({ subjectId, academicTermId, classLevelId });
  if (curriculumFound) {
    return responseStatus(res, 402, "failed", "Curriculum already exists for this subject, term, and class");
  }

  // Create the Curriculum
  const curriculumCreated = await Curriculum.create({
    subjectId,
    academicTermId,
    classLevelId,
    courseDuration,
    topics,
  });

  // Populate the response
  const populatedCurriculum = await Curriculum.findById(curriculumCreated._id)
    .populate('subjectId', 'name')
    .populate('academicTermId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", populatedCurriculum);
};

/**
 * Get all Curricula service.
 *
 * @param {Object} query - Optional query parameters for filtering.
 * @param {string} query.academicTermId - Filter by academic term ID.
 * @param {string} query.classLevelId - Filter by class level ID.
 * @returns {Array} - An array of all Curricula.
 */
exports.getAllCurriculaService = async (query) => {
  const { academicTermId, classLevelId } = query;
  const filter = {};
  if (academicTermId) filter.academicTermId = academicTermId;
  if (classLevelId) filter.classLevelId = classLevelId;
  return await Curriculum.find(filter)
    .populate('subjectId', 'name')
    .populate('academicTermId', 'name')
    .populate('classLevelId', 'name');
};

/**
 * Get a single Curriculum by ID service.
 *
 * @param {string} id - The ID of the Curriculum.
 * @returns {Object} - The Curriculum object.
 */
exports.getCurriculumByIdService = async (id) => {
  return await Curriculum.findById(id)
    .populate('subjectId', 'name')
    .populate('academicTermId', 'name')
    .populate('classLevelId', 'name');
};

/**
 * Update Curriculum data service.
 *
 * @param {Object} data - The data containing updated information about the Curriculum.
 * @param {string} data.subjectId - The updated ID of the subject.
 * @param {string} data.academicTermId - The updated ID of the academic term.
 * @param {string} data.classLevelId - The updated ID of the class level.
 * @param {string} data.courseDuration - The updated duration of the course.
 * @param {Array} data.topics - Updated array of topics.
 * @param {string} id - The ID of the Curriculum to be updated.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.updateCurriculumService = async (data, id, res) => {
  const { subjectId, academicTermId, classLevelId, courseDuration, topics } = data;

  // Check if another curriculum exists with the updated subject, term, and class
  const curriculumFound = await Curriculum.findOne({
    subjectId,
    academicTermId,
    classLevelId,
    _id: { $ne: id },
  });
  if (curriculumFound) {
    return responseStatus(res, 402, "failed", "Curriculum already exists for this subject, term, and class");
  }

  // Update the Curriculum
  const curriculum = await Curriculum.findByIdAndUpdate(
    id,
    {
      subjectId,
      academicTermId,
      classLevelId,
      courseDuration,
      topics,
      updatedAt: Date.now(),
    },
    { new: true }
  )
    .populate('subjectId', 'name')
    .populate('academicTermId', 'name')
    .populate('classLevelId', 'name');

  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  return responseStatus(res, 200, "success", curriculum);
};

/**
 * Delete Curriculum data service.
 *
 * @param {string} id - The ID of the Curriculum to be deleted.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object indicating success or failure.
 */
exports.deleteCurriculumService = async (id, res) => {
  const curriculum = await Curriculum.findByIdAndDelete(id);
  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  return responseStatus(res, 200, "success", "Curriculum deleted");
};