const {
  createGeneralAnnouncement,
  createClassAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  getAnnouncementsByClassLevel,
} = require('../../services/announcement'); // Adjust to your services path
const responseStatus = require('../../handlers/responseStatus.handler'); // Adjust to your handlers path

/**
 * Create a general announcement (Admin only).
 */
exports.createGeneralAnnouncementController = async (req, res) => {
  try {
    const { title, message, dueDate } = req.body;
    const createdBy = req.userAuth.id;
    const announcement = await createGeneralAnnouncement({
      title,
      message,
      dueDate,
      createdBy,
    });
    return responseStatus(res, 201, 'success', announcement);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Create a class announcement (Teacher or Admin).
 */
exports.createClassAnnouncementController = async (req, res) => {
  try {
    const { title, message, dueDate, targets } = req.body;
    console.log(req.userAuth)

    const createdBy = req.userAuth.id;
    const announcement = await createClassAnnouncement({
      title,
      message,
      dueDate,
      targets,
      createdBy,
    });
    return responseStatus(res, 201, 'success', announcement);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Update an announcement (Admin or creator).
 */
exports.updateAnnouncementController = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.userAuth;
    const announcement = await updateAnnouncement(id, req.body, user);
    return responseStatus(res, 200, 'success', announcement);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Delete an announcement (Admin or creator).
 */
exports.deleteAnnouncementController = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.userAuth;
    const result = await deleteAnnouncement(id, user);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Get all announcements accessible to the user.
 */
exports.getAllAnnouncementsController = async (req, res) => {
  try {
    const user = req.userAuth;
    const announcements = await getAllAnnouncements(user);
    return responseStatus(res, 200, 'success', announcements);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Get a single announcement by ID.
 */
exports.getAnnouncementByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.userAuth;
    const announcement = await getAnnouncementById(id, user);
    return responseStatus(res, 200, 'success', announcement);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};

/**
 * Get announcements by class level and optional subclass (Admin, Teacher, or Student).
 */
exports.getAnnouncementsByClassLevelController = async (req, res) => {
  try {
    const { classLevelId, subclass } = req.query;
    const user = req.userAuth;
    const announcements = await getAnnouncementsByClassLevel({ classLevelId, subclass }, user);
    return responseStatus(res, 200, 'success', announcements);
  } catch (error) {
    return responseStatus(res, 400, 'failed', error.message);
  }
};