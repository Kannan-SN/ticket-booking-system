const Joi = require('joi');


const schemas = {
  createEvent: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    totalTickets: Joi.number().integer().min(1).max(100000).required(),
    price: Joi.number().min(0).required(),
    eventDate: Joi.date().greater('now').required(),
    venue: Joi.string().trim().min(1).required()
  }),

  createBooking: Joi.object({
    eventId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      .messages({ 'string.pattern.base': 'Invalid event ID format' }),
    userId: Joi.string().trim().min(1).required(),
    userEmail: Joi.string().email().lowercase().required(),
    quantity: Joi.number().integer().min(1).max(10).required()
  }),

  eventId: Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      .messages({ 'string.pattern.base': 'Invalid event ID format' })
  })
};


const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  validateCreateEvent: validate(schemas.createEvent),
  validateCreateBooking: validate(schemas.createBooking),
  validateEventId: validate(schemas.eventId, 'params')
};