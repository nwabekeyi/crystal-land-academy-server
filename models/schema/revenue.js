const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = Revenue;
