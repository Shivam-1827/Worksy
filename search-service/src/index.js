// src/index.js (Updated)

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const express = require("express");
const http = require("http");
const cors = require("cors");
const { connectRabbitMQ } = require("./config/rabbitmq");
const { connectRedis } = require("./config/redis");
const { setupWebSocketServer } = require("./websocket/websocket"); // Import WebSocket utility
const searchRoutes = require("./routes/search.routes");
const logger = require("./utils/logger");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.use("/api/v1", searchRoutes);

// Database and Service connections
const startServer = async () => {
  try {
    await connectRedis();
    await connectRabbitMQ();

    // Setup WebSocket server AFTER the main HTTP server is created
    setupWebSocketServer(server);

    server.listen(PORT, () => {
      logger.info(`Search Service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
