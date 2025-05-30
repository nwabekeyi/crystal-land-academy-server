// counterSchema.js
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // This will be the collection name
  sequence_value: { type: Number, default: 0 } // The value that will be incremented
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
