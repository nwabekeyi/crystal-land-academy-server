const Subject = require("../../models/Academic/subject.model");
const SubjectName = require("../../models/Academic/subjectName.model");
const ClassLevel = require("../../models/Academic/class.model");
const Teacher = require("../../models/Staff/teachers.model");
const mongoose = require("mongoose");

/**
 * Ensure mandatory subjects (Mathematics and English) exist in SubjectName
 * @returns {Array} - IDs of Mathematics and English subject names
 */
async function ensureMandatorySubjects() {
  const mandatorySubjects = [
    { name: "Mathematics", description: "Mandatory subject: Mathematics" },
    { name: "English", description: "Mandatory subject: English" },
  ];

  const subjectNameIds = [];
  for (const subj of mandatorySubjects) {
    let subjectName = await SubjectName.findOne({ name: subj.name });
    if (!subjectName) {
      subjectName = await SubjectName.create({
        name: subj.name,
        description: subj.description,
      });
    }
    subjectNameIds.push(subjectName._id);
  }
  return subjectNameIds;
}

/**
 * Create Subject service
 * @param {Object} data - The data containing information about the Subject
 * @returns {Object} - The created subject
 * @throws {Error} - If validation fails or an error occurs
 */
exports.createSubjectService = async (data) => {
  const { name, description, classLevelSubclasses } = data;

  // Validate name (SubjectName ID)
  const subjectName = await SubjectName.findById(name);
  if (!subjectName) {
    const error = new Error("SubjectName does not exist");
    error.statusCode = 404;
    throw error;
  }

  // Check if the Subject already exists with this SubjectName
  const subjectFound = await Subject.findOne({ name });
  if (subjectFound) {
    const error = new Error("Subject already exists with this name");
    error.statusCode = 409;
    throw error;
  }

  // Validate and sanitize classLevelSubclasses
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
        if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          if (!cls.subclassLetter) {
            const error = new Error(`Subclass letter required for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          const subclassExists = classLevel.subclasses.some(
            (sub) => sub.letter === cls.subclassLetter
          );
          if (!subclassExists) {
            const error = new Error(
              `Subclass ${cls.subclassLetter} does not exist in ${classLevel.name}`
            );
            error.statusCode = 400;
            throw error;
          }
        } else {
          if (cls.subclassLetter) {
            const error = new Error(`Subclass letter not allowed for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
        }

        // Validate and sanitize teachers
        let sanitizedTeachers = [];
        if (cls.teachers && cls.teachers.length > 0) {
          sanitizedTeachers = cls.teachers.map((teacher) =>
            mongoose.Types.ObjectId.isValid(teacher) ? teacher : teacher._id
          );
          const validTeachers = await Teacher.find({
            _id: { $in: sanitizedTeachers },
          });
          if (validTeachers.length !== sanitizedTeachers.length) {
            const error = new Error(
              `One or more Teachers for ${classLevel.name} ${cls.subclassLetter || "all"} are invalid`
            );
            error.statusCode = 400;
            throw error;
          }
        }

        return {
          classLevel: cls.classLevel,
          subclassLetter: cls.subclassLetter || null,
          teachers: sanitizedTeachers,
        };
      })
    );
  }

  // Create the Subject
  const subjectCreated = await Subject.create({
    name,
    description,
    classLevelSubclasses: sanitizedClassLevelSubclasses,
  });

  // Update ClassLevel
  if (sanitizedClassLevelSubclasses.length > 0) {
    for (const cls of sanitizedClassLevelSubclasses) {
      const classLevel = await ClassLevel.findById(cls.classLevel);
      if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
        // Add subject to specific subclass for SS
        await ClassLevel.updateOne(
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $addToSet: {
              "subclasses.$[sub].subjects": {
                subject: subjectCreated._id,
                teachers: cls.teachers,
              },
            },
          },
          {
            arrayFilters: [{ "sub.letter": cls.subclassLetter }],
          }
        );
      } else {
        // Add subject to class-level subjects and all subclasses for Primary/JSS
        await ClassLevel.updateOne(
          { _id: cls.classLevel },
          {
            $addToSet: {
              subjects: subjectCreated._id,
              "subclasses.$[].subjects": {
                subject: subjectCreated._id,
                teachers: cls.teachers,
              },
            },
          }
        );
      }
    }
  }

  // Update Teachers
  const teacherIds = sanitizedClassLevelSubclasses
    .filter((cls) => cls.teachers && cls.teachers.length > 0)
    .flatMap((cls) => cls.teachers);
  if (teacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teacherIds } },
      { $addToSet: { subjects: subjectCreated._id } }
    );
  }

  return subjectCreated;
};

/**
 * Update Subject service
 * @param {Object} data - The data containing updated information about the Subject
 * @param {string} id - The ID of the Subject to update
 * @returns {Object} - The updated subject
 * @throws {Error} - If validation fails or an error occurs
 */
exports.updateSubjectService = async (data, id) => {
  const { name, description, classLevelSubclasses } = data;

  // Check if the Subject exists
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Validate name (SubjectName ID) if provided
  if (name) {
    const subjectName = await SubjectName.findById(name);
    if (!subjectName) {
      const error = new Error("SubjectName does not exist");
      error.statusCode = 404;
      throw error;
    }

    // Check if the updated name already exists for another Subject
    const subjectFound = await Subject.findOne({
      name,
      _id: { $ne: id },
    });
    if (subjectFound) {
      const error = new Error("Subject already exists with this name");
      error.statusCode = 409;
      throw error;
    }
  }

  // Validate and sanitize classLevelSubclasses
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
        if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          if (!cls.subclassLetter) {
            const error = new Error(`Subclass letter required for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          const subclassExists = classLevel.subclasses.some(
            (sub) => sub.letter === cls.subclassLetter
          );
          if (!subclassExists) {
            const error = new Error(
              `Subclass ${cls.subclassLetter} does not exist in ${classLevel.name}`
            );
            error.statusCode = 400;
            throw error;
          }
        } else {
          if (cls.subclassLetter) {
            const error = new Error(`Subclass letter not allowed for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
        }

        // Validate and sanitize teachers
        let sanitizedTeachers = [];
        if (cls.teachers && cls.teachers.length > 0) {
          sanitizedTeachers = cls.teachers.map((teacher) =>
            mongoose.Types.ObjectId.isValid(teacher) ? teacher : teacher._id
          );
          const validTeachers = await Teacher.find({
            _id: { $in: sanitizedTeachers },
          });
          if (validTeachers.length !== sanitizedTeachers.length) {
            const error = new Error(
              `One or more Teachers for ${classLevel.name} ${cls.subclassLetter || "all"} are invalid`
            );
            error.statusCode = 400;
            throw error;
          }
        }

        return {
          classLevel: cls.classLevel,
          subclassLetter: cls.subclassLetter || null,
          teachers: sanitizedTeachers,
        };
      })
    );
  }

  // Update ClassLevel: Remove subject from old assignments
  if (subject.classLevelSubclasses && subject.classLevelSubclasses.length > 0) {
    for (const cls of subject.classLevelSubclasses) {
      const classLevel = await ClassLevel.findById(cls.classLevel);
      if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
        const newSubclasses = sanitizedClassLevelSubclasses
          .filter((c) => c.classLevel.toString() === cls.classLevel.toString())
          .map((c) => c.subclassLetter);
        if (!newSubclasses.includes(cls.subclassLetter)) {
          await ClassLevel.updateOne(
            {
              _id: cls.classLevel,
              "subclasses.letter": cls.subclassLetter,
            },
            {
              $pull: {
                "subclasses.$[sub].subjects": { subject: subject._id },
              },
            },
            {
              arrayFilters: [{ "sub.letter": cls.subclassLetter }],
            }
          );
        }
      } else {
        const isStillAssigned = sanitizedClassLevelSubclasses.some(
          (c) => c.classLevel.toString() === cls.classLevel.toString()
        );
        if (!isStillAssigned) {
          await ClassLevel.updateOne(
            { _id: cls.classLevel },
            {
              $pull: {
                subjects: subject._id,
                "subclasses.$[].subjects": { subject: subject._id },
              },
            }
          );
        }
      }
    }
  }

  // Update ClassLevel: Add subject to new assignments
  if (sanitizedClassLevelSubclasses.length > 0) {
    for (const cls of sanitizedClassLevelSubclasses) {
      const classLevel = await ClassLevel.findById(cls.classLevel);
      if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
        await ClassLevel.updateOne(
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $addToSet: {
              "subclasses.$[sub].subjects": {
                subject: subject._id,
                teachers: cls.teachers,
              },
            },
          },
          {
            arrayFilters: [{ "sub.letter": cls.subclassLetter }],
          }
        );
      } else {
        await ClassLevel.updateOne(
          { _id: cls.classLevel },
          {
            $addToSet: {
              subjects: subject._id,
              "subclasses.$[].subjects": {
                subject: subject._id,
                teachers: cls.teachers,
              },
            },
          }
        );
      }
    }
  }

  // Update Teachers
  const oldTeacherIds = subject.classLevelSubclasses
    .filter((cls) => cls.teachers && cls.teachers.length > 0)
    .flatMap((cls) => cls.teachers);
  const newTeacherIds = sanitizedClassLevelSubclasses
    .filter((cls) => cls.teachers && cls.teachers.length > 0)
    .flatMap((cls) => cls.teachers);

  if (oldTeacherIds.length > 0) {
    await Teacher.updateMany(
      {
        _id: { $in: oldTeacherIds, $nin: newTeacherIds },
        subjects: subject._id,
      },
      { $pull: { subjects: subject._id } }
    );
  }

  if (newTeacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: newTeacherIds } },
      { $addToSet: { subjects: subject._id } }
    );
  }

  // Update the Subject
  const updatedSubject = await Subject.findByIdAndUpdate(
    id,
    {
      name: name || subject.name,
      description,
      classLevelSubclasses: sanitizedClassLevelSubclasses,
    },
    { new: true }
  );

  return updatedSubject;
};

/**
 * Get all Subjects service
 * @returns {Array} - List of all subjects
 */
exports.getAllSubjectsService = async () => {

  return await Subject.find().populate("name");
};

/**
 * Get a single Subject service
 * @param {string} id - The ID of the Subject to retrieve
 * @returns {Object} - The requested subject
 * @throws {Error} - If the subject is not found
 */
exports.getSubjectsService = async (id) => {
  const subject = await Subject.findById(id).populate("name");
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

/**
 * Delete Subject service
 * @param {string} id - The ID of the Subject to delete
 * @returns {string} - Success message
 * @throws {Error} - If the subject is not found
 */
exports.deleteSubjectService = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }

  // Remove subject from ClassLevel
  if (subject.classLevelSubclasses && subject.classLevelSubclasses.length > 0) {
    for (const cls of subject.classLevelSubclasses) {
      const classLevel = await ClassLevel.findById(cls.classLevel);
      if (!classLevel) {
        continue; // Skip if ClassLevel no longer exists
      }
      if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
        await ClassLevel.updateOne(
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $pull: {
              "subclasses.$[sub].subjects": { subject: subject._id },
            },
          },
          {
            arrayFilters: [{ "sub.letter": cls.subclassLetter }],
          }
        );
      } else {
        await ClassLevel.updateOne(
          { _id: cls.classLevel },
          {
            $pull: {
              subjects: subject._id,
              "subclasses.$[].subjects": { subject: subject._id },
            },
          }
        );
      }
    }
  }

  // Remove subject from teachers
  const teacherIds = subject.classLevelSubclasses
    .filter((cls) => cls.teachers && cls.teachers.length > 0)
    .flatMap((cls) => cls.teachers);
  if (teacherIds.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teacherIds } },
      { $pull: { subjects: subject._id } }
    );
  }

  // Delete the Subject
  await Subject.findByIdAndDelete(id);

  return "Subject deleted successfully";
};


/**
 * Get Subjects for a Subclass service or all subjects if no filters provided
 * @param {Object} data - The data containing optional classLevelId and subclassLetter
 * @returns {Array} - List of subjects for the subclass or all subjects
 * @throws {Error} - If validation fails
 */
exports.getSubjectsForSubclassService = async (data = {}) => {
  const { classLevelId, subclassLetter } = data;

  // If no classLevelId or subclassLetter, fetch all subjects
  if (!classLevelId || !subclassLetter) {
    const subjects = await Subject.find().populate({
      path: 'name',
      select: 'name', // Only fetch the name field from SubjectName
    });

    // Verify all subjects have a valid name reference
    // const invalidSubjects = subjects.filter(subject => !subject.name);
    // if (invalidSubjects.length > 0) {
    //   const error = new Error(`Some subjects have missing or invalid name references: ${invalidSubjects.map(s => s._id).join(', ')}`);
    //   error.statusCode = 400;
    //   throw error;
    // }

    return subjects;
  }

  // Validate classLevel
  const classLevel = await ClassLevel.findById(classLevelId);
  if (!classLevel) {
    const error = new Error("ClassLevel not found");
    error.statusCode = 404;
    throw error;
  }

  // Validate subclassLetter
  const subclass = classLevel.subclasses.find((sub) => sub.letter === subclassLetter);
  if (!subclass) {
    const error = new Error(`Subclass ${subclassLetter} does not exist in ${classLevel.name}`);
    error.statusCode = 400;
    throw error;
  }

  let subjectIds = [];
  if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
    // For SS, get subjects from subclass
    subjectIds = subclass.subjects.map((s) => s.subject);
  } else {
    // For Primary/JSS, get subjects from class level
    subjectIds = classLevel.subjects || [];
  }

  if (subjectIds.length === 0) {
    return [];
  }

  // Validate subjectIds
  for (const subjectId of subjectIds) {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      const error = new Error(`Invalid subject ID: ${subjectId}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Fetch subjects and ensure name is populated
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).populate({
    path: 'name',
    select: 'name', // Only fetch the name field from SubjectName
  });

  // Verify all subjects have a valid name reference
  // const invalidSubjects = subjects.filter(subject => !subject.name);
  // if (invalidSubjects.length > 0) {
  //   const error = new Error(`Some subjects have missing or invalid name references: ${invalidSubjects.map(s => s._id).join(', ')}`);
  //   error.statusCode = 400;
  //   throw error;
  // }

  return subjects;
};

/**
 * Get Subjects for a Teacher service
 * @param {string} teacherId - The ID of the Teacher
 * @returns {Array} - List of subjects assigned to the teacher
 * @throws {Error} - If the teacher is not found or no subjects are assigned
 */
exports.getSubjectsForTeacherService = async (teacherId) => {
  // Validate teacher
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }

  // Find ClassLevels where the teacher is assigned
  const classLevels = await ClassLevel.find({
    "subclasses.subjects.teachers": teacherId,
  });

  // Collect unique subject IDs
  const subjectIds = new Set();
  classLevels.forEach((classLevel) => {
    classLevel.subclasses.forEach((subclass) => {
      subclass.subjects.forEach((subjectEntry) => {
        if (subjectEntry.teachers.some((t) => t.toString() === teacherId)) {
          subjectIds.add(subjectEntry.subject.toString());
        }
      });
    });
  });

  if (subjectIds.size === 0) {
    return [];
  }

  // Fetch subjects
  const subjects = await Subject.find({ _id: { $in: Array.from(subjectIds) } }).populate("name");

  return subjects;
};