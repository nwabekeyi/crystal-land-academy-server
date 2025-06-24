const Pin = require('../../models/Pin');

class PinService {
  static async generatePin() {
    const generateRandomPin = () => {
      return Math.floor(10000000000 + Math.random() * 90000000000).toString(); // 11-digit number
    };

    let pin;
    let isUnique = false;
    const maxAttempts = 10;

    // Ensure PIN is unique
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      pin = generateRandomPin();
      const existingPin = await Pin.findOne({ pin });
      if (!existingPin) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      throw new Error('Unable to generate a unique PIN after multiple attempts');
    }

    // Set expiry (30 days)
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(createdAt.getDate() + 30);

    // Save PIN
    const newPin = new Pin({
      pin,
      createdAt,
      expiresAt,
    });

    await newPin.save();
    return {
      pin: newPin.pin,
      createdAt: newPin.createdAt,
      expiresAt: newPin.expiresAt,
    };
  }

  static async verifyPin(pin) {
    // Validate format
    if (!/^\d{11}$/.test(pin)) {
      return { isValid: false, message: 'Invalid PIN format. Must be 11 digits.' };
    }

    // Check existence
    const pinRecord = await Pin.findOne({ pin });
    if (!pinRecord) {
      return { isValid: false, message: 'PIN does not exist.' };
    }

    // Check usage
    if (pinRecord.isUsed) {
      return { isValid: false, message: 'PIN has already been used.' };
    }

    // Check expiry
    const now = new Date();
    if (now > pinRecord.expiresAt) {
      return { isValid: false, message: 'PIN has expired.' };
    }

    // Valid PIN
    return {
      isValid: true,
      message: 'PIN is valid.',
      pin: {
        pin: pinRecord.pin,
        expiresAt: pinRecord.expiresAt,
      },
    };
  }
}

module.exports = PinService;