// /post-service/index.js

const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const { connectDB } = require("./config/database");
const { connectRabbitMQ } = require("./config/rabbitmq");
const { connectRedis } = require("./config/redis");
const { setupWebSocketServer } = require("./websocket/websocket");
const postRoutes = require("./routes/post.routes");
const logger = require("./utils/logger");
const app = express();
const server = http.createServer(app);

// Connect to all external services
Promise.all([connectDB(), connectRabbitMQ(), connectRedis()])
  .then(() => {
    logger.info("All services connected successfully");

    // Middlewares
    app.use(cors());
    app.use(bodyParser.json());

    // API Routes
    app.use("/api/v1/posts", postRoutes);

    // Setup WebSocket server
    setupWebSocketServer(server);

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`Post service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to one or more services:", err);
    process.exit(1);
  });
