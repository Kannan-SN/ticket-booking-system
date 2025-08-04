const logger = require('../utils/logger');


class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}


const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  return new AppError(`Validation Error: ${errors.join('. ')}`, 400);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  let message = 'Duplicate value detected';
  
  if (field.includes('email')) {
    message = 'User has already booked this event';
  }
  
  return new AppError(message, 409);
};

const handleCastError = (err) => {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
};


const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });


  if (err.name === 'ValidationError') {
    error = handleValidationError(error);
  }
  
  if (err.code === 11000) {
    error = handleDuplicateKeyError(error);
  }
  
  if (err.name === 'CastError') {
    error = handleCastError(error);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

module.exports = { AppError, errorHandler };