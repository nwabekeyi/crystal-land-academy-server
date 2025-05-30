const cron = require('node-cron');
const Announcement = require('../models/schema/announcement');

// Controller to submit a new announcement
const submitAnnouncement = async (req, res) => {
    const { title, message, date } = req.body;

    try {
        // Validate input
        if (!title || !message || !date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Create a new announcement
        const newAnnouncement = new Announcement({
            title,
            message,
            date: new Date(date) // Ensure date is in proper format
        });

        // Save to database
        await newAnnouncement.save();

        // Return success response
        res.status(201).json({ message: 'Announcement created successfully', announcement: newAnnouncement });

    } catch (error) {
        res.status(500).json({ error: 'Failed to create announcement', details: error.message });
    }
};

// Controller to get all announcements
const getAllAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find();
        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve announcements', details: error.message });
    }
};

// Controller to update an existing announcement
const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, message, date } = req.body;

    try {
        if (!title || !message || !date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            id, 
            { title, message, date },
            { new: true, runValidators: true }
        );

        if (!updatedAnnouncement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.status(200).json({ message: 'Announcement updated successfully', announcement: updatedAnnouncement });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update announcement', details: error.message });
    }
};

// Controller to delete an announcement manually
const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

        if (!deletedAnnouncement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete announcement', details: error.message });
    }
};

// Set up cron job to delete announcements older than 3 days
cron.schedule('0 0 * * *', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
        const result = await Announcement.deleteMany({ date: { $lt: threeDaysAgo } });
        console.log(`Deleted ${result.deletedCount} old announcements`);
    } catch (err) {
        console.error('Error deleting old announcements:', err);
    }
});

module.exports = {
    submitAnnouncement,
    getAllAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
};
