const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true }
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
