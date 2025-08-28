# Professional Platform - Microservices RAG Application

A sophisticated microservices-based platform for professional content sharing and intelligent search, featuring advanced RAG (Retrieval-Augmented Generation) capabilities with real-time processing and WebSocket communications.

## 📁 Directory Structure

```
professional-platform/
├── README.md
├── docker-compose.yml
├── .env
├── .gitignore
│
├── auth-service/
│   ├── src/
│   │   ├── Dockerfile
│   │   ├── index.js                    # Main application entry point
│   │   ├── config/
│   │   │   ├── database.js             # PostgreSQL connection setup
│   │   │   ├── rabbitmq.js             # RabbitMQ connection & retry logic
│   │   │   └── redis.js                # Redis client configuration
│   │   ├── controllers/
│   │   │   └── auth.controllers.js     # Authentication endpoints logic
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      # JWT token validation
│   │   │   └── validation.middleware.js # Zod schema validation
│   │   ├── models/
│   │   │   └── user.model.js           # User Sequelize model
│   │   ├── routes/
│   │   │   └── auth.routes.js          # Authentication API routes
│   │   ├── services/
│   │   │   └── auth.service.js         # Business logic & database operations
│   │   ├── utils/
│   │   │   └── logger.js               # Winston logging configuration
│   │   ├── websocket/
│   │   │   └── websocket.js            # WebSocket server for real-time updates
│   │   └── workers/
│   │       └── email.worker.js         # Email sending background worker
│   ├── logs/
│   │   └── archived/                   # Rotated log files
│   ├── package.json
│   └── package-lock.json
│
├── post-service/
│   ├── src/
│   │   ├── Dockerfile
│   │   ├── index.js                    # Main application entry point
│   │   ├── config/
│   │   │   ├── database.js             # PostgreSQL connection
│   │   │   ├── rabbitmq.js             # RabbitMQ setup
│   │   │   └── redis.js                # Redis configuration
│   │   ├── controllers/
│   │   │   └── post.controllers.js     # Post creation & retrieval logic
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      # JWT authentication
│   │   │   ├── post.validation.middleware.js # Post validation schemas
│   │   │   └── upload.middleware.js    # Cloudinary file upload
│   │   ├── models/
│   │   │   └── post.model.js           # Post Sequelize model
│   │   ├── routes/
│   │   │   └── post.routes.js          # Post API routes
│   │   ├── services/
│   │   │   └── post.service.js         # Post business logic
│   │   ├── utils/
│   │   │   ├── logger.js               # Winston logging
│   │   │   └── multer.js               # Local file upload (backup)
│   │   ├── websocket/
│   │   │   └── websocket.js            # Real-time post status updates
│   │   └── workers/
│   │       └── embedding.worker.js     # RAG processing worker
│   ├── logs/
│   │   └── archived/
│   ├── package.json
│   └── package-lock.json
│
├── search-service/
│   ├── src/
│   │   ├── Dockerfile
│   │   ├── index.js                    # Main application entry point
│   │   ├── config/
│   │   │   ├── rabbitmq.js             # RabbitMQ connection
│   │   │   └── redis.js                # Redis configuration
│   │   ├── controllers/
│   │   │   └── search.controller.js    # Search request handling
│   │   ├── routes/
│   │   │   └── search.routes.js        # Search API routes with validation
│   │   ├── service/
│   │   │   ├── gemini.service.js       # Google AI integration
│   │   │   ├── llm.service.js          # LLM abstraction layer
│   │   │   └── pinecone.service.js     # Vector database operations
│   │   ├── utils/
│   │   │   └── logger.js               # Winston logging
│   │   ├── websocket/
│   │   │   └── websocket.js            # Real-time search results
│   │   └── workers/
│   │       └── search.worker.js        # RAG search processing
│   ├── logs/
│   │   └── archived/
│   ├── package.json
│   └── package-lock.json
│
└── infrastructure/
    ├── traefik/                        # Reverse proxy configuration
    ├── rabbitmq/                       # Message queue data
    └── redis/                          # Cache data
```

## 🏗️ Architecture Overview

This application implements a distributed microservices architecture with three main services:

### Core Services
- **Auth Service (Port 3000)** - User authentication, authorization, and profile management
- **Post Service (Port 3001)** - Content creation, media handling, and post management  
- **Search Service (Port 3002)** - Intelligent RAG-powered search with vector embeddings

### Infrastructure Components
- **Traefik** - Dynamic reverse proxy and load balancer
- **RabbitMQ** - Message queue for asynchronous processing
- **Redis** - Caching, session management, and pub/sub messaging
- **PostgreSQL** - Primary database (via Neon)
- **Pinecone** - Vector database for embeddings storage
- **Cloudinary** - Media file storage and processing

## 🧠 RAG (Retrieval-Augmented Generation) Implementation

This platform implements a comprehensive RAG system with the following workflow:

### 1. Content Processing Pipeline
```
User Content → Post Service → RabbitMQ Queue → Embedding Worker
     ↓              ↓              ↓              ↓
 Article Text   Video/Audio    Background      AI Processing
     ↓          Transcription   Processing         ↓
 Text Chunks   ←  Gemini AI  ←      ↓         → Vector DB
     ↓              ↓              ↓              ↓
 Embeddings  → Google AI → Text Splitting → Pinecone Storage
```

### 2. Search & Retrieval Pipeline
```
User Query → Search Service → Query Enhancement → Vector Search
     ↓             ↓              ↓                 ↓
WebSocket     RabbitMQ      Gemini Refinement   Pinecone Query
     ↓             ↓              ↓                 ↓
Real-time    Search Worker  → Context Assembly → LLM Response
Results    ←      ↓              ↓                 ↓
     ↑         Redis        Relevant Chunks → Final Answer
     └────── Pub/Sub ←────────────┘
```

### Key RAG Features
- **Multi-Modal Content Support**: Processes articles, videos, and audio files
- **Automatic Transcription**: Uses Google Gemini Flash for media-to-text conversion
- **Intelligent Chunking**: LangChain RecursiveCharacterTextSplitter for optimal text segments
- **Vector Embeddings**: Google's text-embedding-004 model for semantic understanding
- **Semantic Search**: Pinecone vector database for similarity matching
- **Query Enhancement**: AI-powered query refinement for better results
- **Context-Aware Responses**: LLM generates answers using retrieved relevant content
- **Real-Time Processing**: WebSocket updates for search progress and results

## 🚀 Service Details

### Auth Service (`auth-service/`)
**Responsibilities:**
- User registration and authentication
- JWT token management (access/refresh)
- Password reset via email OTP
- Profile management
- Session invalidation

**Key Components:**
- `auth.service.js` - Core authentication logic
- `email.worker.js` - Background email processing
- `websocket.js` - Real-time OTP status updates
- `auth.middleware.js` - JWT validation and session checking

### Post Service (`post-service/`)
**Responsibilities:**
- Content creation (articles, videos, audio)
- Media file upload to Cloudinary
- Content queuing for RAG processing
- Post status tracking

**Key Components:**
- `post.service.js` - Content creation and management
- `upload.middleware.js` - Cloudinary integration
- `embedding.worker.js` - RAG processing worker (transcription + embeddings)
- `post.validation.middleware.js` - Multi-format content validation

### Search Service (`search-service/`)
**Responsibilities:**
- Natural language search processing
- Vector similarity search
- LLM response generation
- Real-time result delivery

**Key Components:**
- `search.worker.js` - Main RAG search processing
- `gemini.service.js` - Google AI integration (embeddings + LLM)
- `pinecone.service.js` - Vector database operations
- `llm.service.js` - Response generation abstraction

## 🛠️ Technology Stack

### Backend Framework
- **Node.js** with Express.js
- **Sequelize** ORM with PostgreSQL
- **Docker** containerization with Docker Compose
- **Traefik** reverse proxy and load balancing

### AI/ML Integration
- **Google Gemini Flash** - Media transcription and query refinement
- **Google text-embedding-004** - Vector embeddings generation
- **LangChain** - Text processing and intelligent chunking
- **Pinecone** - Vector database for semantic search

### Message Queue & Real-Time
- **RabbitMQ** - Asynchronous job processing with retry logic
- **Redis** - Session storage, caching, and pub/sub messaging
- **WebSocket** - Real-time updates for processing status and search results

### Authentication & Security
- **JWT** - Access and refresh token system
- **bcryptjs** - Password hashing
- **Zod** - Input validation and schema enforcement
- **Express Rate Limit** - API rate limiting
- **CORS** - Cross-origin request security

### Media & Storage
- **Cloudinary** - Media storage, optimization, and CDN
- **Multer** - File upload handling
- **Nodemailer** - Email service integration

### Logging & Monitoring
- **Winston** - Structured logging with daily rotation
- **Morgan** - HTTP request logging
- **Daily Rotate File** - Log file management

## 📦 Installation & Setup

### Prerequisites
```bash
# Required software
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

# Required accounts/services
- Neon PostgreSQL database
- Google AI API key
- Pinecone vector database
- Cloudinary account
- Gmail App Password (for email service)
```

### Environment Configuration
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Authentication Secrets
ACCESS_TOKEN_SECRET=your_super_secret_access_token_key_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_min_32_chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email Service (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google AI Configuration
GOOGLE_API_KEY=your-google-ai-api-key

# Pinecone Vector Database
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=your-index-name
PINECONE_ENVIRONMENT=your-environment

# Service URLs (Docker Internal)
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Optional: Local Development URLs
REDIS_URL_LOCAL=redis://localhost:6379
RABBITMQ_URL_LOCAL=amqp://localhost:5672
```

### Quick Start with Docker

1. **Clone Repository**
```bash
git clone <repository-url>
cd professional-platform
```

2. **Environment Setup**
```bash
# Copy and configure environment variables
cp .env.example .env
nano .env  # Edit with your configuration
```

3. **Start All Services**
```bash
# Build and start all services
docker-compose up -d

# View startup logs
docker-compose logs -f
```

4. **Verify Deployment**
```bash
# Check service health
docker-compose ps

# Test API endpoints
curl http://localhost/auth/api/v1/auth/health
curl http://localhost/post/api/v1/posts/health  
curl http://localhost/search/api/v1/health
```

### Local Development Setup

1. **Install Dependencies**
```bash
# Install for each service
cd auth-service && npm install
cd ../post-service && npm install  
cd ../search-service && npm install
```

2. **Start Infrastructure**
```bash
# Start only infrastructure services
docker-compose up -d redis rabbitmq
```

3. **Run Services Locally**
```bash
# Terminal 1: Auth Service
cd auth-service && npm run dev

# Terminal 2: Post Service  
cd post-service && npm run dev

# Terminal 3: Search Service
cd search-service && npm run dev
```

## 🔌 API Documentation

### Authentication Endpoints (`/auth/api/v1/auth/`)

#### User Registration
```http
POST /register
Content-Type: application/json

{
  "email": "developer@example.com",
  "password": "SecurePass123!",
  "professionalTitle": "Senior Full Stack Developer",
  "location": "San Francisco, CA"
}

Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "developer@example.com",
    "professionalTitle": "Senior Full Stack Developer",
    "location": "San Francisco, CA"
  }
}
```

#### User Login
```http
POST /login
Content-Type: application/json

{
  "email": "developer@example.com", 
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "user": { "id": "uuid", "email": "developer@example.com" },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

#### Password Reset Flow
```http
# Step 1: Request OTP
POST /forgot-password
{
  "email": "developer@example.com"
}

# Step 2: Reset with OTP (received via email)
POST /reset-password-otp
{
  "email": "developer@example.com",
  "otp": "123456", 
  "newPassword": "NewSecurePass123!"
}
```

### Content Management Endpoints (`/post/api/v1/posts/`)

#### Create Article
```http
POST /article
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Advanced React Performance Optimization",
  "content": "In this comprehensive guide, we'll explore...",
  "postType": "ARTICLE",
  "professionalTags": ["react", "performance", "javascript", "frontend"]
}

Response: 201 Created
{
  "success": true,
  "message": "Post created successfully", 
  "data": {
    "id": "post-uuid",
    "title": "Advanced React Performance Optimization",
    "status": "PROCESSING"
  }
}
```

#### Upload Media Content
```http
POST /media
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

file: <video-or-audio-file>
title: "React Hooks Tutorial - Complete Guide"
postType: "VIDEO"
professionalTags: ["react", "hooks", "tutorial", "javascript"]

Response: 201 Created
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "post-uuid", 
    "mediaUrl": "https://res.cloudinary.com/...",
    "status": "PROCESSING"
  }
}
```

### Intelligent Search Endpoints (`/search/api/v1/`)

#### Perform RAG Search
```http
POST /search
Content-Type: application/json

{
  "query": "How can I optimize React component performance and avoid unnecessary re-renders?"
}

Response: 202 Accepted
{
  "message": "Search request accepted. Processing...",
  "searchId": "search-uuid",
  "info": "Connect to WebSocket using this searchId to get real-time updates."
}
```

#### WebSocket Real-Time Results
```javascript
// Connect to search results WebSocket
const ws = new WebSocket(`ws://localhost/search?searchId=${searchId}`);

ws.onmessage = (event) => {
  const result = JSON.parse(event.data);
  /*
  {
    "searchId": "search-uuid",
    "status": "completed",
    "statusMessage": "Search completed successfully",
    "data": {
      "text": "To optimize React component performance and avoid unnecessary re-renders, you can use several techniques:\n\n1. **React.memo()**: Wrap functional components to prevent re-renders when props haven't changed...",
      "videoLinks": [
        "https://res.cloudinary.com/your-cloud/video/upload/react-performance-tutorial.mp4"
      ]
    }
  }
  */
};
```

## 🔄 RAG Processing Workflow

### Content Processing (Post Service → Embedding Worker)
```
graph TD
    A[User uploads content] → B[Post Service validates]
    B → C[Store in PostgreSQL]
    C → D[Queue in RabbitMQ]
    D → E[Embedding Worker processes]
    E → F{Content Type?}
    F →|Article| G[Extract text content]
    F →|Video/Audio| H[Transcribe with Gemini AI]
    G → I[Text chunking with LangChain]
    H → I
    I → J[Generate embeddings with Google AI]
    J → K[Store vectors in Pinecone]
    K → L[Update post status to COMPLETED]
    L → M[Notify user via WebSocket]
```

### Search Processing (Search Service → Search Worker)
```
graph TD
    A[User submits query] → B[Search Service queues request]
    B → C[Search Worker processes]
    C → D[Refine query with Gemini AI]
    D → E[Generate query embedding]
    E → F[Vector search in Pinecone]
    F → G{Results found?}
    G →|Yes| H[Assemble context from matches]
    G →|No| I[Use general knowledge context]
    H → J[Generate response with LLM]
    I → J
    J → K[Extract video links]
    K → L[Send results via WebSocket]
```

## 🔐 Security Implementation

### Authentication Security
- **JWT Tokens**: Secure access/refresh token system
- **Password Hashing**: bcryptjs with salt rounds
- **Session Management**: Redis-based token invalidation
- **Rate Limiting**: Configurable per-endpoint limits

### API Security
- **Input Validation**: Zod schema validation for all endpoints
- **CORS Configuration**: Controlled cross-origin access
- **File Upload Security**: Type and size validation
- **SQL Injection Protection**: Sequelize ORM parameterized queries

### Infrastructure Security
- **SSL/TLS**: Encrypted database connections
- **Docker Security**: Non-root containers
- **Environment Variables**: Sensitive data isolation
- **Network Isolation**: Docker internal networks

## 📊 Monitoring & Observability

### Logging Strategy
```
/logs/archived/
├── YYYY-MM-DD-app.log          # Combined application logs
├── YYYY-MM-DD-error.log        # Error-only logs
└── (older logs compressed)      # Automatic compression and rotation
```

### Log Levels
- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues or degraded performance
- **INFO**: General application flow and status updates
- **HTTP**: Request/response logging
- **DEBUG**: Detailed troubleshooting information

### Service Health Monitoring
```bash
# Check all services
docker-compose ps

# Monitor specific service logs
docker-compose logs -f auth-api
docker-compose logs -f post-worker
docker-compose logs -f search-worker

# Check infrastructure
docker-compose logs -f rabbitmq
docker-compose logs -f redis
```

### Performance Monitoring
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Queue Metrics**: Message rates, queue lengths, processing times
- **Redis Monitoring**: Connection counts, memory usage
- **API Response Times**: Logged with Winston HTTP transport

## 🚦 Common Usage Patterns

### Complete User Journey Example

1. **User Registration & Authentication**
```bash
# Register new user
curl -X POST http://localhost/auth/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "expert@example.com",
    "password": "SecurePass123!",
    "professionalTitle": "React Specialist",
    "location": "Remote"
  }'

# Login to get tokens
curl -X POST http://localhost/auth/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "expert@example.com",
    "password": "SecurePass123!"
  }'
```

2. **Content Creation**
```bash
# Create an article
curl -X POST http://localhost/post/api/v1/posts/article \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Performance Best Practices",
    "content": "Performance optimization is crucial...",
    "postType": "ARTICLE",
    "professionalTags": ["react", "performance", "optimization"]
  }'

# Upload video content
curl -X POST http://localhost/post/api/v1/posts/media \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@tutorial-video.mp4" \
  -F "title=React Hooks Deep Dive" \
  -F "postType=VIDEO" \
  -F "professionalTags=react,hooks,tutorial"
```

3. **Intelligent Search**
```bash
# Perform search
curl -X POST http://localhost/search/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to prevent unnecessary re-renders in React?"
  }'
```

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Services Not Starting
```bash
# Check Docker status
docker-compose ps

# View service logs
docker-compose logs auth-api
docker-compose logs post-worker

# Restart specific service
docker-compose restart auth-api
```

#### 2. Database Connection Issues
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test database connection
docker-compose exec auth-api npm run db:test

# Check SSL requirements for Neon
# Ensure ?sslmode=require is in connection string
```

#### 3. RabbitMQ Connection Problems
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access management interface
open http://localhost:15672

# Restart message queue
docker-compose restart rabbitmq
```

#### 4. AI API Issues
```bash
# Check Google AI API key
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models

# Verify Pinecone connectivity
curl -H "Api-Key: $PINECONE_API_KEY" \
  https://controller.$PINECONE_ENVIRONMENT.pinecone.io/databases

# Monitor API quota usage in respective dashboards
```

#### 5. File Upload Problems
```bash
# Check Cloudinary configuration
docker-compose exec post-api node -e "
  console.log('Cloudinary Config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET'
  })
"

# Test file upload endpoint
curl -X POST http://localhost/post/api/v1/posts/media \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test.mp4" \
  -F "title=Test Upload" \
  -F "postType=VIDEO"
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_posts_user_id ON posts(userId);
CREATE INDEX idx_posts_type_status ON posts(postType, status);
CREATE INDEX idx_posts_created_at ON posts(createdAt);
```

#### 2. Redis Optimization
```javascript
// Configure Redis for optimal performance
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
  },
  retry_strategy: (times) => Math.min(times * 50, 2000)
});
```

#### 3. Worker Optimization
```javascript
// Adjust worker concurrency based on resources
channel.prefetch(1); // Process one message at a time
// Increase for better throughput if resources allow
```

## 🔄 Deployment & Scaling

### Production Deployment
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  auth-api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
```

### Horizontal Scaling
```bash
# Scale specific services
docker-compose up -d --scale auth-api=3
docker-compose up -d --scale post-worker=2
docker-compose up -d --scale search-worker=2
```

### Load Balancing
Traefik automatically load balances between multiple instances:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.auth.rule=PathPrefix(`/auth`)"
  - "traefik.http.services.auth.loadbalancer.server.port=3000"
```

## 🤝 Contributing

### Development Workflow
1. **Fork & Clone**
```bash
git clone <your-fork-url>
cd professional-platform
git checkout -b feature/your-feature-name
```

2. **Setup Development Environment**
```bash
# Install dependencies
npm run install:all

# Start development environment
docker-compose -f docker-compose.dev.yml up -d
npm run dev:all
```

3. **Testing**
```bash
# Run unit tests
npm test

# Run integration tests  
npm run test:integration

# Test API endpoints
npm run test:api
```

4. **Submit Changes**
```bash
git add .
git commit -m "feat: add new search functionality"
git push origin feature/your-feature-name
# Create pull request
```

### Code Standards
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Zod**: Input validation schemas
- **Winston**: Structured logging
- **Jest**: Unit and integration testing



## 🙏 Acknowledgments

- **Google AI** - Gemini models for transcription and embeddings
- **Pinecone** - Vector database for semantic search
- **Cloudinary** - Media storage and processing
- **LangChain** - Text processing and chunking utilities
- **OpenSource Community** - All the amazing libraries that make this possible

---

