// messageSignal.js
const { getModelByRole } = require('../controller/onlinUsers/utils');

let clients = {};  // Store connected clients

// Handle incoming messages related to user communication
async function handleMessage(ws, data) {
  const { userId, role, action, content, recipientId } = data;

  try {
    // Use the role to get the correct model and fetch the user from the database
    const Model = getModelByRole(role);
    const user = await Model.findOne({ userId });

    if (user) {
      // Store the WebSocket client based on the userId
      clients[userId] = ws;
      console.log(`User ${userId} with role ${role} connected`);

      if (action === 'sendMessage' && recipientId) {
        // Get the recipient's model based on the userId
        const recipient = await Model.findOne({ userId: recipientId });

        if (recipient) {
          // Create the message object and push it to sender and receiver messages
          const timestamp = new Date().toISOString();
          const newMessage = {
            delivered: false,
            isSentByUser: true,
            message: content,
            read: false,
            receiver: { userId: recipient.userId, role: recipient.role },
            sender: { userId: user.userId, role: user.role },
            timestamp
          };

          user.messages.push(newMessage);
          recipient.messages.push(newMessage);

          // Save both sender's and receiver's updated message arrays
          await user.save();
          await recipient.save();

          // Send confirmation to the sender
          ws.send(JSON.stringify({ action: 'sendMessage', status: 'success', message: 'Message sent successfully!' }));

          // Send the message to the recipient
          if (clients[recipientId]) {
            clients[recipientId].send(JSON.stringify({
              action: 'newMessage',
              message: 'You have a new message',
              content: newMessage
            }));
          } else {
            console.log(`Recipient ${recipientId} not connected via WebSocket`);
          }
        } else {
          // Recipient not found
          ws.send(JSON.stringify({ action: 'sendMessage', status: 'error', message: 'Recipient not found!' }));
        }
      }
    } else {
      // User not found, send an error and close connection
      ws.send(JSON.stringify({ message: 'User not found!' }));
      ws.close();
    }
  } catch (error) {
    console.error('Error processing WebSocket message:', error);
    ws.send(JSON.stringify({ action: 'error', message: 'Error processing your request' }));
    ws.close();
  }
}

// Handle WebSocket disconnection
function handleDisconnection(ws) {
  for (let userId in clients) {
    if (clients[userId] === ws) {
      // Remove disconnected client from the map
      delete clients[userId];
      console.log(`User ${userId} disconnected`);
      break;
    }
  }
}

module.exports = { handleMessage, handleDisconnection };
