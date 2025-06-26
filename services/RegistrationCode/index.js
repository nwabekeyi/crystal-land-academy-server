const RegistrationCode = require('../../models/RegistrationCode');

class RegistrationCodeService {
  // Get all registration codes with pagination and sorting
  async getAllCodes({ page = 1, limit = 10, sort = 'generatedDate', order = 'desc' }) {
    try {
      // Convert page and limit to numbers and ensure valid values
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;
      const sortOrder = order.toLowerCase() === 'asc' ? 1 : -1;

      // Build sort object
      const sortObj = { [sort]: sortOrder };

      // Fetch codes with pagination, sorting, and populate usedBy
      const codes = await RegistrationCode.find()
        .populate('usedBy', 'firstName lastName _id') // Populate usedBy with name and _id
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select('-__v'); // Exclude __v field

      // Get total count for pagination
      const totalRows = await RegistrationCode.countDocuments();

      return {
        data: codes,
        totalRows,
        page: pageNum,
        limit: limitNum,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve codes: ${error.message}`);
    }
  }

  // Generate and store a new registration code
  async generateCode() {
    const length = 11;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    const codeData = {
      code,
      generatedDate: formattedDate,
      generatedTime: formattedTime,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      used: false,
    };

    try {
      // Check for duplicate codes
      let existingCode = await RegistrationCode.findOne({ code });
      let attempts = 0;
      const maxAttempts = 5;

      while (existingCode && attempts < maxAttempts) {
        code = '';
        for (let i = 0; i < length; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        codeData.code = code;
        existingCode = await RegistrationCode.findOne({ code });
        attempts++;
      }

      if (existingCode) {
        throw new Error('Failed to generate unique code after multiple attempts');
      }

      const newCode = new RegistrationCode(codeData);
      return await newCode.save();
    } catch (error) {
      throw new Error(`Failed to save registration code: ${error.message}`);
    }
  }

  // Validate a registration code
  async validateCode(code) {
    try {
      const codeRecord = await RegistrationCode.findOne({ code });
      if (!codeRecord) {
        return { valid: false, message: 'Invalid code' };
      }

      const now = new Date();
      if (codeRecord.expiresAt < now) {
        return { valid: false, message: 'Code has expired' };
      }

      if (codeRecord.used) {
        return { valid: false, message: 'Code has already been used' };
      }

      return { valid: true, message: 'Code is valid' };
    } catch (error) {
      throw new Error(`Failed to validate code: ${error.message}`);
    }
  }

  // Delete a registration code by ID
  async deleteCodeById(id) {
    try {
      const result = await RegistrationCode.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Code not found');
      }
      return { message: 'Code deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete code: ${error.message}`);
    }
  }

  // Delete expired codes
  async deleteExpiredCodes() {
    try {
      const now = new Date();
      const result = await RegistrationCode.deleteMany({
        expiresAt: { $lt: now },
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to delete expired codes: ${error.message}`);
    }
  }
}

module.exports = new RegistrationCodeService();