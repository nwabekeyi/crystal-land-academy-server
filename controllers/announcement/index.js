// controllers/announcement.controller.js
const {
  createGeneralAnnouncement,
  createClassAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
} = require('../../services/announcement');
const responseStatus = require('../../handlers/responseStatus.handler');
const mongoose = require('mongoose');

const createGeneralAnnouncementController = async (req, res) => {
  try {
    const { title, message, date, createdBy } = req.body;
    if (!title || !message || !date || !createdBy) {
      return responseStatus(res, 400, 'error', 'All fields are required, including createdBy');
    }
    if (!mongoose.isValidObjectId(createdBy)) {
      return responseStatus(res, 400, 'error', 'Invalid createdBy ID');
    }
    if (createdBy !== req.userAuth.id) {
      return responseStatus(res, 403, 'error', 'createdBy must match authenticated user');
    }
    const announcement = await createGeneralAnnouncement({ title, message, dueDate: date, createdBy });
    return responseStatus(res, 201, 'success', { announcement });
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

const createClassAnnouncementController = async (req, res) => {
  try {
    const { title, message, date, targets, createdBy } = req.body;
    if (!title || !message || !date || !targets || !createdBy) {
      return responseStatus(res, 400, 'error', 'All fields are required, including targets and createdBy');
    }
    if (!mongoose.isValidObjectId(createdBy)) {
      return responseStatus(res, 400, 'error', 'Invalid createdBy ID');
    }
    if (createdBy !== req.userAuth.id) {
      return responseStatus(res, 403, 'error', 'createdBy must match authenticated user');
    }
    const announcement = await createClassAnnouncement({ title, message, dueDate: date, targets, createdBy });
    return responseStatus(res, 201, 'success', { announcement });
  } catch (error) {
    return responseStatus(res, error.message.includes('not found') ? 404 : 400, 'error', error.message);
  }
};

const updateAnnouncementController = async (req, res) => {
  try {
    const { title, message, date, targets } = req.body;
    const announcement = await updateAnnouncement(
      req.params.id,
      { title, message, dueDate: date, targets },
      req.userAuth
    );
    return responseStatus(res, 200, 'success', { announcement });
  } catch (error) {
    return responseStatus(res, error.message.includes('not found') ? 404 : 400, 'error', error.message);
  }
};

const deleteAnnouncementController = async (req, res) => {
  try {
    const result = await deleteAnnouncement(req.params.id, req.userAuth);
    return responseStatus(res, 200, 'success', result);
  } catch (error) {
    return responseStatus(res, error.message.includes('not found') ? 404 : 400, 'error', error.message);
  }
};

const getAllAnnouncementsController = async (req, res) => {
  try {
    const announcements = await getAllAnnouncements(req.userAuth);
    return responseStatus(res, 200, 'success', announcements);
  } catch (error) {
    return responseStatus(res, 400, 'error', error.message);
  }
};

const getAnnouncementByIdController = async (req, res) => {
  try {
    const announcement = await getAnnouncementById(req.params.id, req.userAuth);
    return responseStatus(res, 200, 'success', announcement);
  } catch (error) {
    return responseStatus(res, error.message.includes('not found') ? 404 : 403, 'error', error.message);
  }
};

module.exports = {
  createGeneralAnnouncementController,
  createClassAnnouncementController,
  updateAnnouncementController,
  deleteAnnouncementController,
  getAllAnnouncementsController,
  getAnnouncementByIdController,
};