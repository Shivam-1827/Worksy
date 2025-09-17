require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { connectRabbitMQ, getChannel } = require("../config/rabbitmq");
const { connectRedis, redisClient } = require("../config/redis");
const logger = require("../utils/logger");
const pineconeService = require("../service/pinecone.service");
const geminiService = require("../service/gemini.service");
const llmService = require("../service/llm.service");

const SEARCH_QUEUE = "search_queue";
const RESULT_CHANNEL = "search_results_channel";

// Add similarity threshold
const SIMILARITY_THRESHOLD = 0.3; // Adjust based on your needs

const processSearchJob = async (msg) => {
  if (msg) {
    const { query, searchId } = JSON.parse(msg.content.toString());

    logger.info(
      `Received search job with ID: ${searchId} for query: "${query}"`
    );

    try {
      // 1. Try both original and refined query
      logger.info(`Original query: "${query}"`);

      // First, try with the original query
      let queryVector = await geminiService.createEmbeddings(query);
      logger.info(
        `Generated embedding vector of length: ${queryVector.length}`
      );

      // Query Pinecone with original query
      let pineconeMatches = await pineconeService.fetch(queryVector, 10); // Get more results initially

      // Log detailed similarity scores
      logger.info(
        `Pinecone returned ${pineconeMatches.length} matches for original query`
      );
      pineconeMatches.forEach((match, index) => {
        logger.info(`Match ${index + 1}:`, {
          score: match.score,
          id: match.id,
          title: match.metadata?.title,
          postType: match.metadata?.post_type,
          textPreview: match.metadata?.text?.substring(0, 150) + "...",
        });
      });

      // Filter matches by similarity threshold
      let goodMatches = pineconeMatches.filter(
        (match) => match.score >= SIMILARITY_THRESHOLD
      );
      logger.info(
        `Found ${goodMatches.length} matches above threshold ${SIMILARITY_THRESHOLD}`
      );

      // If no good matches with original query, try refined query
      if (goodMatches.length === 0) {
        logger.info(
          "No good matches with original query, trying refined query..."
        );

        const refinedQuery = await geminiService.refineQuery(query);
        logger.info(`Refined query: "${refinedQuery}"`);

        queryVector = await geminiService.createEmbeddings(refinedQuery);
        pineconeMatches = await pineconeService.fetch(queryVector, 10);

        logger.info(
          `Pinecone returned ${pineconeMatches.length} matches for refined query`
        );
        pineconeMatches.forEach((match, index) => {
          logger.info(`Refined Match ${index + 1}:`, {
            score: match.score,
            id: match.id,
            title: match.metadata?.title,
            postType: match.metadata?.post_type,
            textPreview: match.metadata?.text?.substring(0, 150) + "...",
          });
        });

        goodMatches = pineconeMatches.filter(
          (match) => match.score >= SIMILARITY_THRESHOLD
        );
        logger.info(
          `Found ${goodMatches.length} matches above threshold with refined query`
        );
      }

      // Try different similarity threshold if still no matches
      if (goodMatches.length === 0) {
        const lowerThreshold = 0.15;
        goodMatches = pineconeMatches.filter(
          (match) => match.score >= lowerThreshold
        );
        logger.info(
          `Using lower threshold ${lowerThreshold}: found ${goodMatches.length} matches`
        );
      }

      let finalResult;
      const videoLinks = [];

      if (goodMatches.length > 0) {
        // Take top 5 good matches
        const topMatches = goodMatches.slice(0, 5);

        // Prepare context - match the format used during embedding creation
        const context = topMatches
          .map((match) => {
            // Try to recreate the original format used during embedding
            const title = match.metadata?.title || "Untitled";
            const content = match.metadata?.text || "";
            return `Title: ${title}\n\nContent: ${content}`;
          })
          .join("\n\n---\n\n");

        logger.info(
          `Context being sent to LLM (first 500 chars): ${context.substring(
            0,
            500
          )}...`
        );

        finalResult = await llmService.getResponse(query, context);

        // Extract video URLs
        topMatches.forEach((match) => {
          if (
            match.metadata?.post_type === "VIDEO" &&
            match.metadata?.media_url
          ) {
            videoLinks.push(match.metadata.media_url);
          }
        });

        logger.info(`Found ${videoLinks.length} video links in results`);
      } else {
        logger.info(
          "No matches found above any threshold, providing general response"
        );
        finalResult = await llmService.getResponse(
          query,
          "No relevant context found in the database."
        );
      }

      // 4. Publish results
      const resultPayload = {
        searchId,
        status: "completed",
        message: "Search completed successfully",
        data: {
          text: finalResult,
          videoLinks: videoLinks,
          matchCount: goodMatches.length,
          topScore: goodMatches.length > 0 ? goodMatches[0].score : 0,
          debug: {
            originalQuery: query,
            totalMatches: pineconeMatches.length,
            matchesAboveThreshold: goodMatches.length,
            topScores: pineconeMatches
              .slice(0, 3)
              .map((m) => ({ id: m.id, score: m.score })),
          },
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
      getChannel().ack(msg);
    }
  }
};

const startWorker = async () => {
  try {
    await connectRabbitMQ();
    await connectRedis();

    const channel = getChannel();
    await channel.assertQueue(SEARCH_QUEUE, { durable: true });
    channel.prefetch(1);

    channel.consume(SEARCH_QUEUE, processSearchJob, { noAck: false });

    logger.info("Search worker started and waiting for messages...");
  } catch (error) {
    logger.error("Failed to start search worker:", error);
    process.exit(1);
  }
};

startWorker();
