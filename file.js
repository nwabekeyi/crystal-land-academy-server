const mongoose = require('mongoose');
require('dotenv').config();

const Assignment = require('./models/Academic/assignment.model'); // Adjust path to your model

// Connect to MongoDB
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  clearAssignments();
}).catch((error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
});

// Function to clear assignments
async function clearAssignments() {
  try {
    // Count documents before deletion
    const countBefore = await Assignment.countDocuments();
    console.log(`Number of assignments before deletion: ${countBefore}`);

    // Delete all documents
    await Assignment.deleteMany({});
    console.log('All assignments deleted successfully');

    // Count documents after deletion
    const countAfter = await Assignment.countDocuments();
    console.log(`Number of assignments after deletion: ${countAfter}`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing assignments:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}