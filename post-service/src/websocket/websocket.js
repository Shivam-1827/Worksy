// /post-service/utils/websocket.js

const WebSocket = require("ws");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");

const clients = new Map(); // Store WebSocket clients by their user ID

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    logger.info("A client connected via WebSocket.");

    // For a secure, real-world application, you would pass a JWT token
    // and extract the user ID here to identify the client.
    const userId = req.headers["x-user-id"]; // This is a placeholder for a real auth method

    if (userId) {
      clients.set(userId, ws);
      logger.info(`Client ${userId} connected.`);
    } else {
      logger.warn("WebSocket connection without a user ID.");
      ws.close();
      return;
    }

    ws.on("message", (message) => {
      logger.info(
        `Received WebSocket message from client ${userId}: ${message}`
      );
      // This is where you might handle real-time chat or other client-side messages
    });

    ws.on("close", () => {
      logger.info(`Client ${userId} disconnected from WebSocket.`);
      clients.delete(userId);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error for client ${userId}:`, err);
    });
  });

  // Redis subscriber for real-time updates from the worker
  const subscriber = redisClient.duplicate();
  subscriber
    .connect()
    .then(() => {
      subscriber.subscribe("post_updates", (message) => {
        const {
          postId,
          status,
          message: statusMessage,
          userId,
        } = JSON.parse(message);
        logger.info(
          `Received Redis message for post ${postId} with status: ${status}`
        );

        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ postId, status, statusMessage }));
        }
      });
    })
    .catch((err) => {
      logger.error("Redis subscriber connection error:", err);
    });
};

module.exports = { setupWebSocketServer };
