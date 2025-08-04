const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    maxlength: [100, 'Event name cannot exceed 100 characters']
  },
  totalTickets: {
    type: Number,
    required: [true, 'Total tickets is required'],
    min: [1, 'Total tickets must be at least 1'],
    max: [100000, 'Total tickets cannot exceed 100,000']
  },
  bookedTickets: {
    type: Number,
    default: 0,
    min: [0, 'Booked tickets cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Ticket price is required'],
    min: [0, 'Price cannot be negative']
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Event date must be in the future'
    }
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'sold_out', 'cancelled'],
    default: 'active'
  },
  version: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


eventSchema.virtual('availableTickets').get(function() {
  return Math.max(0, this.totalTickets - this.bookedTickets);
});


eventSchema.index({ eventDate: 1 });
eventSchema.index({ status: 1 });


eventSchema.pre('save', function(next) {
  if (this.bookedTickets >= this.totalTickets) {
    this.status = 'sold_out';
  } else if (this.status === 'sold_out' && this.bookedTickets < this.totalTickets) {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);