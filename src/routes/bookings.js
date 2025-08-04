const express = require('express');
const rateLimit = require('express-rate-limit');
const { bookTicket, getBookings } = require('../controllers/bookingController');
const { validateCreateBooking } = require('../middleware/validation');

const router = express.Router();


const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  message: { 
    success: false, 
    message: 'Too many booking attempts, please try again later.' 
  }
});


router.post('/book', bookingLimiter, validateCreateBooking, bookTicket);


router.get('/bookings', getBookings);

module.exports = router;