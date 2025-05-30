
const sendNotification = async ({ recipients, message, type = 'info', priority = 'medium', actionLink = '', source = null, wsClients }) => {
    try {
        // If recipients is a single user, wrap it in an array for consistency
        const recipientsArray = Array.isArray(recipients) ? recipients : [recipients];
        
        // Loop through each recipient and create a notification
        for (const recipient of recipientsArray) {
            const notification = {
                message,
                recipient: recipient._id,        // Use the recipient's ObjectId
                type,                            // Notification type (info, warning, etc.)
                readStatus: false,               // Set the default read status to false
                priority,                        // Notification priority
                actionLink,                      // Optional action link
                source: source?._id || null,     // Use ObjectId of the source (user who triggered), if provided
                isDeleted: false,                // Default isDeleted flag
                timestamp: new Date()            // Automatically set the timestamp
            };

            // Check if the recipient has an active WebSocket connection
            const wsClient = wsClients.get(recipient._id); // Assuming wsClients is a Map of WebSocket clients keyed by userId

            if (wsClient && wsClient.readyState === WebSocket.OPEN) {
                // Send the notification to the WebSocket client if connected
                wsClient.send(JSON.stringify({
                    action: 'newNotification',
                    data: notification,
                }));
            } else {
                // If WebSocket is not open, save the notification to the recipient's database
                recipient.notifications.push(notification);
                await recipient.save();
            }
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

module.exports = {
    sendNotification
};
