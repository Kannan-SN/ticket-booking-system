const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    trim: true
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Cannot book more than 10 tickets at once']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled'],
    default: 'confirmed'
  },
  bookingReference: {
    type: String,
    unique: true
    
  }
}, {
  timestamps: true
});


bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userEmail: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true });


bookingSchema.index({ eventId: 1, userEmail: 1 }, { 
  unique: true,
  partialFilterExpression: { status: 'confirmed' }
});


bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.bookingReference) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.bookingReference = `BK-${timestamp}-${random}`;
    
    console.log('Generated booking reference:', this.bookingReference); 
  }
  next();
});

bookingSchema.statics.generateBookingReference = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BK-${timestamp}-${random}`;
};

module.exports = mongoose.model('Booking', bookingSchema);