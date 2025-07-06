const otherRevenueService = require('../../services/financials/otherRevenue.service');

const createOtherRevenueController = async (req, res) => {
  try {
    const { amount, source, date, description } = req.body;
    const otherRevenue = await otherRevenueService.createOtherRevenue({
      amount,
      source,
      date: new Date(date),
      description,
      createdBy: req.user._id, // Assumes user is authenticated
    });
    res.status(201).json({
      status: 'success',
      data: {
        message: 'Other Revenue created successfully',
        data: otherRevenue,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const getOtherRevenuesController = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc' } = req.query;
    const result = await otherRevenueService.getOtherRevenues({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortDirection,
    });
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Other Revenues fetched successfully',
        ...result,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const updateOtherRevenueController = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, source, date, description } = req.body;
    const otherRevenue = await otherRevenueService.updateOtherRevenue(id, {
      amount,
      source,
      date: date ? new Date(date) : undefined,
      description,
    });
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Other Revenue updated successfully',
        data: otherRevenue,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const deleteOtherRevenueController = async (req, res) => {
  try {
    const { id } = req.params;
    await otherRevenueService.deleteOtherRevenue(id);
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Other Revenue deleted successfully',
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const getOtherRevenueByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const otherRevenue = await otherRevenueService.getOtherRevenueById(id);
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Other Revenue fetched successfully',
        data: otherRevenue,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

module.exports = {
  createOtherRevenueController,
  getOtherRevenuesController,
  updateOtherRevenueController,
  deleteOtherRevenueController,
  getOtherRevenueByIdController,
};