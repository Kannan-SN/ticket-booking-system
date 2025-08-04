const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const lockManager = require('../utils/lockManager');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class BookingService {
  
  async createBooking(bookingData) {
    const { eventId, userId, userEmail, quantity } = bookingData;
    const lockResource = `booking:${eventId}`;
    
    logger.info('Booking attempt started', { eventId, userId, quantity });

    try {
    
      return await lockManager.withLock(
        lockResource,
        async () => await this._processBooking(bookingData),
        60000, 
        10000  
      );
      
    } catch (error) {
      logger.error('Booking failed', { eventId, userId, error: error.message });

      if (error.message.includes('Failed to acquire lock')) {
        throw new AppError('Unable to process booking at this time, please try again', 503);
      }

      throw error;
    }
  }

  async _processBooking(bookingData) {
    const { eventId, userId, userEmail, quantity } = bookingData;
    
    try {
     
      const event = await Event.findById(eventId);
      
      if (!event) {
        throw new AppError('Event not found', 404);
      }

     
      this._validateEventForBooking(event, quantity);

     
      const existingBooking = await Booking.findOne({
        eventId,
        userEmail,
        status: 'confirmed'
      });

      if (existingBooking) {
        throw new AppError('User has already booked this event', 409);
      }

   
      const currentVersion = event.version;
      const updatedEvent = await Event.findOneAndUpdate(
        { 
          _id: eventId, 
          version: currentVersion,
          
          $expr: { $lte: [{ $add: ['$bookedTickets', quantity] }, '$totalTickets'] }
        },
        { 
          $inc: { 
            bookedTickets: quantity,
            version: 1
          }
        },
        { 
          new: true, 
          runValidators: true
        }
      );

      if (!updatedEvent) {
       
        logger.warn('Booking conflict or insufficient tickets', {
          eventId,
          requestedQuantity: quantity,
          expectedVersion: currentVersion
        });
        
        
        const currentEvent = await Event.findById(eventId);
        if (currentEvent && currentEvent.version !== currentVersion) {
          throw new AppError('Booking conflict detected, please try again', 409);
        } else {
          const available = currentEvent ? currentEvent.totalTickets - currentEvent.bookedTickets : 0;
          throw new AppError(`Only ${available} tickets available`, 400);
        }
      }

     
      const bookingReference = this._generateBookingReference();

     
      const booking = new Booking({
        eventId,
        userId,
        userEmail,
        quantity,
        totalAmount: quantity * event.price,
        bookingReference 
      });

      const savedBooking = await booking.save();

     
      if (!savedBooking) {
      
        await Event.findByIdAndUpdate(
          eventId,
          { 
            $inc: { 
              bookedTickets: -quantity,
              version: 1
            }
          }
        );
        throw new AppError('Booking creation failed', 500);
      }

      logger.info('Booking completed successfully', {
        eventId,
        bookingId: savedBooking.id,
        bookingReference: savedBooking.bookingReference,
        remainingTickets: updatedEvent.availableTickets
      });

     
      return await Booking.findById(savedBooking.id)
        .populate('eventId', 'name eventDate venue price')
        .lean();

    } catch (error) {
     
      if (error instanceof AppError) {
        throw error;
      }
      
     
      if (error.name === 'ValidationError') {
        throw new AppError('Validation failed: ' + error.message, 400);
      }
      
     
      if (error.code === 11000) {
       
        if (error.message.includes('bookingReference')) {
        
          logger.warn('Booking reference collision, retrying...', { eventId });
          throw new AppError('Booking reference collision, please try again', 409);
        } else if (error.message.includes('eventId') && error.message.includes('userEmail')) {
          throw new AppError('User has already booked this event', 409);
        } else {
          throw new AppError('Duplicate booking detected', 409);
        }
      }
      
     
      logger.error('Unexpected booking error:', error);
      throw new AppError('Booking processing failed', 500);
    }
  }

 
  _generateBookingReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `BK-${timestamp}-${random}`;
  }

  _validateEventForBooking(event, quantity) {
    if (event.status === 'cancelled') {
      throw new AppError('Event has been cancelled', 400);
    }

    if (event.status === 'sold_out') {
      throw new AppError('Event is sold out', 400);
    }

    if (event.eventDate <= new Date()) {
      throw new AppError('Event date has passed', 400);
    }

    const availableTickets = event.totalTickets - event.bookedTickets;
    
    if (availableTickets <= 0) {
      throw new AppError('No tickets available for this event', 400);
    }

    if (availableTickets < quantity) {
      throw new AppError(`Only ${availableTickets} tickets available`, 400);
    }
  }

  async getBookings(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.eventId) query.eventId = filters.eventId;
    if (filters.userEmail) query.userEmail = filters.userEmail;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('eventId', 'name eventDate venue price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query)
    ]);

    return {
      bookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total
      }
    };
  }

  async healthCheck() {
    try {
      const eventCount = await Event.countDocuments();
      const bookingCount = await Booking.countDocuments();
      
      return {
        status: 'healthy',
        database: 'connected',
        events: eventCount,
        bookings: bookingCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      throw new AppError('System health check failed', 503);
    }
  }
}

module.exports = new BookingService();