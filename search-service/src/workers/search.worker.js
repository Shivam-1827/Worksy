// src/workers/search.worker.js

// Load environment variables from the root .env file
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { connectRabbitMQ, getChannel } = require("../config/rabbitmq");
const { connectRedis, redisClient } = require("../config/redis");
const logger = require("../utils/logger");
const pineconeService = require("../service/pinecone.service");
const geminiService = require("../service/gemini.service");
const llmService = require("../service/llm.service"); // New LLM service
const { format } = require("util");

const SEARCH_QUEUE = "search_queue";
const RESULT_CHANNEL = "search_results_channel";

/**
 * Processes a single search job from the RabbitMQ queue.
 * @param {object} msg The message object from the RabbitMQ queue.
 */
const processSearchJob = async (msg) => {
  if (msg) {
    const { query, searchId } = JSON.parse(msg.content.toString());

    logger.info(
      `Received search job with ID: ${searchId} for query: "${query}"`
    );

    try {
      // 1. refine query and Generate embeddings for the search query using Gemini

      const refinedQuery = await geminiService.refineQuery(query);
      logger.info(`Refined query for search ID ${searchId}: "${refinedQuery}"`);

      const queryVector = await geminiService.createEmbeddings(query);

      // 2. Query Pinecone for the top 5 most similar posts
      const pineconeMatches = await pineconeService.fetch(queryVector, 5);

      let finalResult;
      const videoLinks = [];

      if (pineconeMatches.length > 0) {
        // 3a. If matches are found, prepare context and process with the LLM
        const context = pineconeMatches
          .map(
            (match) =>
              `Content: ${match.metadata.title}\nTitle: ${
                match.metadata.text
              }\nURL: ${match.metadata.media_url || "N/A"}\n`
          )
          .join("\n\n");


        // Use the new llmService to get the response
        finalResult = await llmService.getResponse(query, context);

        // Extract video URLs from the matched metadata
        pineconeMatches.forEach((match) => {
          if (match.metadata.post_type === "VIDEO" && match.metadata.media_url) {
            videoLinks.push(match.metadata.media_url);
          }
        });
      } else {
        // 3b. If no matches, have the LLM provide a general answer
        finalResult = await llmService.getResponse(
          query,
          "No relevant context found."
        );
      }

      logger.info(finalResult);

      // 4. Publish the final result to Redis for the client
      const resultPayload = {
        searchId,
        status: "completed",
        message: "Search completed successfully",
        data: {
          text: finalResult,
          videoLinks: videoLinks,
        },
      };
      await redisClient.publish(RESULT_CHANNEL, JSON.stringify(resultPayload));
      logger.info(`Results for search ID ${searchId} published to Redis.`);
    } catch (error) {
      logger.error(`Search job failed for ID ${searchId}:`, error);
      const errorPayload = {
        searchId,
        status: "failed",
        message: "Search processing failed",
        error: error.message,
      };
      await redisClient.publish(RESULT_CHANNEL, JSON.stringify(errorPayload));
    } finally {
      // Acknowledge the message to remove it from the queue
      getChannel().ack(msg);
    }
  }
};

/**
 * Starts the worker by connecting to all necessary services and
 * setting up the queue consumer.
 */
const startWorker = async () => {
  try {
    await connectRabbitMQ();
    await connectRedis();

    const channel = getChannel();
    await channel.assertQueue(SEARCH_QUEUE, { durable: true });
    channel.prefetch(1); // Process one message at a time

    channel.consume(SEARCH_QUEUE, processSearchJob, { noAck: false });

    logger.info("Search worker started and waiting for messages...");
  } catch (error) {
    logger.error("Failed to start search worker:", error);
    process.exit(1);
  }
};

startWorker();
