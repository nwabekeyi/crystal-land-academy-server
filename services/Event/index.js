const Event = require('../../models/Event/index');

/**
 * Create a new event
 */
exports.createEventService = async (data) => {
  const { title, description, day, startDate, endDate } = data;

  if (!title || !description || !day || !startDate || !endDate) {
    throw new Error('Missing required fields');
  }

  const event = new Event(data);
  return await event.save();
};

/**
 * Get all events
 */
exports.getAllEventsService = async (filter = {}, skip = null, limit = null, sortBy = null, sortDirection = null) => {
  const sortOptions = {};
  if (sortBy) {
    sortOptions[sortBy] = sortDirection === 'asc' ? 1 : -1;
  }

  return await Event.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
};

/**
 * Get a single event by ID
 */
exports.getEventByIdService = async (id) => {
  const event = await Event.findById(id);
  if (!event) {
    throw new Error('Event not found');
  }
  return event;
};

/**
 * Update an event by ID
 */
exports.updateEventService = async (id, updateData) => {
    const event = await Event.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }
  
    console.log('Existing event:', event); // Debug log
    console.log('Update data:', updateData); // Debug log
  
    // Use $set to update only provided fields
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators on updated fields
        context: 'query' // Ensure validators use query context
      }
    );
  
    if (!updatedEvent) {
      throw new Error('Event not found');
    }
  
    return updatedEvent;
  };

/**
 * Delete an event by ID
 */
exports.deleteEventService = async (id) => {
  const event = await Event.findByIdAndDelete(id);
  if (!event) {
    throw new Error('Event not found');
  }
  return event;
};