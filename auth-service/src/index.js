const express = require("express");
const { connectDB, sequelize } = require("./config/database");
const { connectRedis } = require("./config/redis");
const { connectRabbitMQ } = require("./config/rabbitmq");
const http = require("http");
const { setupWebSocketServer } = require("./websocket/websocket");
const authRoutes = require("./routes/auth.routes");
const logger = require("./utils/logger");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/v1/auth", authRoutes);

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    await connectRabbitMQ();
    await sequelize.sync();

    setupWebSocketServer(server);

    server.listen(PORT, () => {
      logger.info(`Auth Service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
