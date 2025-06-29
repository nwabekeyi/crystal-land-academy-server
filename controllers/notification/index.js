const NotificationService = require('../../services/notification');
const responseStatus = require('../../handlers/responseStatus.handler');

class NotificationController {
  static async createNotification(req, res) {
    try {
      const { userId, type, message, metadata } = req.body;
      if (!userId || !type || !message) {
        return responseStatus(res, 400, 'error', 'userId, type, and message are required');
      }

      const notification = await NotificationService.createNotification({
        userId,
        type,
        message,
        metadata,
      });

      return responseStatus(res, 201, 'success', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      });
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message || 'Failed to create notification');
    }
  }

  static async getNotifications(req, res) {
    try {
      const { userId } = req.user; // From authMiddleware
      const { status } = req.query; // Optional: unread/read

      const notifications = await NotificationService.getUserNotifications(userId, status);
      return responseStatus(res, 200, 'success', notifications);
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message || 'Failed to fetch notifications');
    }
  }
}

module.exports = NotificationController;