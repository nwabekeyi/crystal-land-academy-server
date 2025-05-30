const Revenue = require('../models/schema/revenue');

const getRevenues = async (req, res) => {
  try {
    const revenues = await Revenue.find();
    res.json(revenues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRevenue = async (req, res) => {
  try {
    const newRevenue = new Revenue(req.body);
    const savedRevenue = await newRevenue.save();
    res.status(201).json(savedRevenue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getRevenues, createRevenue };
