const Event = require('../models/Event');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');


const createEvent = async (req, res) => {
  try {
    const event = new Event(req.body);
    const savedEvent = await event.save();
    
    logger.info('Event created', { eventId: savedEvent.id, name: savedEvent.name });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: savedEvent
    });
  } catch (error) {
    throw error;
  }
};


const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    event.availableTickets = Math.max(0, event.totalTickets - event.bookedTickets);

    res.json({
      success: true,
      message: 'Event retrieved successfully',
      data: event
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createEvent,
  getEventById
};