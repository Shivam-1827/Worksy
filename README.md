# Professional Platform - Microservices Architecture

A comprehensive professional networking platform built with Node.js microservices, featuring AI-powered content processing and intelligent search capabilities.

## 🏗️ Architecture Overview

This platform consists of three main microservices:

### 1. **Auth Service** (Port 3000)
- User authentication and authorization
- JWT token management with Redis-based session control
- Password reset with OTP via email
- User profile management
- WebSocket support for real-time OTP status updates

### 2. **Post Service** (Port 3001)
- Content creation (Articles, Videos, Audio)
- Cloudinary integration for media uploads
- Background processing for content embedding
- WebSocket support for real-time post processing updates
- Professional tagging system

### 3. **Search Service** (Port 3002)
- AI-powered semantic search using vector embeddings
- Gemini AI integration for query refinement and response generation
- Pinecone vector database for similarity search
- WebSocket support for real-time search results

## 🛠️ Tech Stack

### Core Technologies
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Neon), Redis
- **Message Queue**: RabbitMQ
- **API Gateway**: Traefik (Docker) / Nginx
- **Containerization**: Docker & Docker Compose

### AI & ML
- **LLM**: Google Gemini (Flash & Pro models)
- **Embeddings**: Google Text Embedding 004
- **Vector Database**: Pinecone
- **Text Processing**: LangChain

### External Services
- **File Storage**: Cloudinary
- **Email**: Nodemailer (Gmail)
- **Real-time**: WebSocket

### Key Libraries
- **Authentication**: JWT, bcryptjs
- **Validation**: Zod
- **ORM**: Sequelize
- **Logging**: Winston
- **Rate Limiting**: express-rate-limit

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL database (Neon recommended)
- Redis instance
- RabbitMQ instance

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@host/database

# JWT Secrets
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_URL_DOCKER=amqp://guest:guest@rabbitmq:5672

# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google AI
GOOGLE_API_KEY=your-gemini-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=your-index-name
PINECONE_ENVIRONMENT=your-environment

# Logging
LOG_LEVEL=info
```

### Quick Start with Docker

1. **Clone and setup**:
```bash
git clone <repository-url>
cd professional-platform
```

2. **Start all services**:
```bash
docker-compose up -d
```

3. **Access the services**:
- API Gateway: http://localhost (Traefik dashboard: http://localhost:8080)
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- Redis: localhost:6379

### Local Development

1. **Install dependencies for each service**:
```bash
# Auth Service
cd auth-service && npm install

# Post Service  
cd post-service && npm install

# Search Service
cd search-service && npm install
```

2. **Start external dependencies**:
```bash
# Start Redis, RabbitMQ, PostgreSQL locally or use Docker
docker run -d -p 6379:6379 redis:6-alpine
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine
```

3. **Run services individually**:
```bash
# Terminal 1: Auth Service
cd auth-service && npm run dev

# Terminal 2: Post Service
cd post-service && npm run dev

# Terminal 3: Search Service  
cd search-service && npm run dev

# Terminal 4: Workers (optional, for background processing)
cd auth-service && node src/workers/email.worker.js
cd post-service && node src/workers/embedding.worker.js
cd search-service && node src/workers/search.worker.js
```

## 📡 API Endpoints

### Auth Service (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /token/refresh` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password-otp` - Reset password with OTP
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /update-password` - Change password
- `PUT /update-email` - Update email
- `POST /logout` - Logout user

### Post Service (`/api/v1/posts`)
- `POST /article` - Create article post
- `POST /media` - Create video/audio post (with file upload)
- `GET /:postId` - Get specific post

### Search Service (`/api/v1`)
- `POST /search` - Semantic search (returns searchId for WebSocket)

## 🔄 Real-time Features

### WebSocket Connections

1. **Auth Service** - OTP Status Updates:
```javascript
const ws = new WebSocket('ws://localhost:3000');
// Listen for OTP delivery status
```

2. **Post Service** - Processing Updates:
```javascript
const ws = new WebSocket('ws://localhost:3001');
// Listen for post processing status
```

3. **Search Service** - Search Results:
```javascript
const ws = new WebSocket('ws://localhost:3002?searchId=YOUR_SEARCH_ID');
// Listen for search completion
```

## 🤖 AI-Powered Features

### Content Processing
- **Automatic Transcription**: Videos and audio files are transcribed using Gemini AI
- **Text Chunking**: Content is split into semantic chunks for better search
- **Vector Embeddings**: All content is converted to embeddings for similarity search
- **Background Processing**: All AI operations happen asynchronously via RabbitMQ

### Intelligent Search
- **Query Refinement**: User queries are enhanced with AI for better results
- **Semantic Search**: Uses vector similarity rather than keyword matching
- **Contextual Responses**: AI generates responses using relevant content as context
- **Multi-modal**: Searches across articles, video transcripts, and audio content

## 🔧 Key Features

### Security
- JWT-based authentication with refresh tokens
- Redis-based session invalidation
- Rate limiting on all endpoints
- Input validation with Zod schemas
- SQL injection protection via Sequelize ORM

### Scalability
- Microservices architecture
- Message queue-based async processing
- Docker containerization
- Load balancing with Traefik
- Horizontal scaling ready

### Monitoring & Logging
- Structured logging with Winston
- Daily log rotation
- Comprehensive error handling
- Health check endpoints

### Data Management
- PostgreSQL with SSL support
- Redis for caching and sessions
- Cloudinary for media storage
- Vector embeddings in Pinecone

## 📁 Project Structure

```
professional-platform/
├── auth-service/
│   ├── src/
│   │   ├── config/          # Database, Redis, RabbitMQ configs
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation middleware
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities (logger)
│   │   ├── websocket/       # WebSocket handling
│   │   ├── workers/         # Background workers
│   │   └── index.js         # Main entry point
│   └── Dockerfile
├── post-service/
│   └── src/                 # Similar structure to auth-service
├── search-service/
│   └── src/                 # Similar structure to auth-service
├── nginx/
│   └── nginx.conf           # Nginx configuration
├── docker-compose.yml       # Docker orchestration
└── README.md
```

## 🚨 Known Issues & Considerations

1. **API Quota Management**: 
   - Gemini API has rate limits; worker implements retry logic
   - Large media files may consume significant quota

2. **File Size Limits**:
   - Cloudinary and Gemini have file size restrictions
   - Current limit: ~10MB for transcription

3. **Environment Dependencies**:
   - Requires stable internet for external AI APIs
   - Pinecone vector database requires active subscription

## 🔄 Deployment

### Docker Production Deployment
1. Update environment variables for production
2. Use production-grade PostgreSQL and Redis instances  
3. Configure proper SSL certificates
4. Set up monitoring and backup strategies
5. Scale services based on load

### Kubernetes (Future)
The microservices architecture is designed to be Kubernetes-ready with minimal modifications.




## 🔮 Future Enhancements

- [ ] User-to-user messaging
- [ ] Advanced search filters
- [ ] Content recommendation system
- [ ] Mobile app support
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Social features (likes, shares, comments)
- [ ] Integration with professional platforms (LinkedIn)

