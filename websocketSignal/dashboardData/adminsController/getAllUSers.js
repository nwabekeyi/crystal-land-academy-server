// adminController.js
const { fetchAllUsers, watchAndSendUpdates } = require('./databaseWatch');

// WebSocket handler for admin data
const getAllUsers = async (ws) => {
  try {
    // Fetch and send initial users data
    const initialUsers = await fetchAllUsers();
    ws.send(JSON.stringify({ action: 'initialData', users: initialUsers }));

    // Now start watching for changes in the MongoDB collections and send updates
    watchAndSendUpdates(ws);
    console.log('sent initial users and watching')

  } catch (error) {
    console.error('Error fetching data or streaming events:', error);
    ws.send(JSON.stringify({ action: 'error', message: 'Server Error' }));
  }
};

module.exports = { getAllUsers };
