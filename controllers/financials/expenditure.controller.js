const expenditureService = require('../../services/financials/expenditure.service');

const createExpenditureController = async (req, res) => {
  try {
    const { description, amount, date } = req.body;
    const expenditure = await expenditureService.createExpenditure({
      description,
      amount,
      date: new Date(date),
      createdBy: req.userAuth.id,
    });
    res.status(201).json({
      status: 'success',
      data: {
        message: 'Expenditure created successfully',
        data: expenditure,
      },
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const getExpendituresController = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc' } = req.query;
    const result = await expenditureService.getExpenditures({
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortDirection,
    });
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Expenditures fetched successfully',
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

const updateExpenditureController = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, date } = req.body;
    const expenditure = await expenditureService.updateExpenditure(id, {
      category,
      amount,
      date: date ? new Date(date) : undefined,
    });
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Expenditure updated successfully',
        data: expenditure,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const deleteExpenditureController = async (req, res) => {
  try {
    const { id } = req.params;
    await expenditureService.deleteExpenditure(id);
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Expenditure deleted successfully',
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

const getExpenditureByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const expenditure = await expenditureService.getExpenditureById(id);
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Expenditure fetched successfully',
        data: expenditure,
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
  createExpenditureController,
  getExpendituresController,
  updateExpenditureController,
  deleteExpenditureController,
  getExpenditureByIdController,
};