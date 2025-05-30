const { Admin, SuperAdmin, Student, Instructor } = require('../../../models/schema/onlineUsers');
const { sendNotification } = require('../../utils');

// Function to fetch users registered in the past 24 hours
const fetchUsersRegisteredIn24Hrs = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // Get date 24 hours ago
  const studentsIn24Hrs = await Student.countDocuments({ createdAt: { $gte: oneDayAgo } });
  return studentsIn24Hrs;
};

// Function to fetch all users
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

  const studentsIn24Hrs = await fetchUsersRegisteredIn24Hrs();

  // Return both the separated users by role and the 24-hour counts
  return { allUsersData, studentsIn24Hrs };
};

// Function to watch changes in the collections and send updates to WebSocket clients
const watchAndSendUsers = (wsClient) => {
  const models = ['Admin', 'SuperAdmin', 'Student', 'Instructor'];

  models.forEach((modelName) => {
    const Model = require('../../../models/schema/onlineUsers')[modelName];
    if (!Model) {
      console.error(`Model for ${modelName} not found`);
      return;
    }

    const changeStream = Model.watch();
    changeStream.on('change', async (change) => {
      try {
        // Fetch updated user data
        const updatedUsers = await fetchAllUsers();

        // Send updated data along with student/instructor counts to the WebSocket client
        wsClient.send(JSON.stringify({
          action: 'updateUsers',
          data: updatedUsers,
        }));

        // If a new user is added, send notifications to admins and superadmins
        if (change.operationType === 'insert') {
          const newUser = change.fullDocument;
          
          // Create a detailed message for the new user
          let userDetails = `First Name: ${newUser.firstName}, Last Name: ${newUser.lastName}, UserID: ${newUser._id}, Role: ${newUser.role}`;
          
          // Include program information for Student or Instructor roles
          if (newUser.role === 'Student' || newUser.role === 'Instructor') {
            userDetails += `, Program: ${newUser.program || 'N/A'}`;
          }

          // Send notification with user details to admins and superadmins
          const adminUsers = await Admin.find();
          const superAdminUsers = await SuperAdmin.find();

          // Collect all admin and superadmin userIds as recipients
          const allAdmins = [...adminUsers, ...superAdminUsers];
          const adminAndSuperAdminIds = allAdmins.map(user => user.userId);

          // Send notification via WebSocket to admins and superadmins
          await sendNotification({
            recipients: allAdmins,
            message: `A new user has registered: ${userDetails}`,
            type: 'info',
            priority: 'medium',
            actionLink: '', // Optional action link
            wsClient, // Pass the WebSocket client
          });

          // Optionally, return the list of admin and superadmin userIds
          return adminAndSuperAdminIds;
        }
      } catch (error) {
        console.error('Error fetching updated users:', error);
        wsClient.send(JSON.stringify({ action: 'error', message: 'Failed to fetch updated data' }));
      }
    });

    changeStream.on('error', (error) => {
      console.error(`Change stream error for ${modelName}:`, error);
      wsClient.send(JSON.stringify({ action: 'error', message: 'Change stream error' }));
    });
  });
};

module.exports = { watchAndSendUsers };
