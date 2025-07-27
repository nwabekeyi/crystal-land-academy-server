// services/academic/curriculum.service.js
const Curriculum = require("../../models/Academic/curriculum.model");
const Subject = require("../../models/Academic/subject.model");
const mongoose = require("mongoose");
const responseStatus = require("../../handlers/responseStatus.handler");

exports.createCurriculumService = async (data, res) => {
  const { subjectId, classLevelId, topics } = data;

  const curriculumFound = await Curriculum.findOne({ subjectId, classLevelId });
  if (curriculumFound) {
    return responseStatus(res, 402, "failed", "Curriculum already exists for this subject and class");
  }

  const curriculumCreated = await Curriculum.create({
    subjectId,
    classLevelId,
    topics,
  });

  const populatedCurriculum = await Curriculum.findById(curriculumCreated._id)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", populatedCurriculum);
};

exports.getAllCurriculaService = async (query, res) => {
  const { classLevelId, subjectId } = query;
  const filter = {};

  if (classLevelId) filter.classLevelId = classLevelId;
  if (subjectId) filter.subjectId = subjectId;

  if (classLevelId && subjectId) {
    const subject = await Subject.findById(subjectId).populate('classLevelSubclasses.classLevel');
    if (!subject) {
      return responseStatus(res, 404, "failed", "Subject not found");
    }

    const isValidClassLevel = subject.classLevelSubclasses.some(cls => 
      cls.classLevel._id.toString() === classLevelId.toString()
    );

    if (!isValidClassLevel) {
      return responseStatus(res, 400, "failed", "Subject is not associated with the specified class level");
    }
  }

  const curricula = await Curriculum.find(filter)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", curricula);
};

exports.getCurriculumByIdService = async (id) => {
  return await Curriculum.findById(id)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');
};

exports.updateCurriculumService = async (data, id, res) => {
  const { subjectId, classLevelId, topics } = data;

  const curriculumFound = await Curriculum.findOne({
    subjectId,
    classLevelId,
    _id: { $ne: id },
  });
  if (curriculumFound) {
    return responseStatus(res, 402, "failed", "Curriculum already exists for this subject and class");
  }

  const curriculum = await Curriculum.findByIdAndUpdate(
    id,
    {
      subjectId,
      classLevelId,
      topics,
      updatedAt: Date.now(),
    },
    { new: true }
  )
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  return responseStatus(res, 200, "success", curriculum);
};

exports.deleteCurriculumService = async (id, res) => {
  const curriculum = await Curriculum.findByIdAndDelete(id);
  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  return responseStatus(res, 200, "success", "Curriculum deleted");
};

exports.addTopicToCurriculumService = async (curriculumId, topicData, res) => {
  const curriculum = await Curriculum.findById(curriculumId);
  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  curriculum.topics.push(topicData);
  await curriculum.save();

  const updatedCurriculum = await Curriculum.findById(curriculumId)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", updatedCurriculum);
};

exports.updateTopicInCurriculumService = async (curriculumId, topicId, topicData, res) => {
  const curriculum = await Curriculum.findById(curriculumId);
  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  const topic = curriculum.topics.id(topicId);
  if (!topic) {
    return responseStatus(res, 404, "failed", "Topic not found");
  }

  topic.set(topicData);
  await curriculum.save();

  const updatedCurriculum = await Curriculum.findById(curriculumId)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", updatedCurriculum);
};

exports.removeTopicFromCurriculumService = async (curriculumId, topicId, res) => {
  const curriculum = await Curriculum.findById(curriculumId);
  if (!curriculum) {
    return responseStatus(res, 404, "failed", "Curriculum not found");
  }

  const topic = curriculum.topics.id(topicId);
  if (!topic) {
    return responseStatus(res, 404, "failed", "Topic not found");
  }

  curriculum.topics.pull(topicId);
  await curriculum.save();

  const updatedCurriculum = await Curriculum.findById(curriculumId)
    .populate('subjectId', 'name')
    .populate('classLevelId', 'name');

  return responseStatus(res, 200, "success", updatedCurriculum);
};

exports.markTopicAsCompletedService = async (curriculumId, topicId, res) => {
  try {
    const curriculum = await Curriculum.findById(curriculumId);
    if (!curriculum) {
      return responseStatus(res, 404, "failed", "Curriculum not found");
    }

    const topic = curriculum.topics.id(topicId);
    if (!topic) {
      return responseStatus(res, 404, "failed", "Topic not found");
    }

    // Mark topic as completed
    topic.isCompleted = true;

    // Calculate completion rate: (completed topics / total topics) * 100
    const totalTopics = curriculum.topics.length;
    const completedTopics = curriculum.topics.filter(t => t.isCompleted).length;
    curriculum.completionRate = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

    // Save the updated curriculum
    await curriculum.save();

    // Populate subjectId and classLevelId for response
    const updatedCurriculum = await Curriculum.findById(curriculumId)
      .populate('subjectId', 'name')
      .populate('classLevelId', 'name');

    return responseStatus(res, 200, "success", updatedCurriculum);
  } catch (error) {
    return responseStatus(res, 500, "failed", error.message);
  }
};

exports.getCurriculaForTeacherService = async (teacherId, res) => {
  try {
    const teacher = await mongoose.model('Teacher').findById(teacherId).populate('subject');
    if (!teacher) {
      return responseStatus(res, 404, "failed", "Teacher not found");
    }

    const subjectIds = teacher.subject.map(sub => sub._id);

    const curricula = await Curriculum.find({ subjectId: { $in: subjectIds } })
      .populate('subjectId', 'name')
      .populate('classLevelId', 'name');

      // console.log(curricula);

    // const validCurricula = [];
    // for (const curriculum of curricula) {
    //   const subject = await Subject.findById(curriculum.subjectId);
    //   const isValid = subject.classLevelSubclasses.some(cls =>
    //     cls.classLevel.toString() === curriculum.classLevelId.toString()
    //   );
    //   if (isValid) {
    //     validCurricula.push(curriculum);
    //   }
    // }

    return responseStatus(res, 200, "success", curricula);
  } catch (error) {
    return responseStatus(res, 500, "failed", error.message);
  }
};

exports.getCurriculaForStudentService = async (classLevelId, res) => {
  try {
    // Validate classLevelId
    const classLevel = await mongoose.model('ClassLevel').findById(classLevelId);
    if (!classLevel) {
      return responseStatus(res, 404, "failed", "Class level not found");
    }

    // Find all subjects associated with the class level
    const subjects = await Subject.find({
      'classLevelSubclasses.classLevel': classLevelId,
    }).select('_id');

    const subjectIds = subjects.map(sub => sub._id);

    // Find all curricula for the class level and associated subjects
    const curricula = await Curriculum.find({
      classLevelId,
      subjectId: { $in: subjectIds },
    })
      .populate('subjectId', 'name')
      .populate('classLevelId', 'name');

    return responseStatus(res, 200, "success", curricula);
  } catch (error) {
    return responseStatus(res, 500, "failed", error.message);
  }
};