const Expenditure = require('../../models/financials/expenditure.model');

const createExpenditure = async (data) => {
  const expenditure = new Expenditure(data);
  return await expenditure.save();
};

const getExpenditures = async ({ page, limit, sortBy, sortDirection }) => {
  const query = {};
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

  const [expenditures, totalRecords] = await Promise.all([
    Expenditure.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Expenditure.countDocuments(query),
  ]);

  return {
    data: expenditures,
    pagination: {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      pageSize: limit,
    },
  };
};

const updateExpenditure = async (id, data) => {
  const expenditure = await Expenditure.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!expenditure) {
    throw new Error('Expenditure not found');
  }
  return expenditure;
};

const deleteExpenditure = async (id) => {
  const expenditure = await Expenditure.findByIdAndDelete(id);
  if (!expenditure) {
    throw new Error('Expenditure not found');
  }
  return expenditure;
};

const getExpenditureById = async (id) => {
  const expenditure = await Expenditure.findById(id).lean();
  if (!expenditure) {
    throw new Error('Expenditure not found');
  }
  return expenditure;
};

module.exports = {
  createExpenditure,
  getExpenditures,
  updateExpenditure,
  deleteExpenditure,
  getExpenditureById,
};