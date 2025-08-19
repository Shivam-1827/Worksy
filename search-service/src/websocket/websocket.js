// src/websocket.js

const WebSocket = require("ws");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");

const clients = new Map(); // Store WebSocket clients by search ID

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    logger.info("A client connected via WebSocket.");

    // The client sends the searchId as a URL parameter
    const searchId = new URL(
      req.url,
      `http://${req.headers.host}`
    ).searchParams.get("searchId");
    if (!searchId) {
      logger.warn(
        "WebSocket connection attempted without a searchId. Closing connection."
      );
      ws.close();
      return;
    }

    clients.set(searchId, ws);
    logger.info(`Client connected for searchId: ${searchId}`);

    ws.on("close", () => {
      logger.info(
        `Client for searchId ${searchId} disconnected from WebSocket.`
      );
      clients.delete(searchId);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error for searchId ${searchId}:`, err);
    });
  });

  // Redis subscriber for real-time updates from the worker
  const subscriber = redisClient.duplicate();
  subscriber
    .connect()
    .then(() => {
      subscriber.subscribe("search_results_channel", (message) => {
        const {
          searchId,
          status,
          message: statusMessage,
          data,
        } = JSON.parse(message);
        logger.info(
          `Received Redis message for searchId ${searchId} with status: ${status}`
        );

        const client = clients.get(searchId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({ searchId, status, statusMessage, data })
          );
        }
      });
    })
    .catch((err) => {
      logger.error("Redis subscriber connection error:", err);
    });
};

module.exports = { setupWebSocketServer };
