const Subject = require("../../models/Academic/subject.model");
const ClassLevel = require("../../models/Academic/class.model");
const AcademicYear = require("../../models/Academic/academicYear.model");
const Teacher = require("../../models/Staff/teachers.model");
const mongoose = require("mongoose");

/**
 * Create Subject service.
 * @param {Object} data - The data containing information about the Subject.
 * @param {string} userId - The ID of the user creating the Subject.
 * @returns {Object} - The created subject.
 * @throws {Error} - If validation fails or an error occurs.
 */
exports.createSubjectService = async (data) => {
  const { name, description, academicYear, classLevelSubclasses } = data;

  // Check if the Subject already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({ name, academicYear });
  if (subjectFound) {
    const error = new Error("Subject already exists for this Academic Year");
    error.statusCode = 409;
    throw error;
  }

  // Validate and sanitize classLevelSubclasses and teachers
  let sanitizedClassLevelSubclasses = [];
  if (classLevelSubclasses && classLevelSubclasses.length > 0) {
    sanitizedClassLevelSubclasses = await Promise.all(
      classLevelSubclasses.map(async (cls) => {
        const classLevel = await ClassLevel.findById(cls.classLevel);
        if (!classLevel) {
          const error = new Error(`ClassLevel with ID ${cls.classLevel} does not exist`);
          error.statusCode = 400;
          throw error;
        }
        // Validate subclassLetter
        const subclassExists = classLevel.subclasses.some(
          (sub) => sub.letter === cls.subclassLetter
        );
        if (!subclassExists) {
          const error = new Error(
            `Subclass ${cls.subclassLetter} does not exist in ClassLevel ${cls.classLevel}`
          );
          error.statusCode = 400;
          throw error;
        }
        // Validate and sanitize teachers
        let sanitizedTeachers = [];
        if (cls.teachers && cls.teachers.length > 0) {
          // Ensure only teacher IDs are included
          sanitizedTeachers = cls.teachers.map((teacher) =>
            mongoose.Types.ObjectId.isValid(teacher) ? teacher : teacher._id
          );
          const validTeachers = await Teacher.find({
            _id: { $in: sanitizedTeachers },
          });
          if (validTeachers.length !== sanitizedTeachers.length) {
            const error = new Error(
              `One or more Teachers for ClassLevel ${cls.classLevel} subclass ${cls.subclassLetter} are invalid`
            );
            error.statusCode = 400;
            throw error;
          }
        }
        return {
          classLevel: cls.classLevel,
          subclassLetter: cls.subclassLetter,
          teachers: sanitizedTeachers,
        };
      })
    );
  }

  // Create the Subject
  const subjectCreated = await Subject.create({
    name,
    description,
    academicYear,
    classLevelSubclasses: sanitizedClassLevelSubclasses,
  });

  // Update ClassLevel.subclasses.subjects with the new subject ID
  if (sanitizedClassLevelSubclasses.length > 0) {
    for (const cls of sanitizedClassLevelSubclasses) {
      await ClassLevel.updateOne(
        {
          _id: cls.classLevel,
          "subclasses.letter": cls.subclassLetter,
        },
        {
          $addToSet: { "subclasses.$.subjects": subjectCreated._id },
        }
      );
    }
  }

  // Update Teachers' subject field with the new subject ID
  if (sanitizedClassLevelSubclasses.length > 0) {
    for (const cls of sanitizedClassLevelSubclasses) {
      if (cls.teachers && cls.teachers.length > 0) {
        await Teacher.updateMany(
          { _id: { $in: cls.teachers } },
          { $addToSet: { subject: subjectCreated._id } }
        );
      }
    }
  }

  // Populate relevant fields for the response
  const populatedSubject = await Subject.findById(subjectCreated._id).populate({
    path: "academicYear classLevelSubclasses.classLevel classLevelSubclasses.teachers createdBy",
  });

  return populatedSubject;
};

/**
 * Update Subject data service.
 * @param {Object} data - The data containing updated information about the Subject.
 * @param {string} id - The ID of the Subject to be updated.
 * @param {string} userId - The ID of the user updating the Subject.
 * @returns {Object} - The updated subject.
 * @throws {Error} - If validation fails or an error occurs.
 */
exports.updateSubjectService = async (data, id) => {
  const { name, description, academicYear, classLevelSubclasses } = data;

  // Check if the Subject exists
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if the updated name already exists for the same AcademicYear
  const subjectFound = await Subject.findOne({
    name,
    academicYear: academicYear || subject.academicYear,
    _id: { $ne: id },
  });
  if (subjectFound) {
    const error = new Error("Subject already exists for this Academic Year");
    error.statusCode = 409;
    throw error;
  }

  // Validate and sanitize classLevelSubclasses and teachers
  let sanitizedClassLevelSubclasses = [];
  if (classLevelSubclasses && classLevelSubclasses.length > 0) {
    sanitizedClassLevelSubclasses = await Promise.all(
      classLevelSubclasses.map(async (cls) => {
        const classLevel = await ClassLevel.findById(cls.classLevel);
        if (!classLevel) {
          const error = new Error(`ClassLevel with ID ${cls.classLevel} does not exist`);
          error.statusCode = 400;
          throw error;
        }
        // Validate subclassLetter
        const subclassExists = classLevel.subclasses.some(
          (sub) => sub.letter === cls.subclassLetter
        );
        if (!subclassExists) {
          const error = new Error(
            `Subclass ${cls.subclassLetter} does not exist in ClassLevel ${cls.classLevel}`
          );
          error.statusCode = 400;
          throw error;
        }
        // Validate and sanitize teachers
        let sanitizedTeachers = [];
        if (cls.teachers && cls.teachers.length > 0) {
          // Ensure only teacher IDs are included
          sanitizedTeachers = cls.teachers.map((teacher) =>
            mongoose.Types.ObjectId.isValid(teacher) ? teacher : teacher._id
          );
          const validTeachers = await Teacher.find({
            _id: { $in: sanitizedTeachers },
          });
          if (validTeachers.length !== sanitizedTeachers.length) {
            const error = new Error(
              `One or more Teachers for ClassLevel ${cls.classLevel} subclass ${cls.subclassLetter} are invalid`
            );
            error.statusCode = 400;
            throw error;
          }
        }
        return {
          classLevel: cls.classLevel,
          subclassLetter: cls.subclassLetter,
          teachers: sanitizedTeachers,
        };
      })
    );
  }

  // Update the Subject
  const updatedSubject = await Subject.findByIdAndUpdate(
    id,
    {
      name,
      description,
      academicYear: academicYear || subject.academicYear,
      classLevelSubclasses:
        sanitizedClassLevelSubclasses !== undefined
          ? sanitizedClassLevelSubclasses
          : subject.classLevelSubclasses,
    },
    { new: true }
  ).populate({
    path: "academicYear classLevelSubclasses.classLevel classLevelSubclasses.teachers createdBy",
  });

  // Update Teachers' subject field with the subject ID
  if (sanitizedClassLevelSubclasses.length > 0) {
    // Collect all teacher IDs from the updated classLevelSubclasses
    const newTeacherIds = sanitizedClassLevelSubclasses
      .filter((cls) => cls.teachers && cls.teachers.length > 0)
      .flatMap((cls) => cls.teachers);

    // Collect all teacher IDs from the existing subject
    const oldTeacherIds = subject.classLevelSubclasses
      .filter((cls) => cls.teachers && cls.teachers.length > 0)
      .flatMap((cls) => cls.teachers);

    // Remove subject from teachers not in the updated list
    await Teacher.updateMany(
      { _id: { $in: oldTeacherIds, $nin: newTeacherIds }, subject: subject._id },
      { $pull: { subject: subject._id } }
    );

    // Add subject to the updated teachers
    if (newTeacherIds.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: newTeacherIds } },
        { $addToSet: { subject: subject._id } }
      );
    }
  } else {
    // If no classLevelSubclasses provided, remove subject from all previous teachers
    const oldTeacherIds = subject.classLevelSubclasses
      .filter((cls) => cls.teachers && cls.teachers.length > 0)
      .flatMap((cls) => cls.teachers);
    await Teacher.updateMany(
      { _id: { $in: oldTeacherIds }, subject: subject._id },
      { $pull: { subject: subject._id } }
    );
  }

  return updatedSubject;
};

/**
 * Get all Subjects service.
 * @returns {Array} - List of all subjects.
 */
exports.getAllSubjectsService = async () => {
  const subjects = await Subject.find().populate({
    path: "academicYear classLevelSubclasses.classLevel classLevelSubclasses.teachers",
  });
  return subjects;
};

/**
 * Get a single Subject service.
 * @param {string} id - The ID of the Subject to retrieve.
 * @returns {Object} - The requested subject.
 * @throws {Error} - If the subject is not found.
 */
exports.getSubjectsService = async (id) => {
  const subject = await Subject.findById(id).populate({
    path: "academicYear classLevelSubclasses.classLevel classLevelSubclasses.teachers",
  });
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

/**
 * Delete Subject service.
 * @param {string} id - The ID of the Subject to delete.
 * @returns {string} - Success message.
 * @throws {Error} - If the subject is not found.
 */
exports.deleteSubjectService = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Remove subject from associated teachers
  const teacherIds = subject.classLevelSubclasses
    .filter((cls) => cls.teachers && cls.teachers.length > 0)
    .flatMap((cls) => cls.teachers);
  if (teacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teacherIds } },
      { $pull: { subject: subject._id } }
    );
  }

  // Delete the Subject
  await Subject.findByIdAndDelete(id);

  return "Subject deleted successfully";
};