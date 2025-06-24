const PinService = require('../../services/Pin');
const responseStatus = require('../../handlers/responseStatus.handler');

class PinController {
  static async generatePin(req, res) {
    try {
      const pinData = await PinService.generatePin();
      return responseStatus(res, 201, 'success', pinData);
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message || 'Failed to generate PIN');
    }
  }

  static async verifyPin(req, res) {
    try {
      const { pin } = req.body;
      if (!pin) {
        return responseStatus(res, 400, 'error', 'PIN is required');
      }

      const result = await PinService.verifyPin(pin);
      if (result.isValid) {
        return responseStatus(res, 200, 'success', result.pin);
      } else {
        return responseStatus(res, 400, 'error', result.message);
      }
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message || 'Failed to verify PIN');
    }
  }
}

module.exports = PinController;