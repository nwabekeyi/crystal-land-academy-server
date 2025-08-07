const Announcement = require('../../models/announcement');
const ClassLevel = require('../../models/Academic/class.model');
const Teacher = require('../../models/Staff/teachers.model');
const mongoose = require('mongoose');

/**
 * Create a general announcement (visible to all).
 * @param {Object} data - The announcement data.
 * @returns {Promise<Object>} - The created announcement.
 */
const createGeneralAnnouncement = async (data) => {
  const { title, message, dueDate, createdBy } = data;
  if (!title || !message || !dueDate || !createdBy) {
    throw new Error('All fields are required: title, message, dueDate, createdBy');
  }

  const announcement = new Announcement({
    title,
    message,
    dueDate,
    createdBy,
    type: 'general',
    targets: [],
  });

  await announcement.save();
  return announcement;
};

/**
 * Create a class announcement targeting specific class levels and subclasses.
 * @param {Object} data - The announcement data with classLevel and subclass targets.
 * @returns {Promise<Object>} - The created announcement.
 */
const createClassAnnouncement = async (data) => {
  const { title, message, dueDate, targets, createdBy } = data;

  // Validate input
  if (!title || !message || !dueDate || !targets || !Array.isArray(targets) || !createdBy) {
    throw new Error('All fields are required: title, message, dueDate, targets (array), createdBy');
  }
  if (targets.length === 0) {
    throw new Error('At least one target (classLevel and subclass) is required');
  }

  // Validate each target
  for (const target of targets) {
    const { classLevel, subclass } = target;
    if (!classLevel || !subclass) {
      throw new Error('Each target must include classLevel and subclass');
    }
    if (!mongoose.Types.ObjectId.isValid(classLevel)) {
      throw new Error(`Invalid classLevel ObjectId: ${classLevel}`);
    }

    const classData = await ClassLevel.findById(classLevel);
    if (!classData) {
      throw new Error(`ClassLevel ${classLevel} not found`);
    }
    const subclassExists = classData.subclasses.some((sub) => sub.letter === subclass);
    if (!subclassExists) {
      throw new Error(`Subclass ${subclass} not found in ClassLevel ${classData.name}`);
    }

    // Check if the teacher is assigned to the classLevel
    const isAssigned = classData.teachers.some(
      (teacher) => teacher.teacherId.toString() === createdBy.toString()
    );
    if (!isAssigned) {
      throw new Error(`You are not assigned to teach ClassLevel ${classData.name}`);
    }
  }

  const announcement = new Announcement({
    title,
    message,
    dueDate,
    createdBy,
    type: 'class',
    targets,
  });

  await announcement.save();
  return announcement;
};

/**
 * Update an existing announcement.
 * @param {string} id - The announcement ID.
 * @param {Object} data - The updated announcement data.
 * @param {Object} user - The user making the update.
 * @returns {Promise<Object>} - The updated announcement.
 */
const updateAnnouncement = async (id, data, user) => {
  const { title, message, dueDate, targets } = data;
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Check permissions
  if (user.role !== 'Admin' && announcement.createdBy.toString() !== user._id.toString()) {
    throw new Error('You can only update your own announcements');
  }

  // Validate targets for class announcements
  if (announcement.type === 'class' && targets && Array.isArray(targets)) {
    if (targets.length === 0) {
      throw new Error('At least one target (classLevel and subclass) is required for class announcements');
    }
    for (const target of targets) {
      const { classLevel, subclass } = target;
      if (!classLevel || !subclass) {
        throw new Error('Each target must include classLevel and subclass');
      }
      if (!mongoose.Types.ObjectId.isValid(classLevel)) {
        throw new Error(`Invalid classLevel ObjectId: ${classLevel}`);
      }

      const classData = await ClassLevel.findById(classLevel);
      if (!classData) {
        throw new Error(`ClassLevel ${classLevel} not found`);
      }
      const subclassExists = classData.subclasses.some((sub) => sub.letter === subclass);
      if (!subclassExists) {
        throw new Error(`Subclass ${subclass} not found in ClassLevel ${classData.name}`);
      }

      if (user.role !== 'Admin') {
        const isAssigned = classData.teachers.some(
          (teacher) => teacher.teacherId.toString() === user._id.toString()
        );
        if (!isAssigned) {
          throw new Error(`You are not assigned to teach ClassLevel ${classData.name}`);
        }
      }
    }
    announcement.targets = targets;
  } else if (announcement.type === 'general' && targets && targets.length > 0) {
    throw new Error('General announcements cannot have targets');
  }

  // Update fields if provided
  if (title) announcement.title = title;
  if (message) announcement.message = message;
  if (dueDate) announcement.dueDate = dueDate;

  await announcement.save();
  return announcement;
};

/**
 * Delete an announcement.
 * @param {string} id - The announcement ID.
 * @param {Object} user - The user requesting deletion.
 * @returns {Promise<Object>} - Deletion confirmation.
 */
const deleteAnnouncement = async (id, user) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error('Announcement not found');
  }

  // Check permissions
  if (user.role !== 'Admin' && announcement.createdBy.toString() !== user._id.toString()) {
    throw new Error('You can only delete your own announcements');
  }

  await announcement.deleteOne();
  return { message: 'Announcement deleted successfully' };
};

/**
 * Get all general announcements.
 * @param {Object} user - The user requesting announcements.
 * @returns {Promise<Array>} - List of general announcements.
 */
const getAllAnnouncements = async (user) => {
  const query = { type: 'general' }; // Only fetch general announcements

  const announcements = await Announcement.find(query)
    .populate('targets.classLevel', 'section name')
    .sort({ createdAt: -1 });

  // Transform response to include createdByName by querying Teacher model
  const transformedAnnouncements = await Promise.all(
    announcements.map(async (announcement) => {
      let createdByName = 'Unknown Teacher';
      if (announcement.createdBy && mongoose.Types.ObjectId.isValid(announcement.createdBy)) {
        const teacher = await Teacher.findById(announcement.createdBy).select('firstName lastName');
        if (teacher) {
          createdByName = `${teacher.firstName} ${teacher.lastName}`.trim();
        }
      }

      return {
        _id: announcement._id,
        title: announcement.title,
        message: announcement.message,
        dueDate: announcement.dueDate,
        createdByName,
        type: announcement.type,
        targets: announcement.targets,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
      };
    })
  );

  return transformedAnnouncements;
};

/**
 * Get a single announcement by ID.
 * @param {string} id - The announcement ID.
 * @param {Object} user - The user requesting the announcement.
 * @returns {Promise<Object>} - The announcement.
 */
const getAnnouncementById = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid announcement ID');
  }
  const announcement = await Announcement.findById(id)
    .populate('targets.classLevel', 'section name');
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  if (
    user.role !== 'Admin' &&
    announcement.type === 'class' &&
    !announcement.targets.some(
      (target) => user.classLevels && user.classLevels.includes(target.classLevel.toString())
    )
  ) {
    throw new Error('Access denied to this announcement');
  }

  // Fetch teacher name from Teacher model
  let createdByName = 'Unknown Teacher';
  if (announcement.createdBy && mongoose.Types.ObjectId.isValid(announcement.createdBy)) {
    const teacher = await Teacher.findById(announcement.createdBy).select('firstName lastName');
    if (teacher) {
      createdByName = `${teacher.firstName} ${teacher.lastName}`.trim();
    }
  }

  return {
    _id: announcement._id,
    title: announcement.title,
    message: announcement.message,
    dueDate: announcement.dueDate,
    createdByName,
    type: announcement.type,
    targets: announcement.targets,
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
  };
};

/**
 * Get announcements targeting a specific class level and optionally subclass.
 * @param {Object} params - Parameters including classLevelId and optional subclass.
 * @param {Object} user - The user requesting announcements.
 * @returns {Promise<Array>} - List of announcements with teacher names.
 */
const getAnnouncementsByClassLevel = async (params, user) => {
  const { classLevelId, subclass } = params;

  // Validate classLevelId
  if (!mongoose.Types.ObjectId.isValid(classLevelId)) {
    throw new Error('Invalid classLevelId format');
  }

  // Validate classLevel exists
  const classData = await ClassLevel.findById(classLevelId);
  if (!classData) {
    throw new Error(`ClassLevel ${classLevelId} not found`);
  }

  // Validate subclass if provided
  if (subclass) {
    const subclassExists = classData.subclasses.some((sub) => sub.letter === subclass);
    if (!subclassExists) {
      throw new Error(`Subclass ${subclass} not found in ClassLevel ${classData.name}`);
    }
  }

  // Build query
  const query = {
    type: 'class',
    'targets.classLevel': classLevelId,
  };
  if (subclass) {
    query['targets.subclass'] = subclass;
  }

  const announcements = await Announcement.find(query)
    .populate('targets.classLevel', 'section name')
    .sort({ createdAt: -1 });

  // Transform response to include createdByName by querying Teacher model
  const transformedAnnouncements = await Promise.all(
    announcements.map(async (announcement) => {
      let createdByName = 'Unknown Teacher';
      if (announcement.createdBy && mongoose.Types.ObjectId.isValid(announcement.createdBy)) {
        const teacher = await Teacher.findById(announcement.createdBy).select('firstName lastName');
        if (teacher) {
          createdByName = `${teacher.firstName} ${teacher.lastName}`.trim();
        }
      }

      return {
        _id: announcement._id,
        title: announcement.title,
        message: announcement.message,
        dueDate: announcement.dueDate,
        createdByName,
        type: announcement.type,
        targets: announcement.targets,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
      };
    })
  );

  return transformedAnnouncements;
};

module.exports = {
  createGeneralAnnouncement,
  createClassAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getAnnouncementsByClassLevel,
};