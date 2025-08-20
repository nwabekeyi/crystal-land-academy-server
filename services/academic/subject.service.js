const Subject = require("../../models/Academic/subject.model");
const SubjectName = require("../../models/Academic/subjectName.model");
const ClassLevel = require("../../models/Academic/class.model");
const Teacher = require("../../models/Staff/teachers.model");
const Student = require("../../models/Students/students.model");
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

  // Check if the Subject already exists with this name
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

        // Handle non-SS classes: Add all subclass letters
        if (!["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          if (cls.subclassLetter) {
            const error = new Error(`Subclass letter not allowed for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          // Get all subclass letters from ClassLevel
          const subclassLetters = classLevel.subclasses.map((sub) => sub.letter);
          if (subclassLetters.length === 0) {
            const error = new Error(`No subclasses found for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          // Create entries for all subclasses with their respective letters
          return subclassLetters.map((letter) => ({
            classLevel: cls.classLevel,
            subclassLetter: letter,
            teachers: cls.teachers || [],
          }));
        } else {
          // Validate subclassLetter for SS classes
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

          // Validate and sanitize teachers for SS classes
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
                `One or more Teachers for ${classLevel.name} ${cls.subclassLetter} are invalid`
              );
              error.statusCode = 400;
              throw error;
            }
          }

          return [{
            classLevel: cls.classLevel,
            subclassLetter: cls.subclassLetter,
            teachers: sanitizedTeachers,
          }];
        }
      })
    );

    // Flatten the array since non-SS classes return multiple entries
    sanitizedClassLevelSubclasses = sanitizedClassLevelSubclasses.flat();
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
      if (!classLevel) continue;

      if (["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
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
        await ClassLevel.updateOne(
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $addToSet: {
              subjects: subjectCreated._id,
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

        // Handle non-SS classes: Add all subclass letters
        if (!["SS 1", "SS 2", "SS 3"].includes(classLevel.name)) {
          if (cls.subclassLetter) {
            const error = new Error(`Subclass letter not allowed for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          // Get all subclass letters from ClassLevel
          const subclassLetters = classLevel.subclasses.map((sub) => sub.letter);
          if (subclassLetters.length === 0) {
            const error = new Error(`No subclasses found for ${classLevel.name}`);
            error.statusCode = 400;
            throw error;
          }
          // Create entries for all subclasses with their respective letters
          return subclassLetters.map((letter) => ({
            classLevel: cls.classLevel,
            subclassLetter: letter,
            teachers: cls.teachers || [],
          }));
        } else {
          // Validate subclassLetter for SS classes
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

          // Validate and sanitize teachers for SS classes
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
                `One or more Teachers for ${classLevel.name} ${cls.subclassLetter} are invalid`
              );
              error.statusCode = 400;
              throw error;
            }
          }

          return [{
            classLevel: cls.classLevel,
            subclassLetter: cls.subclassLetter,
            teachers: sanitizedTeachers,
          }];
        }
      })
    );

    // Flatten the array since non-SS classes return multiple entries
    sanitizedClassLevelSubclasses = sanitizedClassLevelSubclasses.flat();
  }

  // Update ClassLevel: Remove subject from old assignments
  if (subject.classLevelSubclasses && subject.classLevelSubclasses.length > 0) {
    for (const cls of subject.classLevelSubclasses) {
      const classLevel = await ClassLevel.findById(cls.classLevel);
      if (!classLevel) continue;

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
                subjects: subject._id,
                "subclasses.$[sub].subjects": { subject: subject._id },
              },
            },
            {
              arrayFilters: [{ "sub.letter": cls.subclassLetter }],
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
      if (!classLevel) continue;

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
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $addToSet: {
              subjects: subject._id,
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
        continue;
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
          {
            _id: cls.classLevel,
            "subclasses.letter": cls.subclassLetter,
          },
          {
            $pull: {
              subjects: subject._id,
              "subclasses.$[sub].subjects": { subject: subject._id },
            },
          },
          {
            arrayFilters: [{ "sub.letter": cls.subclassLetter }],
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
      select: 'name',
    });
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
    subjectIds = subclass.subjects.map((s) => s.subject);
  } else {
    subjectIds = subclass.subjects.map((s) => s.subject);
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
    select: 'name',
  });

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

/**
 * Get Subjects for a Teacher in a specific Class service
 * @param {string} classId - The ID of the ClassLevel
 * @param {string} teacherId - The ID of the Teacher
 * @returns {Array} - List of subjects assigned to the teacher in the class
 * @throws {Error} - If validation fails or class/teacher not found
 */
exports.getTeacherSubjectsByClassService = async (classId, teacherId) => {
  // Validate inputs
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    const error = new Error("Invalid ClassLevel ID");
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    const error = new Error("Invalid Teacher ID");
    error.statusCode = 400;
    throw error;
  }

  // Validate class and teacher existence
  const classLevel = await ClassLevel.findById(classId);
  if (!classLevel) {
    const error = new Error("ClassLevel not found");
    error.statusCode = 404;
    throw error;
  }
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }

  const isNonJSSorSS = ![
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"
  ].includes(classLevel.name);

  let subjectIds = new Set();

  // Collect subject IDs from all subclasses where the teacher is assigned
  classLevel.subclasses.forEach((subclass) => {
    subclass.subjects.forEach((subjectEntry) => {
      if (subjectEntry.teachers.some((t) => t.toString() === teacherId)) {
        subjectIds.add(subjectEntry.subject.toString());
      }
    });
  });

  if (isNonJSSorSS && subjectIds.size > 0) {
    // For non-JSS/SS classes, if the teacher is assigned to any subject, include all subjects
    classLevel.subclasses.forEach((subclass) => {
      subclass.subjects.forEach((subjectEntry) => {
        subjectIds.add(subjectEntry.subject.toString());
      });
    });
    // Also include subjects assigned directly at the class level (for non-SS)
    classLevel.subjects.forEach((subjectId) => {
      subjectIds.add(subjectId.toString());
    });
  }

  if (subjectIds.size === 0) {
    return [];
  }

  // Fetch subjects with populated names
  const subjects = await Subject.find({ _id: { $in: Array.from(subjectIds) } }).populate({
    path: 'name',
    select: 'name',
  });

  return subjects;
};

/**
 * Get Students by Subject for a Class and Subclass service
 * @param {string} classId - The ID of the ClassLevel
 * @param {string} subclassLetter - The subclass letter (e.g., 'A', 'B')
 * @returns {Array} - List of subjects with their enrolled students
 * @throws {Error} - If validation fails or class/subclass not found
 */
exports.getStudentsBySubjectService = async (classId, subclassLetter) => {
  // Validate inputs
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    const error = new Error("Invalid ClassLevel ID");
    error.statusCode = 400;
    throw error;
  }
  if (!subclassLetter || !/^[A-Z]$/.test(subclassLetter)) {
    const error = new Error("Invalid subclass letter");
    error.statusCode = 400;
    throw error;
  }

  // Validate class and subclass
  const classLevel = await ClassLevel.findById(classId);
  if (!classLevel) {
    const error = new Error("ClassLevel not found");
    error.statusCode = 404;
    throw error;
  }
  const subclass = classLevel.subclasses.find((sub) => sub.letter === subclassLetter);
  if (!subclass) {
    const error = new Error(`Subclass ${subclassLetter} does not exist in ${classLevel.name}`);
    error.statusCode = 400;
    throw error;
  }

  const isNonJSSorSS = ![
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"
  ].includes(classLevel.name);

  // Get subject IDs
  let subjectIds = [];
  if (isNonJSSorSS) {
    // For non-JSS/SS, include class-level subjects and subclass subjects
    subjectIds = [
      ...classLevel.subjects.map((s) => s.toString()),
      ...subclass.subjects.map((s) => s.subject.toString()),
    ];
  } else {
    // For JSS/SS, include only subclass subjects
    subjectIds = subclass.subjects.map((s) => s.subject.toString());
  }

  // Remove duplicates
  subjectIds = [...new Set(subjectIds)];

  // Fetch subjects with names
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).populate({
    path: 'name',
    select: 'name',
  });

  // Fetch students enrolled in the class and subclass
  const students = await Student.find({
    classLevelId: classId,
    'currentClassLevel.subclass': subclassLetter,
    isGraduated: false,
    isSuspended: false,
    isWithdrawn: false,
  }).select('firstName lastName studentId email profilePictureUrl boardingStatus religion tribe gender');

  // Map subjects to include their enrolled students
  const result = subjects.map((subject) => ({
    subjectId: subject._id,
    subjectName: subject.name.name,
    students: students.map((student) => ({
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      profilePictureUrl: student.profilePictureUrl,
      boardingStatus: student.boardingStatus,
      religion: student.religion,
      tribe: student.tribe,
      gender: student.gender,
    })),
  }));

  return result;
};



/**
 * Get Subjects by ClassLevel and optional Subclass service
 * @param {Object} data - Contains classLevelId and optional subclassLetter
 * @returns {Array} - List of subjects for the class or subclass
 * @throws {Error} - If validation fails
 */
exports.getSubjectsForSubclassService = async (data = {}) => {
  const { classLevelId, subclassLetter } = data;

  // If no classLevelId, return all subjects
  if (!classLevelId) {
    const subjects = await Subject.find().populate({
      path: "name",
      select: "name",
    });
    console.log(`No classLevelId provided, fetched ${subjects.length} subjects`);
    return subjects;
  }

  // Validate classLevelId
  if (!mongoose.Types.ObjectId.isValid(classLevelId)) {
    const error = new Error("Invalid ClassLevel ID");
    error.statusCode = 400;
    throw error;
  }

  // Fetch ClassLevel
  const classLevel = await ClassLevel.findById(classLevelId);
  if (!classLevel) {
    const error = new Error("ClassLevel not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if class is SS
  const isSSClass = ["SS 1", "SS 2", "SS 3"].includes(classLevel.name);

  // Enforce subclassLetter for SS classes
  if (isSSClass && !subclassLetter) {
    const error = new Error(`Subclass letter required for ${classLevel.name}`);
    error.statusCode = 400;
    throw error;
  }

  let subjectIds = [];

  if (isSSClass) {
    // Validate subclassLetter for SS classes
    const subclass = classLevel.subclasses.find((sub) => sub.letter === subclassLetter);
    if (!subclass) {
      const error = new Error(`Subclass ${subclassLetter} does not exist in ${classLevel.name}`);
      error.statusCode = 400;
      throw error;
    }
    // Get subjects for the specific subclass
    subjectIds = subclass.subjects.map((s) => s.subject);
    console.log(
      `Fetched ${subjectIds.length} subject IDs for ${classLevel.name} subclass ${subclassLetter}`
    );
  } else {
    // For non-SS classes, include subjects from class level and all subclasses
    subjectIds = [
      ...classLevel.subjects.map((s) => s.toString()),
      ...classLevel.subclasses.flatMap((sub) => sub.subjects.map((s) => s.subject.toString())),
    ];
    // Remove duplicates
    subjectIds = [...new Set(subjectIds)];
    console.log(`Fetched ${subjectIds.length} subject IDs for ${classLevel.name} (all subclasses)`);
  }

  if (subjectIds.length === 0) {
    console.log(`No subjects found for ${classLevel.name}${isSSClass ? ` subclass ${subclassLetter}` : ""}`);
    return [];
  }

  // Validate subject IDs
  for (const subjectId of subjectIds) {
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      const error = new Error(`Invalid subject ID: ${subjectId}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Fetch subjects with populated names
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).populate({
    path: "name",
    select: "name",
  });

  return subjects;
};