const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { mailer_password, domain, liveDomain} = require('./dotenv');
const { findUserByEmail } = require('../controller/onlinUsers/utils');
const fs = require('fs').promises; // Import fs to read files asynchronously
const path = require('path');      // Import path to manage file paths


// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'chidi90simeon@gmail.com', // Your Gmail address
        pass: mailer_password,           // The generated app password
    }
});

// Generate a unique reset token (using crypto)
function generateResetToken() {
    return crypto.randomBytes(20).toString('hex'); // 20-byte random token
}

// Send the password reset email
async function sendPasswordResetEmail(userEmail, user) {
    try {
        // Generate token and expiration date
        const resetToken = generateResetToken();
        const resetTokenExpire = Date.now() + 3600000; // Token expires in 1 hour

        // Save token and expiration in the user's record
        user.passwordReset.resetToken = resetToken;
        user.passwordReset.resetTokenExpires = resetTokenExpire;
        await user.save(); // Save the changes to the database

        // Construct the reset link (replace with your front-end URL)
        const resetLink = `${domain}/reset-password?token=${resetToken}&email=${userEmail}`;

        // Path to the HTML file in the public/emailReset folder
        const filePath = path.join(__dirname, '..', 'public', 'emailReset', 'work.html');

        // Read the HTML file asynchronously
        let htmlContent = await fs.readFile(filePath, 'utf-8');

        // Replace placeholders in the HTML file with dynamic values
        htmlContent = htmlContent.replace('{{resetLink}}', resetLink);
        htmlContent = htmlContent.replace('{{firstName}}', user.firstName);
        htmlContent = htmlContent.replace('{{lastName}}', user.lastName);

        // Modify all img src attributes to include the absolute URL path
        // Replace the relative path with an absolute URL pointing to your hosted images
        htmlContent = htmlContent.replace(/<img\s+src="(.*?)"/g, (match, p1) => {
            const absoluteImageUrl = `${liveDomain}/public/emailReset/to/${p1}`;
            return `<img src="${absoluteImageUrl}"`;
        });

        // Send the email with the reset link using the modified HTML template
        const info = await transporter.sendMail({
            from: '"Babtech E-learning" <chidi90simeon@gmail.com>',
            to: userEmail, // Recipient email
            subject: 'Password Reset Request',
            text: `You requested a password reset. Please click the following link to reset your password: ${resetLink}`,
            html: htmlContent, // Use the modified HTML content
        });

        console.log("Password reset email sent: %s", info.messageId);

        // Set timeout to clear the reset token after 1 hour (3600000 milliseconds)
        setTimeout(async () => {
            const expiredUser = await findUserByEmail(userEmail);

            // If the user still has an expired token, clear it
            if (expiredUser && expiredUser.passwordReset.resetTokenExpires <= Date.now()) {
                expiredUser.passwordReset.resetToken = null;
                expiredUser.passwordReset.resetTokenExpires = null;
                await expiredUser.save();
                console.log('Reset token cleared for expired user');
            }
        }, 3600000); // 1 hour in milliseconds

    } catch (err) {
        console.error('Error during password reset email process: ', err);
    }
}

module.exports = { sendPasswordResetEmail };
