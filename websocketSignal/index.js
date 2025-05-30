const WebSocket = require('ws');
const { handleMessage, handleDisconnection } = require('./messageSignal');
const { handleVideoStream } = require('./videoSignal');
const { watchAndSendUsers } = require('./dashboardData/adminsController/watchUsersCollections');
const { watchCourse } = require('./dashboardData/adminsController/watchCoursesCollection');

let clients = new Map();  // Map to store connected clients with userId and role

function websocketSignal(server) {
  const wss = new WebSocket.Server({ server });  // Attach WebSocket to the HTTP server

  wss.on('connection', (ws, req) => {
    console.log('A new client connected');

    // Expect the client to send their userId and role upon connection
    ws.on('message', async (message) => {
      const data = JSON.parse(message);
      const { action, userId, role } = data;
      console.log({role, userId})

      if (!userId || !role) {
        console.error('Missing userId or role in connection message');
        return;
      }

      // Store client info in the clients Map
      clients.set(`${userId}_${role}`, ws);
      console.log(`Stored client with userId: ${userId} and role: ${role}`);

      // Handle messaging-related logic
      if (action === 'sendMessage') {
        await handleMessage(ws, data);
      }

      // Handle video streaming-related logic
      if (action === 'startStream' || action === 'endStream') {
        handleVideoStream(ws, data);
      }

      // Handle fetchAllUsers logic
      if (action === 'watch users') {
        watchAndSendUsers(clients);
        console.log('watching users...');
      }

      // Handle watch courses logic
      if (action === 'watch courses') {
        watchCourse(ws);
        console.log('watching courses...');
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      // Find and remove the client from the Map based on their userId and role
      for (let [key, client] of clients) {
        if (client === ws) {
          clients.delete(key);
          console.log(`Removed client with id: ${key}`);
          break;
        }
      }
      handleDisconnection(ws);
    });
  });
}

module.exports = { websocketSignal };
