require('dotenv').config();
require('express-async-errors');

const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Connected to MongoDB');

    // Connect to Redis (optional, will fallback to in-memory if not available)
    await connectRedis();
    logger.info('Redis connection attempted');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📋 API Endpoints:`);
      logger.info(`   POST /api/events - Create event`);
      logger.info(`   GET  /api/events/:id - Get event`);
      logger.info(`   POST /api/book - Book ticket`);
      logger.info(`   GET  /api/bookings - Get bookings`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();