const mongoose = require('mongoose');
const Assignment = require('./models/Academic/assignment.model');
const Subject = require('./models/Academic/subject.model');

// Replace with your MongoDB connection string
const MONGO_URI = 'mongodb+srv://chidi90simeon:j1CgIQu1lweMdmde@cluster0.ggmg0ex.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Optional: Define a default Subject ID for assignments where no matching subject is found
const DEFAULT_SUBJECT_ID = '6881fa8804e98ab401cc75f0'; // Replace with a valid Subject ID

async function migrateAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Fetch all assignments
    const assignments = await Assignment.find({}).select('id teacherId classLevelId subclass');

    if (!assignments.length) {
      console.log('No assignments found to migrate.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const assignmentsNeedingManualReview = [];

    for (const assignment of assignments) {
      try {
        // Find a subject where the teacher is authorized for the classLevelId and subclass (if applicable)
        const subjectQuery = {
          'classLevelSubclasses.classLevel': assignment.classLevelId,
          'classLevelSubclasses.teachers': assignment.teacherId,
        };

        if (assignment.subclass) {
          subjectQuery['classLevelSubclasses.subclassLetter'] = {
            $in: [assignment.subclass, null], // Allow subjects without subclassLetter or matching subclass
          };
        }

        const subject = await Subject.findOne(subjectQuery).select('_id');

        if (!subject) {
          console.warn(
            `No matching subject found for assignment ${assignment.id} (teacherId: ${assignment.teacherId}, classLevelId: ${assignment.classLevelId}, subclass: ${assignment.subclass || 'none'})`
          );
          assignmentsNeedingManualReview.push({
            assignmentId: assignment.id,
            teacherId: assignment.teacherId,
            classLevelId: assignment.classLevelId,
            subclass: assignment.subclass,
          });
          // Option 1: Skip and handle manually
          skippedCount++;
          continue;

          // Option 2: Assign default subject (uncomment to use)
          // assignment.subjectId = new mongoose.Types.ObjectId(DEFAULT_SUBJECT_ID);
        } else {
          assignment.subjectId = subject._id;
        }

        // Update the assignment with the subjectId
        await Assignment.updateOne(
          { _id: assignment._id },
          { $set: { subjectId: assignment.subjectId } },
          { runValidators: true }
        );

        console.log(`Updated assignment ${assignment.id} with subjectId ${assignment.subjectId}`);
        updatedCount++;
      } catch (error) {
        console.error(
          `Error updating assignment ${assignment.id}: ${error.message}`,
          error.stack
        );
        assignmentsNeedingManualReview.push({
          assignmentId: assignment.id,
          teacherId: assignment.teacherId,
          classLevelId: assignment.classLevelId,
          subclass: assignment.subclass,
          error: error.message,
        });
        skippedCount++;
      }
    }

    console.log(`Migration complete:`);
    console.log(`- Updated ${updatedCount} assignments`);
    console.log(`- Skipped ${skippedCount} assignments`);

    if (assignmentsNeedingManualReview.length) {
      console.log('Assignments needing manual review:');
      console.table(assignmentsNeedingManualReview);
    }

  } catch (error) {
    console.error('Migration error:', error.message, error.stack);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateAssignments().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});