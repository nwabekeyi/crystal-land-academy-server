// emailConfig.js
const sgMail = require('@sendgrid/mail');
const { emailKey, senderEmail } = require('./env.Config');

sgMail.setApiKey(emailKey);

/**
 * Send an email using SendGrid Template
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.templateId - SendGrid dynamic template ID
 * @param {object} options.dynamicTemplateData - Data for template
 * @param {string} [options.subject] - Email subject (optional, falls back to template default)
 */
const sendEmail = async ({ to, templateId, dynamicTemplateData, subject }) => {
  const msg = {
    to,
    from: {
      email: senderEmail,
      name: `Crystal-land Int'l Academy`, // Use provided senderName or default to 'Crystal Land Academy'
    },
    templateId,
    dynamicTemplateData: {
      ...dynamicTemplateData,
      year: new Date().getFullYear(), // Add current year
      unsubscribe: 'https://www.crystallandacademy.com', // Unsubscribe link
      unsubscribe_preferences: 'https://www.crystallandacademy.com', // Preferences link
    },
  };

  // Only add subject if provided, allowing template default if omitted
  if (subject) {
    msg.subject = subject;
  }

  try {
    const response = await sgMail.send(msg);
    console.log(`✅ Email sent: ${response[0].statusCode}`);
    return response;
  } catch (error) {
    console.error('❌ SendGrid Error:', error.response?.body || error.message);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendEmail };