# 🎫 SupportDesk — Real-Time Support Ticket System

A production-ready full-stack customer support platform inspired by Zendesk/Freshdesk.
Built with React, Node.js, MongoDB, Redis, and Socket.io.

---

## 📁 Project Structure

```
support-ticket-system/
├── backend/
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   ├── redis.js           # Redis client & cache helpers
│   │   └── logger.js          # Winston logger
│   ├── controllers/
│   │   ├── authController.js  # Register, login, profile
│   │   └── ticketController.js # Tickets + comments + stats
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication & role guards
│   │   └── validation.js      # express-validator rules
│   ├── models/
│   │   ├── User.js            # User schema (customer/agent/admin)
│   │   ├── Ticket.js          # Ticket schema with activity log
│   │   └── Comment.js         # Comment schema (supports internal notes)
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   └── tickets.js         # /api/tickets/*
│   ├── sockets/
│   │   └── socketServer.js    # Socket.io event handlers
│   ├── utils/
│   │   └── errorHandler.js    # AppError class & global handler
│   ├── server.js              # Express + Socket.io entry point
│   ├── seed.js                # Demo data seeder
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── common/        # Badge, Avatar, Modal, Layout, ProtectedRoute
        │   ├── tickets/       # TicketCard, TicketFilters
        │   ├── comments/      # CommentThread (real-time)
        │   └── notifications/ # NotificationToast
        ├── contexts/
        │   ├── AuthContext.jsx      # Auth state + JWT management
        │   ├── SocketContext.jsx    # Socket.io connection
        │   └── NotificationContext.jsx # Global toast notifications
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx       # Stats + recent activity
        │   ├── TicketList.jsx      # Filter + paginate tickets
        │   ├── TicketDetails.jsx   # Full ticket view + comments
        │   └── CreateTicket.jsx
        ├── services/
        │   └── api.js         # Axios instance + all API calls
        └── utils/
            └── helpers.js     # Formatters, constants, configs
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Redis (local or Docker) — **optional**, app runs without it
- npm or yarn

### 1. Clone and install

```bash
# Backend
cd support-ticket-system/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd ../frontend
cp .env.example .env
# Edit if your backend runs on a different port
```

### 3. Start MongoDB & Redis (optional)

```bash
# MongoDB
mongod --dbpath /data/db

# Redis (optional - via Docker)
docker run -d -p 6379:6379 redis:alpine

# Or Redis locally
redis-server
```

### 4. Seed demo data

```bash
cd backend
node seed.js
```

### 5. Start servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev   # Uses nodemon for hot reload

# Terminal 2 - Frontend
cd frontend
npm start
```

Open **http://localhost:3000**

---

## 👤 Demo Accounts

| Role     | Email                | Password  |
|----------|----------------------|-----------|
| Customer | customer@demo.com    | demo123   |
| Customer | customer2@demo.com   | demo123   |
| Agent    | agent@demo.com       | demo123   |
| Agent    | agent2@demo.com      | demo123   |

---

## 🔌 REST API Reference

### Authentication

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@example.com",
  "password": "securepass",
  "role": "customer"   // "customer" | "agent"
}

# Response: { success: true, token: "...", user: {...} }
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass"
}
```

```http
GET /api/auth/me
Authorization: Bearer <token>
```

```http
GET /api/auth/agents
Authorization: Bearer <agent_token>
# Returns list of agents for assignment dropdown
```

### Tickets

```http
GET /api/tickets?page=1&limit=10&status=open&priority=high&search=login&assignedTo=me
Authorization: Bearer <token>
# Customers see only their own tickets
# Agents see all tickets
```

```http
POST /api/tickets
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Cannot upload profile picture",
  "description": "When I try to upload a profile picture, I get a 500 error...",
  "priority": "medium",
  "category": "technical",
  "tags": ["upload", "profile"]
}
```

```http
GET /api/tickets/:id
Authorization: Bearer <token>
# Returns ticket + comments (internal notes filtered for customers)
```

```http
PATCH /api/tickets/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",     // optional
  "priority": "high",          // optional, agents only
  "assignedTo": "<userId>",    // optional, agents only
  "title": "Updated title"     // optional
}
```

```http
POST /api/tickets/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "We are investigating this issue now.",
  "isInternal": false   // true = agent-only internal note
}
```

```http
GET /api/tickets/stats
Authorization: Bearer <token>
# Returns ticket counts by status, priority, and recent activity
```

---

## ⚡ WebSocket Events

### Client → Server

| Event                  | Payload                        | Description               |
|------------------------|--------------------------------|---------------------------|
| `ticket:join`          | `ticketId: string`             | Join ticket chat room     |
| `ticket:leave`         | `ticketId: string`             | Leave ticket chat room    |
| `comment:typing`       | `{ ticketId }`                 | Broadcast typing status   |
| `comment:stop_typing`  | `{ ticketId }`                 | Stop typing broadcast     |

### Server → Client

| Event                       | Payload                       | Description                      |
|-----------------------------|-------------------------------|----------------------------------|
| `connected`                 | `{ userId, role }`            | Confirm socket auth              |
| `ticket:created`            | `Ticket`                      | New ticket created               |
| `ticket:updated`            | `Partial<Ticket>`             | Ticket data changed              |
| `ticket:status_changed`     | `{ ticketId, oldStatus, newStatus }` | Status change detail    |
| `ticket:new_notification`   | `{ message, ticket }`         | Agents only: new ticket alert    |
| `comment:new`               | `{ ticketId, comment }`       | New comment in ticket room       |
| `comment:user_typing`       | `{ userId, userName, ticketId }` | Typing indicator              |
| `comment:user_stop_typing`  | `{ userId, ticketId }`        | Stop typing                      |

---

## 🗄️ Redis Caching Strategy

| Cache Key                              | TTL      | Invalidated When               |
|----------------------------------------|----------|--------------------------------|
| `tickets:list:{filter_hash}`          | 5 min    | Ticket created/updated         |
| `tickets:detail:{ticketId}`           | 5 min    | Ticket updated / comment added |
| `tickets:stats`                        | 5 min    | Ticket created/updated         |
| `tickets:stats:user:{userId}`         | 5 min    | Customer's ticket changes      |

The app **degrades gracefully** if Redis is unavailable — all requests hit MongoDB directly.

---

## 🎫 Ticket Status Flow

```
open  →  in_progress  →  waiting_for_customer  →  resolved  →  closed
  ↑                              ↓
  └──────── (customer replies) ──┘
```

**Customer permissions:** can set status to `resolved` or `waiting_for_customer`
**Agent permissions:** can set any status

---

## 🔐 Security Features

- JWT auth with expiry (7d default)
- Password hashing with bcrypt (12 rounds)
- Rate limiting on auth endpoints (20 req / 15 min)
- Global rate limiting (100 req / 15 min)
- Helmet.js security headers
- Input validation with express-validator
- Role-based access control (RBAC)
- Customers can only access their own tickets
- Internal comments hidden from customers

---

## 🏗️ Production Considerations

### Environment Variables (backend/.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/support_tickets
JWT_SECRET=<min_32_char_random_string>
JWT_EXPIRES_IN=7d
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TTL=3600
CLIENT_URL=https://your-frontend.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend Environment (frontend/.env)
```env
REACT_APP_API_URL=https://your-api.com/api
REACT_APP_SOCKET_URL=https://your-api.com
```

### Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use a strong, unique `JWT_SECRET`
- [ ] Enable MongoDB authentication
- [ ] Set Redis password
- [ ] Configure CORS `CLIENT_URL` properly
- [ ] Set up SSL/TLS
- [ ] Enable MongoDB indexes (`npm run build` with migrations)
- [ ] Configure log rotation
- [ ] Set up process manager (PM2)

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Tailwind CSS, Axios     |
| State      | Context API + useReducer          |
| Real-time  | Socket.io Client                  |
| Backend    | Node.js, Express.js               |
| Database   | MongoDB + Mongoose                |
| Caching    | Redis (ioredis)                   |
| WebSockets | Socket.io                         |
| Auth       | JWT + bcryptjs                    |
| Validation | express-validator                 |
| Logging    | Winston                           |
| Security   | Helmet, rate-limit, CORS          |
