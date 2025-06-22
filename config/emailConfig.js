const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'crystallandacademy.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@crystallandacademy.com',
    pass: '123456789',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendTestEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: '"Crystal Land Academy" <admin@crystallandacademy.com>',
      to: 'chidi90simeon@gmail.com',
      subject: '🚀 DKIM + SPF Email Test',
      html: `<p>This test should now pass DKIM, SPF, and DMARC checks.</p>`,
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
};

sendTestEmail();
