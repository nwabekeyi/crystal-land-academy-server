const cron = require('node-cron');
const http = require('http');

const healthCheck = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      http.get('http://127.0.0.1:5000/healthcheck', (res) => {
        console.log(`[HEALTHCHECK] Status: ${res.statusCode} at ${new Date().toISOString()}`);
      }).on('error', (err) => {
        console.error('[HEALTHCHECK] Request failed:', err.message);
      });
    } catch (error) {
      console.error('[HEALTHCHECK] Error:', error);
    }
  }, {
    timezone: 'Africa/Lagos',
  });
};

module.exports = healthCheck;
