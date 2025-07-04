const express = require('express');
const eventRouter = express.Router();
const loggedIn = require('../../../middlewares/isLoggedIn');
const isAdmin= require('../../../middlewares/isAdmin'); 
const {
  createEventController,
  getAllEventsController,
  getEventByIdController,
  updateEventController,
  deleteEventController
} = require('../../../controllers/Event/index');

// POST: Create a new event
eventRouter.post('/event',isAdmin, loggedIn, createEventController);

// GET: Fetch all events
eventRouter.get('/event', getAllEventsController);

// GET: Fetch a single event by ID
eventRouter.get('/event/:id', getEventByIdController);

// PUT: Update an event by ID
eventRouter.patch('/event/:id',isAdmin, loggedIn, updateEventController);

// DELETE: Delete an event by ID
eventRouter.delete('/event/:id',isAdmin, loggedIn, deleteEventController);

module.exports = eventRouter;