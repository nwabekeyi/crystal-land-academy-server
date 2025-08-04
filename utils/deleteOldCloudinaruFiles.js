const cron = require('node-cron');
const mongoose = require('mongoose');
const Assignment = require('../models/Academic/assignment.model');
const { deleteFromCloudinary } = require('../middlewares/fileUpload');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crystal-land-academy';

/**
 * Cron job to delete Cloudinary files for submissions with deletionScheduledAt in the past.
 */
const deleteOldCloudinaryFiles = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running cron job to delete old Cloudinary files...');

    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB');

      const now = new Date();
      const assignments = await Assignment.find({
        'submissions.deletionScheduledAt': { $lte: now, $ne: null },
        'submissions.cloudinaryLink': { $ne: null },
      });

      for (const assignment of assignments) {
        let updated = false;
        for (const submission of assignment.submissions) {
          if (
            submission.deletionScheduledAt &&
            submission.deletionScheduledAt <= now &&
            submission.cloudinaryLink
          ) {
            try {
              const publicId = submission.cloudinaryLink.split('/').pop().split('.')[0];
              await deleteFromCloudinary(`assignments/${publicId}`);
              console.log(`Deleted Cloudinary file: ${publicId}`);
              submission.cloudinaryLink = null;
              submission.deletionScheduledAt = null;
              updated = true;
            } catch (error) {
              console.error(`Failed to delete Cloudinary file for submission ${submission._id}:`, error.message);
            }
          }
        }
        if (updated) {
          await assignment.save();
          console.log(`Updated assignment ${assignment.id}`);
        }
      }

      console.log('Cron job completed: Old Cloudinary files deleted.');
    } catch (error) {
      console.error('Cron job error:', error.message, error.stack);
    } finally {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  });
};

module.exports = deleteOldCloudinaryFiles;