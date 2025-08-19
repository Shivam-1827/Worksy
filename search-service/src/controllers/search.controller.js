// src/api/controllers/search.controller.js
const { v4: uuidv4 } = require("uuid");
const { getChannel } = require("../config/rabbitmq");
const logger = require("../utils/logger");

class SearchController {
  async search(req, res) {
    try {
      const { query } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          message: "Search query cannot be empty.",
        });
      }

      const searchId = uuidv4();
      const channel = getChannel();

      // Publish the search query to the RabbitMQ queue
      channel.sendToQueue(
        "search_queue",
        Buffer.from(JSON.stringify({ query, searchId })),
        { persistent: true }
      );

      logger.info(`Search query "${query}" queued with ID: ${searchId}`);

      res.status(202).json({
        message: "Search request accepted. Processing...",
        searchId: searchId,
        info: "Connect to WebSocket using this searchId to get real-time updates.",
      });
    } catch (error) {
      logger.error("Failed to queue search request:", error);
      res.status(500).json({
        message: "Failed to process search request.",
      });
    }
  }
}

module.exports = new SearchController();
