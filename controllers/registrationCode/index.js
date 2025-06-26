const registrationCodeService = require('../../services/RegistrationCode');
const responseStatus = require('../../handlers/responseStatus.handler');

class RegistrationCodeController {
  async createCode(req, res) {
    try {
      const newCode = await registrationCodeService.generateCode();
      return responseStatus(res, 201, 'success', newCode);
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message);
    }
  }

  async validateCode(req, res) {
    try {
      const { code } = req.body;
      if (!code) {
        return responseStatus(res, 400, 'error', 'Code is required');
      }
      const result = await registrationCodeService.validateCode(code);
      return responseStatus(res, result.valid ? 200 : 400, result.valid ? 'success' : 'error', result.message);
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message);
    }
  }

  async deleteCode(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return responseStatus(res, 400, 'error', 'Code ID is required');
      }
      const result = await registrationCodeService.deleteCodeById(id);
      return responseStatus(res, 200, 'success', result.message);
    } catch (error) {
      return responseStatus(res, 404, 'error', error.message);
    }
  }

  async getAllCodes(req, res) {
    try {
      const { page, limit, sort, order } = req.query;
      const codes = await registrationCodeService.getAllCodes({
        page,
        limit,
        sort,
        order,
      });
      return responseStatus(res, 200, 'success', codes);
    } catch (error) {
      return responseStatus(res, 500, 'error', error.message);
    }
  }
}

module.exports = new RegistrationCodeController();