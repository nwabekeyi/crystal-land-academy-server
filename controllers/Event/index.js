const {
    createEventService,
    getAllEventsService,
    getEventByIdService,
    updateEventService,
    deleteEventService
  } = require('../../services/Event/index');
  

  const mongoose = require('mongoose');
  /**
   * Create a new event
   */
  exports.createEventController = async (req, res) => {
    try {
      console.log('Incoming request body:', req.body);
  
      // Validate required fields
      const requiredFields = ['title', 'description', 'day', 'startDate', 'endDate'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
  
      if (missingFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields
        });
      }
  
      const event = await createEventService(req.body);
  
      return res.status(201).json({
        status: 'success',
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('Error in createEventController:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to create event',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
  
  /**
   * Get all events
   */
  exports.getAllEventsController = async (req, res) => {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc' } = req.query;
  
      const skip = (page - 1) * limit;
      const filter = {}; // Add filtering logic if needed (e.g., by date or day)
  
      const events = await getAllEventsService(filter, skip, parseInt(limit), sortBy, sortDirection);
  
      return res.status(200).json({
        status: 'success',
        message: 'Events fetched successfully',
        data: events
      });
    } catch (error) {
      console.error('Error in getAllEventsController:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to fetch events'
      });
    }
  };
  
  /**
   * Get a single event by ID
   */
  exports.getEventByIdController = async (req, res) => {
    try {
      const { id } = req.params;
  
      const event = await getEventByIdService(id);
  
      return res.status(200).json({
        status: 'success',
        message: 'Event fetched successfully',
        data: event
      });
    } catch (error) {
      console.error('Error in getEventByIdController:', error);
      return res.status(404).json({
        status: 'error',
        message: error.message || 'Event not found'
      });
    }
  };
  
  /**
   * Update an event by ID
   */
  exports.updateEventController = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid event ID format'
        });
      }
  
      // Check if update data is empty
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No update data provided'
        });
      }
  
      console.log('Update data:', req.body); // Debug log
  
      const event = await updateEventService(id, req.body);
  
      return res.status(200).json({
        status: 'success',
        message: 'Event updated successfully',
        data: event
      });
    } catch (error) {
      console.error('Error in updateEventController:', error);
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to update event',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
  
  
  
  /**
   * Delete an event by ID
   */
  exports.deleteEventController = async (req, res) => {
    try {
      const { id } = req.params;
  
      const deletedEvent = await deleteEventService(id);
  
      return res.status(200).json({
        status: 'success',
        message: 'Event deleted successfully',
        data: deletedEvent
      });
    } catch (error) {
      console.error('Error in deleteEventController:', error);
      return res.status(404).json({
        status: 'error',
        message: error.message || 'Failed to delete event'
      });
    }
  };