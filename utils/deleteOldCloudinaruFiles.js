const cron = require('node-cron');
const mongoose = require('mongoose');
const Assignment = require('../models/Academic/assignment.model');
const { deleteFromCloudinary } = require('../middlewares/fileUpload');

/**
 * Cron job to delete Cloudinary files for submissions viewed more than 3 days ago.
 */
const deleteOldCloudinaryFiles = () => {
  // Schedule to run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running cron job to delete old Cloudinary files...');

    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const assignments = await Assignment.find({
        'submissions.viewed': true,
        'submissions.viewedAt': { $lte: threeDaysAgo },
        'submissions.cloudinaryLink': { $ne: null },
      });

      for (const assignment of assignments) {
        for (const submission of assignment.submissions) {
          if (
            submission.viewed &&
            submission.viewedAt &&
            submission.viewedAt <= threeDaysAgo &&
            submission.cloudinaryLink
          ) {
            try {
              await deleteFromCloudinary(submission.cloudinaryLink);
              submission.cloudinaryLink = null;
              submission.viewed = false;
              submission.viewedAt = null;
            } catch (error) {
              console.error(`Failed to delete Cloudinary file for submission ${submission._id}:`, error.message);
            }
          }
        }
        await assignment.save();
      }

      console.log('Cron job completed: Old Cloudinary files deleted.');
    } catch (error) {
      console.error('Cron job error:', error.message, error.stack);
    }
  });
};

module.exports = deleteOldCloudinaryFiles;