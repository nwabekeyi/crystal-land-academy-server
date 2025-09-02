const nodemailer = require('nodemailer');
const ejs = require('ejs');
const fs = require('fs').promises; // For reading template files
const path = require('path');
const { emailHost, emailPort, emailUser, emailPass, senderEmail, senderName } = require('./env.Config');

// Create a transporter for the Postfix SMTP server
const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465, // true for 465 (SSL/TLS), false for 587 (STARTTLS)
  auth: {
    user: emailUser,
    pass: emailPass
  },
  tls: {
    rejectUnauthorized: false // Use if SSL certificate is self-signed
  }
});

/**
 * Send an email using Nodemailer with EJS templating
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.template] - Path to EJS template file (relative to views/emails) or template string
 * @param {object} [options.dynamicTemplateData] - Data for template rendering
 * @param {string} [options.subject] - Email subject (optional)
 */
const sendEmail = async ({ to, template, dynamicTemplateData = {}, subject }) => {
  console.log('📧 Preparing email with following details:', {
    host: emailHost,
    port: emailPort,
    user: emailUser,
    from: senderEmail,
    pass: emailPass,
    template,
    to,
    subject: subject || 'Email from Crystal-land Int\'l Academy'
  });

  // Default EJS template (as a string) if none provided
  const defaultTemplate = `
    <p>Hello,</p>
    <p>This is an email from <%= senderName %>.</p>
    <p>Year: <%= year %></p>
    <p><a href="https://www.crystallandacademy.com">Unsubscribe</a></p>
    <p><a href="https://www.crystallandacademy.com">Manage Preferences</a></p>
  `;

  try {
    let htmlContent;

    // Prepare template data
    const templateData = {
      senderName,
      year: new Date().getFullYear(),
      ...dynamicTemplateData // Merge custom dynamic data
    };


    // Check if template is a file path or a string
    if (template && template.endsWith('.ejs')) {
      // Load template from file (assumes templates are in views/emails)
      const templatePath = path.join(__dirname, '../public', 'email-templates', template);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      htmlContent = ejs.render(templateContent, templateData);
    } else {
      // Use provided template string or default template
      htmlContent = ejs.render(template || defaultTemplate, templateData);
    }

    // Generate plain text version from HTML
    const textContent = htmlContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    const mailOptions = {
      from: {
        name: senderName,
        address: senderEmail
      },
      to,
      subject: subject || 'Email from Crystal-land Int\'l Academy',
      text: textContent,
      html: htmlContent
    };

    console.log('🚀 Attempting to send email...');
    const response = await transporter.sendMail(mailOptions);

    console.log('✅ Email successfully sent!');
    console.log('SMTP Response:', response);

    return response;
  } catch (error) {
    console.error('❌ Failed to send email');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Full Error Object:', error);

    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = { sendEmail };