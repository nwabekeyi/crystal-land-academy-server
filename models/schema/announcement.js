// models/announcementModel.js

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true // This adds createdAt and updatedAt fields automatically
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
