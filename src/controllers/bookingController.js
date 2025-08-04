const bookingService = require('../services/bookingService');
const logger = require('../utils/logger');


const bookTicket = async (req, res) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    throw error;
  }
};


const getBookings = async (req, res) => {
  try {
    const { page, limit, eventId, userEmail } = req.query;

    const filters = {};
    if (eventId) filters.eventId = eventId;
    if (userEmail) filters.userEmail = userEmail;

    const pagination = {};
    if (page) pagination.page = parseInt(page);
    if (limit) pagination.limit = parseInt(limit);

    const result = await bookingService.getBookings(filters, pagination);

    res.json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: result.bookings,
      pagination: result.pagination
    });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  bookTicket,
  getBookings
};