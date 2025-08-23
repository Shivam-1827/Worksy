const WebSocket = require("ws");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");

const clients = new Map();

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    logger.info("A client connected via websocket");
    const clientId = req.headers["sec-websocket-key"];
    clients.set(clientId, ws);

    ws.on("message", (message) => {
      logger.info(
        `Received websocket message from client ${clientId}: ${message}`
      );
    });

    ws.on("close", () => {
      logger.info(`Client ${clientId} disconnected from WebSocket.`);
      clients.delete(clientId);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error for client ${clientId}:`, err);
    });
  });

  const subscriber = redisClient.duplicate();
  subscriber
    .connect()
    .then(() => {
      subscriber.subscribe("otp_status", (message) => {
        // Updated to receive clientId from the worker message
        const { eventId, status, error, clientId } = JSON.parse(message);
        logger.info(
          `Received redis message for even ${eventId} with status: ${status}`
        );

        const client = clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ eventId, status, error }));
        }
      });
    })
    .catch((err) => {
      logger.error("Redis subscriber connection error");
    });
};

module.exports = { setupWebSocketServer };
