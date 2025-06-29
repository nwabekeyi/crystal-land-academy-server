// services/announcement.js
const Announcement = require('../../models/announcement');
const ClassLevel = require('../../models/Academic/class.model');

const createGeneralAnnouncement = async (data) => {
  const { title, message, dueDate, createdBy } = data;
  if (!title || !message || !dueDate || !createdBy) {
    throw new Error('All fields are required, including createdBy');
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

const createClassAnnouncement = async (data) => {
  const { title, message, dueDate, targets, createdBy } = data;
  if (!title || !message || !dueDate || !targets || !Array.isArray(targets) || !createdBy) {
    throw new Error('All fields are required, including valid targets and createdBy');
  }

  for (const target of targets) {
    const { classLevel, subclass } = target;
    if (!classLevel || !subclass) {
      throw new Error('ClassLevel and subclass are required in targets');
    }

    const classData = await ClassLevel.findById(classLevel);
    if (!classData) {
      throw new Error(`ClassLevel ${classLevel} not found`);
    }
    const subclassExists = classData.subclasses.some((sub) => sub.letter === subclass);
    if (!subclassExists) {
      throw new Error(`Subclass ${subclass} not found in ClassLevel ${classLevel}`);
    }

    const isAssigned = classData.teachers.some(
      (teacher) => teacher.teacherId.toString() === createdBy.toString()
    );
    if (!isAssigned) {
      throw new Error(`You are not assigned to teach ClassLevel ${classLevel}`);
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
    for (const target of targets) {
      const { classLevel, subclass } = target;
      if (!classLevel || !subclass) {
        throw new Error('ClassLevel and subclass are required in targets');
      }

      const classData = await ClassLevel.findById(classLevel);
      if (!classData) {
        throw new Error(`ClassLevel ${classLevel} not found`);
      }
      const subclassExists = classData.subclasses.some((sub) => sub.letter === subclass);
      if (!subclassExists) {
        throw new Error(`Subclass ${subclass} not found in ClassLevel ${classLevel}`);
      }

      if (user.role !== 'Admin') {
        const isAssigned = classData.teachers.some(
          (teacher) => teacher.teacherId.toString() === user._id.toString()
        );
        if (!isAssigned) {
          throw new Error(`You are not assigned to teach ClassLevel ${classLevel}`);
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

const getAllAnnouncements = async (user) => {
  let query = {};
  if (user.role === 'Teacher' || user.role === 'Student') {
    query = {
      $or: [
        { type: 'general' },
        { 'targets.classLevel': { $in: user.classLevels || [] } },
      ],
    };
  }
  const announcements = await Announcement.find(query)
    .populate('createdBy', 'name')
    .populate('targets.classLevel', 'section name')
    .sort({ createdAt: -1 });
  return announcements;
};

const getAnnouncementById = async (id, user) => {
  const announcement = await Announcement.findById(id)
    .populate('createdBy', 'name')
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
  return announcement;
};

module.exports = {
  createGeneralAnnouncement,
  createClassAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
};