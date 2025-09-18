
const WebSocket = require("ws");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");

const clients = new Map(); 

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    logger.info("A client connected via WebSocket.");

    const userId = req.headers["x-user-id"]; 

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
    });

    ws.on("close", () => {
      logger.info(`Client ${userId} disconnected from WebSocket.`);
      clients.delete(userId);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error for client ${userId}:`, err);
    });
  });

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
