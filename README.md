# Ticket Booking API

A simple Node.js API for booking event tickets with concurrency protection to prevent overbooking.

## Quick Start

### 1. Setup
```bash
# Install dependencies
npm install

# Start MongoDB and Redis (optional)
mongod
redis-server

# Start the server
npm run dev
```

**Server runs on:** `http://localhost:3000`

### 2. Environment Setup
Create `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ticket-booking
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

## API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-08-04T12:00:00.000Z"
}
```

---

### 1. Create Event
```http
POST /api/events
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Coldplay Live Concert",
  "totalTickets": 100,
  "price": 150.50,
  "eventDate": "2025-12-31T20:00:00Z",
  "venue": "Madison Square Garden"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "6507f1f77bcf86cd799439011",
    "name": "Coldplay Live Concert",
    "totalTickets": 100,
    "bookedTickets": 0,
    "availableTickets": 100,
    "price": 150.5,
    "eventDate": "2025-12-31T20:00:00.000Z",
    "venue": "Madison Square Garden",
    "status": "active"
  }
}
```

---

### 2. Get Event Details
```http
GET /api/events/{eventId}
```

**Example:**
```http
GET /api/events/6507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "id": "6507f1f77bcf86cd799439011",
    "name": "Coldplay Live Concert",
    "totalTickets": 100,
    "bookedTickets": 25,
    "availableTickets": 75,
    "price": 150.5,
    "eventDate": "2025-12-31T20:00:00.000Z",
    "venue": "Madison Square Garden",
    "status": "active"
  }
}
```

---

### 3. Book Tickets
```http
POST /api/book
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "6507f1f77bcf86cd799439011",
  "userId": "user123",
  "userEmail": "john.doe@example.com",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking123456789",
    "eventId": {
      "id": "6507f1f77bcf86cd799439011",
      "name": "Coldplay Live Concert",
      "eventDate": "2025-12-31T20:00:00.000Z",
      "venue": "Madison Square Garden",
      "price": 150.5
    },
    "userId": "user123",
    "userEmail": "john.doe@example.com",
    "quantity": 2,
    "totalAmount": 301,
    "status": "confirmed",
    "bookingReference": "BK-L1QR2S3T-ABCDE",
    "createdAt": "2025-08-04T12:00:00.000Z"
  }
}
```

---

###  4. View All Bookings
```http
GET /api/bookings
```

**Optional Query Parameters:**
- `eventId` - Filter by event
- `userEmail` - Filter by user
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Example:**
```http
GET /api/bookings?eventId=6507f1f77bcf86cd799439011&page=1&limit=5
```

**Response:**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [
    {
      "id": "booking123456789",
      "eventId": {
        "name": "Coldplay Live Concert",
        "eventDate": "2025-12-31T20:00:00.000Z",
        "venue": "Madison Square Garden"
      },
      "userId": "user123",
      "userEmail": "john.doe@example.com",
      "quantity": 2,
      "totalAmount": 301,
      "status": "confirmed",
      "bookingReference": "BK-L1QR2S3T-ABCDE",
      "createdAt": "2025-08-04T12:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25
  }
}
```

##Quick Test Commands

### 1. Test with cURL

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Create an event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Concert",
    "totalTickets": 10,
    "price": 50,
    "eventDate": "2025-12-31T20:00:00Z",
    "venue": "Test Venue"
  }'

# 3. Get event details (replace EVENT_ID)
curl http://localhost:3000/api/events/EVENT_ID

# 4. Book tickets (replace EVENT_ID)
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "userId": "user123",
    "userEmail": "test@example.com",
    "quantity": 2
  }'

# 5. View bookings
curl http://localhost:3000/api/bookings
```

### 2. Test with Postman
Import the provided `Ticket-Booking-Local-Test.postman_collection.json` file into Postman for comprehensive testing.

##  Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

### Event Not Found (404)
```json
{
  "success": false,
  "message": "Event not found"
}
```

### Duplicate Booking (409)
```json
{
  "success": false,
  "message": "User has already booked this event"
}
```

### Insufficient Tickets (400)
```json
{
  "success": false,
  "message": "Only 3 tickets available"
}
```

### Rate Limited (429)
```json
{
  "success": false,
  "message": "Too many booking attempts, please try again later."
}
```

## Concurrency Protection

The system prevents overbooking using:
- **Distributed Locking** (Redis-based)
- **Optimistic Locking** (Version-based)
- **Atomic Operations** (MongoDB)
- **Unique Constraints** (Database-level)

### Test Concurrency
Create an event with few tickets and try booking simultaneously:

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{"eventId":"EVENT_ID","userId":"user1","userEmail":"user1@test.com","quantity":1}' &

# Terminal 2 (run immediately)
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{"eventId":"EVENT_ID","userId":"user2","userEmail":"user2@test.com","quantity":1}' &
```

## Request/Response Rules

### Required Fields

**Create Event:**
- `name` (string, max 100 chars)
- `totalTickets` (number, 1-100,000)
- `price` (number, ≥ 0)
- `eventDate` (ISO date, future)
- `venue` (string)

**Book Ticket:**
- `eventId` (valid MongoDB ObjectId)
- `userId` (string)
- `userEmail` (valid email)
- `quantity` (number, 1-10)

### Business Rules
- User can only book **once per event**
- Cannot book more tickets than available
- Cannot book for **past events**
- Cannot book for **cancelled events**
- **Rate limiting**: 5 booking attempts per minute
- **Booking reference** auto-generated (format: `BK-XXXXX-XXXXX`)

## Tech Stack
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (with Mongoose)
- **Caching:** Redis (optional)
- **Validation:** Joi
- **Logging:** Winston

## Project Structure
```
ticket-booking-system/
├── server.js              # Entry point
├── src/
│   ├── app.js             # Express app
│   ├── config/            # Database connections
│   ├── models/            # MongoDB models
│   ├── controllers/       # Route handlers
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Error handling & validation
│   └── utils/             # Utilities (logger, lock manager)
├── package.json
└── README.md
```

