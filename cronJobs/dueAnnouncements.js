// cron/deleteExpiredAnnouncements.js
const cron = require('node-cron');
const Announcement = require('../models/announcement');


const deleteExpiredAnnouncements = () => {

// Run daily at midnight (WAT)
cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();
    await Announcement.deleteMany({
      dueDate: { $lt: currentDate },
    });
    console.log('Expired announcements deleted successfully');
  } catch (error) {
    console.error('Error deleting expired announcements:', error);
  }
}, {
  timezone: 'Africa/Lagos', // WAT timezone
});

}

module.exports = deleteExpiredAnnouncements;