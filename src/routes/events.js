const express = require('express');
const { createEvent, getEventById } = require('../controllers/eventController');
const { validateCreateEvent, validateEventId } = require('../middleware/validation');

const router = express.Router();


router.post('/', validateCreateEvent, createEvent);


router.get('/:id', validateEventId, getEventById);

module.exports = router;