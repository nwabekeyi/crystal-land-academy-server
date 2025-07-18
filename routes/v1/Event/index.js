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
eventRouter.post('/event',loggedIn,isAdmin, createEventController);

// GET: Fetch all events
eventRouter.get('/event',loggedIn, getAllEventsController);

// GET: Fetch a single event by ID
eventRouter.get('/event/:id',loggedIn, getEventByIdController);

// PUT: Update an event by ID
eventRouter.patch('/event/:id',loggedIn,isAdmin, updateEventController);

// DELETE: Delete an event by ID
eventRouter.delete('/event/:id',loggedIn,isAdmin, deleteEventController);

module.exports = eventRouter;