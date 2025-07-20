const OtherRevenue = require('../../models/financials/otherRevenues.model');

const createOtherRevenue = async (data) => {
  const otherRevenue = new OtherRevenue(data);
  return await otherRevenue.save();
};

const getOtherRevenues = async ({ page, limit, sortBy, sortDirection}) => {
  const query = {};
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortDirection === 'asc' ? 1 : -1 };

  const [otherRevenues, totalRecords] = await Promise.all([
    OtherRevenue.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    OtherRevenue.countDocuments(query),
  ]);

  return {
    data: otherRevenues,
    pagination: {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      pageSize: limit,
    },
  };
};

const updateOtherRevenue = async (id, data) => {
  const otherRevenue = await OtherRevenue.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!otherRevenue) {
    throw new Error('Other Revenue not found');
  }
  return otherRevenue;
};

const deleteOtherRevenue = async (id) => {
  const otherRevenue = await OtherRevenue.findByIdAndDelete(id);
  if (!otherRevenue) {
    throw new Error('Other Revenue not found');
  }
  return otherRevenue;
};

const getOtherRevenueById = async (id) => {
  const otherRevenue = await OtherRevenue.findById(id).lean();
  if (!otherRevenue) {
    throw new Error('Other Revenue not found');
  }
  return otherRevenue;
};

module.exports = {
  createOtherRevenue,
  getOtherRevenues,
  updateOtherRevenue,
  deleteOtherRevenue,
  getOtherRevenueById,
};