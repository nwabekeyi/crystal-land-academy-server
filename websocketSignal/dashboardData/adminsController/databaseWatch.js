const { Admin, SuperAdmin, Student, Instructor } = require('../../../models/schema/onlineUsers');

// Function to fetch users registered in the past 24 hours
const fetchUsersRegisteredIn24Hrs = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // Get date 24 hours ago

  // Fetch students and instructors registered in the last 24 hours
  const studentsIn24Hrs= await Promise.all([
    Student.countDocuments({ createdAt: { $gte: oneDayAgo } }),
  ]);

  return studentsIn24Hrs;
};

// Function to fetch all users from different roles
const fetchAllUsers = async () => {
  const allUsersData = {
    Admin: [],
    SuperAdmin: [],
    Student: [],
    Instructor: []
  };

  const models = { Admin, SuperAdmin, Student, Instructor };

  for (const [role, model] of Object.entries(models)) {
    const users = await model.find();
    allUsersData[role] = users.map(user => ({ ...user.toObject(), role }));
  }

  const studentsIn24Hrs= await fetchUsersRegisteredIn24Hrs();

  // Return both the separated users by role and the 24-hour counts
  return { allUsersData, studentsIn24Hrs};
};

// Function to watch changes in the collections and send updates to WebSocket clients
const watchAndSendUpdates = (ws) => {
  const models = ['Admin', 'SuperAdmin', 'Student', 'Instructor'];

  models.forEach((modelName) => {
    const Model = require('../../../models/schema/onlineUsers')[modelName];
    if (!Model) {
      console.error(`Model for ${modelName} not found`);
      return;
    }

    const changeStream = Model.watch();
    changeStream.on('change', async () => {
      try {
        const updatedUsers = await fetchAllUsers();

        // Send updated data along with student/instructor counts to the WebSocket client
        ws.send(JSON.stringify({
          action: 'updateUsers',
          data: updatedUsers,
        }));
      } catch (error) {
        console.error('Error fetching updated users:', error);
        ws.send(JSON.stringify({ action: 'error', message: 'Failed to fetch updated data' }));
      }
    });

    changeStream.on('error', (error) => {
      console.error(`Change stream error for ${modelName}:`, error);
      ws.send(JSON.stringify({ action: 'error', message: 'Change stream error' }));
    });
  });
};

module.exports = { fetchAllUsers, watchAndSendUpdates };
