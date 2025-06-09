const ejs = require('ejs');
const path = require('path');
const transporter = require('../config/emailConfig');

/**
 * Sends an email using an EJS template.
 * 
 * @param {Object} options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.templateName - EJS file name inside public/email-template (without .ejs)
 * @param {Object} options.templateData - Data to pass to the EJS template
 */
const sendEmail = async ({ to, subject, templateName, templateData }) => {
  try {
    const templatePath = path.join(
      __dirname,
      '..',
      'public',
      'email-template',
      `${templateName}.ejs`
    );

    const html = await ejs.renderFile(templatePath, templateData);

    const mailOptions = {
      from: `"Your App Name" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err;
  }
};

module.exports = sendEmail;
