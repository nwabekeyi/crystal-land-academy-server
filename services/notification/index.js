const Notification = require('../../models/Notification');

class NotificationService {
  static async createNotification({ userId, type, message, metadata = {} }) {
    // Validate inputs
    if (!userId || !type || !message) {
      throw new Error('userId, type, and message are required');
    }
    if (!['success', 'error', 'info', 'warning'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    // Set expiry (30 days)
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() + 1); // Adjust for WAT (UTC+1)
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(createdAt.getDate() + 30);

    // Create notification
    const notification = new Notification({
      userId,
      type,
      message,
      createdAt,
      expiresAt,
      metadata,
    });

    await notification.save();
    return notification;
  }

  static async getUserNotifications(userId, status = null) {
    // Validate userId
    if (!userId) {
      throw new Error('userId is required');
    }

    // Build query
    const query = { userId, expiresAt: { $gt: new Date() } };
    if (status) {
      query.status = status; // Filter by unread/read
    }

    // Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .select('type message status createdAt metadata');

    return notifications;
  }
}

module.exports = NotificationService;