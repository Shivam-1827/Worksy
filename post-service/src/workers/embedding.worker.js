// /post-service/workers/embedding.worker.js

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const { connectRabbitMQ, getChannel } = require("../config/rabbitmq");
const { connectRedis, redisClient } = require("../config/redis");
const PostService = require("../services/post.service");
const logger = require("../utils/logger");

const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { Pinecone } = require("@pinecone-database/pinecone");

// Correct Gemini API imports
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");

// --- Gemini setup with Flash model for better quota usage ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const transcriptionModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Use Flash instead of Pro for better quota usage
});

// --- Retry configuration ---
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 60000, // Start with 60 seconds
  maxDelay: 300000, // Max 5 minutes
  backoffMultiplier: 2,
};

// --- Sleep function ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Download media file from Cloudinary ---
const downloadFileFromUrl = async (url, tempDir) => {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
      timeout: 30000, // 30 second timeout
    });

    const randomBytes = crypto.randomBytes(8).toString("hex");
    const urlExtension = url.split(".").pop().split("?")[0]; // Handle query params
    const filePath = path.join(tempDir, `${randomBytes}.${urlExtension}`);

    const writer = require("fs").createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(filePath));
      writer.on("error", (err) => {
        logger.error("Failed to write downloaded file:", err);
        reject(err);
      });
    });
  } catch (error) {
    logger.error("Failed to download file from URL:", error);
    throw error;
  }
};

// --- Check file size and compress if needed ---
const checkAndCompressFile = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    logger.info(`File size: ${fileSizeInMB.toFixed(2)} MB`);

    // If file is larger than 15MB, we might hit quota limits more easily
    if (fileSizeInMB > 15) {
      logger.warn(
        `File is quite large (${fileSizeInMB.toFixed(
          2
        )} MB). This may consume significant quota.`
      );
    }

    return { filePath, sizeInMB: fileSizeInMB };
  } catch (error) {
    logger.error("Failed to check file stats:", error);
    throw error;
  }
};

// --- Retry wrapper for API calls ---
const withRetry = async (
  operation,
  operationName,
  retries = RETRY_CONFIG.maxRetries
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isQuotaError = error.status === 429;
      const isRateLimitError = error.message && error.message.includes("quota");

      if ((isQuotaError || isRateLimitError) && attempt < retries) {
        // Extract suggested delay from error if available
        let delayMs =
          RETRY_CONFIG.baseDelay *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);

        if (error.errorDetails) {
          const retryInfo = error.errorDetails.find((detail) =>
            detail["@type"]?.includes("RetryInfo")
          );
          if (retryInfo && retryInfo.retryDelay) {
            const retrySeconds = parseInt(
              retryInfo.retryDelay.replace("s", "")
            );
            if (!isNaN(retrySeconds)) {
              delayMs = Math.max(retrySeconds * 1000, delayMs);
            }
          }
        }

        delayMs = Math.min(delayMs, RETRY_CONFIG.maxDelay);

        logger.warn(
          `${operationName} failed with quota/rate limit error. Attempt ${attempt}/${retries}. Retrying in ${Math.round(
            delayMs / 1000
          )} seconds...`
        );
        await sleep(delayMs);
        continue;
      }

      // If it's not a quota error or we've exhausted retries, throw the error
      throw error;
    }
  }
};

// --- Transcription with Gemini ---
const transcribeAudioOrVideo = async (url, postType) => {
  logger.info(`Transcribing media from URL: ${url} using Gemini Flash API.`);

  const tempDir = path.join(__dirname, "temp_downloads");
  await fs.mkdir(tempDir, { recursive: true });

  let localFilePath;

  try {
    localFilePath = await downloadFileFromUrl(url, tempDir);
    const { sizeInMB } = await checkAndCompressFile(localFilePath);

    // For very large files, we might want to skip transcription to avoid quota issues
    if (sizeInMB > 20) {
      logger.warn(
        `File too large (${sizeInMB.toFixed(
          2
        )} MB). Skipping transcription to preserve quota.`
      );
      return `[Large ${postType.toLowerCase()} file - transcription skipped to preserve API quota]`;
    }

    const mimeType = postType === "AUDIO" ? "audio/mp3" : "video/mp4";

    // Read file as base64
    const fileBuffer = await fs.readFile(localFilePath);
    const fileBase64 = fileBuffer.toString("base64");

    logger.info(
      `File prepared for Gemini processing (${sizeInMB.toFixed(2)} MB)`
    );

    const prompt = `Please provide a concise transcription of the spoken content in this ${postType.toLowerCase()}. Include only the actual spoken words without any commentary, timestamps, or formatting. If no speech is detected, respond with "[No speech detected]".`;

    // Generate content using inline data with retry mechanism
    const transcriptionOperation = async () => {
      return await transcriptionModel.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          },
        },
        { text: prompt },
      ]);
    };

    const result = await withRetry(
      transcriptionOperation,
      `Transcription for ${url}`
    );
    const response = result.response;
    const transcription = response.text();

    if (!transcription || transcription.trim().length === 0) {
      logger.warn(`Empty transcription received for URL: ${url}`);
      return `[${postType} transcription failed - empty response]`;
    }

    if (transcription.includes("[No speech detected]")) {
      logger.info(`No speech detected in ${postType} from URL: ${url}`);
      return "[No speech content detected in media]";
    }

    logger.info(
      `Transcription for media from URL: ${url} completed successfully. Length: ${transcription.length} characters`
    );

    return transcription.trim();
  } catch (error) {
    logger.error(`Transcription failed for media from URL: ${url}`, {
      error: error.message,
      status: error.status,
      statusText: error.statusText,
    });

    // Return a placeholder instead of throwing, so the embedding process can continue
    return `[${postType} transcription failed due to API quota limits - content will be processed without transcription]`;
  } finally {
    // Cleanup: remove local file
    try {
      if (localFilePath) {
        await fs.unlink(localFilePath);
        logger.info(`Cleaned up local file: ${localFilePath}`);
      }
    } catch (cleanupError) {
      logger.error("Failed to clean up local file:", cleanupError);
    }
  }
};

// --- Pinecone setup ---
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pineconeClient.Index(
  process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX
);

// --- Embedding model (Gemini) ---
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: process.env.GOOGLE_API_KEY,
});

// --- Create embeddings with retry ---
const createEmbeddingsWithRetry = async (chunks) => {
  const embeddingOperation = async () => {
    return await embeddingModel.embedDocuments(chunks);
  };

  return await withRetry(
    embeddingOperation,
    `Embedding generation for ${chunks.length} chunks`
  );
};

// --- Process incoming messages from queue ---
const processMessage = async (msg) => {
  if (!msg) return;

  let postData;
  try {
    postData = JSON.parse(msg.content.toString());
    const {
      postId,
      postType,
      mediaUrl,
      content,
      title,
      professionalTags,
      userId,
    } = postData;

    logger.info(`Processing post ${postId} of type ${postType}`);

    let transcription = "";

    // Handle different post types
    if (postType === "VIDEO" || postType === "AUDIO") {
      if (!mediaUrl) {
        throw new Error(`No media URL provided for ${postType} post ${postId}`);
      }

      // Transcribe media content with quota-aware retry
      transcription = await transcribeAudioOrVideo(mediaUrl, postType);
      logger.info(
        `Transcription completed for post ${postId}. Length: ${transcription.length} characters`
      );
    } else if (postType === "ARTICLE") {
      // For articles, use the content directly
      transcription = content || "";
    }

    // Combine title and transcription/content for better embeddings
    const fullContent = `Title: ${
      title || "Untitled"
    }\n\nContent: ${transcription}`.trim();

    if (
      !fullContent ||
      fullContent.replace(/Title:\s*\n\nContent:\s*/, "").trim().length === 0
    ) {
      logger.warn(`No meaningful content to process for post ${postId}`);
      await PostService.updatePostStatus(postId, "COMPLETED");

      // Send Redis update for empty content
      try {
        await redisClient.publish(
          "post_updates",
          JSON.stringify({
            postId,
            status: "COMPLETED",
            message: "Post processed but no content found",
            userId: userId,
          })
        );
      } catch (redisError) {
        logger.error(
          `Failed to publish Redis update for post ${postId}:`,
          redisError
        );
      }

      getChannel().ack(msg);
      return;
    }

    logger.info(
      `Full content length for post ${postId}: ${fullContent.length} characters`
    );

    // Split the content into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ";", " ", ""],
    });

    const chunks = await textSplitter.splitText(fullContent);
    logger.info(
      `Divided content into ${chunks.length} chunks for post ${postId}`
    );

    if (chunks.length === 0) {
      logger.warn(`No chunks created for post ${postId}`);
      await PostService.updatePostStatus(postId, "COMPLETED");
      getChannel().ack(msg);
      return;
    }

    // Create embeddings with retry mechanism and rate limiting
    let vectors = [];
    try {
      // Process embeddings in smaller batches to avoid quota issues
      const batchSize = 3; // Smaller batch size to be more quota-friendly

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        logger.info(
          `Processing embedding batch ${
            Math.floor(i / batchSize) + 1
          } of ${Math.ceil(chunks.length / batchSize)}`
        );

        const batchVectors = await createEmbeddingsWithRetry(batch);
        vectors.push(...batchVectors);

        // Longer delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          logger.info("Waiting 5 seconds before next batch...");
          await sleep(5000);
        }
      }
    } catch (error) {
      if (error.status === 429) {
        logger.error(
          `Embedding creation failed due to quota limits for post ${postId}. Marking as failed.`
        );
        throw new Error("API quota exceeded during embedding creation");
      }
      throw error;
    }

    logger.info(`Generated ${vectors.length} embeddings for post ${postId}`);

    // Prepare vectors for Pinecone
    const pineconeVectors = vectors.map((vector, index) => ({
      id: `${postId}-chunk-${index}`,
      values: vector,
      metadata: {
        post_id: postId,
        chunk_index: index,
        text: chunks[index],
        title: title || "Untitled",
        professional_tags: Array.isArray(professionalTags)
          ? professionalTags
          : [],
        post_type: postType,
        media_url: postType !== "ARTICLE" ? mediaUrl : undefined,
        user_id: userId,
        created_at: new Date().toISOString(),
        content_length: chunks[index].length,
      },
    }));

    // Upsert to Pinecone in batches
    const upsertBatchSize = 100;
    for (let i = 0; i < pineconeVectors.length; i += upsertBatchSize) {
      const batch = pineconeVectors.slice(i, i + upsertBatchSize);
      await pineconeIndex.upsert(batch);
      logger.info(
        `Upserted batch ${Math.floor(i / upsertBatchSize) + 1} of ${Math.ceil(
          pineconeVectors.length / upsertBatchSize
        )} for post ${postId}`
      );
    }

    logger.info(
      `Successfully stored ${pineconeVectors.length} embeddings for post ${postId} in Pinecone`
    );

    // Update post status to COMPLETED
    await PostService.updatePostStatus(postId, "COMPLETED");
    logger.info(`Post ${postId} processing completed successfully`);

    // Send real-time update via Redis
    try {
      await redisClient.publish(
        "post_updates",
        JSON.stringify({
          postId,
          status: "COMPLETED",
          message: `Post processed successfully. Created ${pineconeVectors.length} embeddings from ${chunks.length} chunks.`,
          userId: userId,
          chunksCount: chunks.length,
          embeddingsCount: pineconeVectors.length,
        })
      );
    } catch (redisError) {
      logger.error(
        `Failed to publish Redis update for post ${postId}:`,
        redisError
      );
      // Don't fail the entire process if Redis publish fails
    }

    // Acknowledge message
    getChannel().ack(msg);
    logger.info(`Message acknowledged for post ${postId}`);
  } catch (error) {
    logger.error(
      `Failed to process message for post ${postData?.postId || "unknown"}:`,
      {
        error: error.message,
        status: error.status,
        stack: error.stack,
      }
    );

    try {
      if (postData?.postId) {
        await PostService.updatePostStatus(postData.postId, "FAILED");

        // Send Redis update for failure
        await redisClient.publish(
          "post_updates",
          JSON.stringify({
            postId: postData.postId,
            status: "FAILED",
            message: `Processing failed: ${error.message}`,
            userId: postData.userId,
            errorType:
              error.status === 429 ? "QUOTA_EXCEEDED" : "PROCESSING_ERROR",
          })
        );
      }
    } catch (updateError) {
      logger.error(`Failed to update post status to FAILED:`, updateError);
    }

    // Acknowledge the message even if processing failed to avoid infinite retries
    getChannel().ack(msg);
  }
};

// --- Start Worker ---
const startWorker = async () => {
  try {
    await connectRabbitMQ();
    await connectRedis();

    const channel = getChannel();
    await channel.assertQueue("embedding_queue", { durable: true });

    // Set prefetch to process one message at a time to avoid overwhelming the API
    channel.prefetch(1);

    channel.consume("embedding_queue", processMessage, { noAck: false });
    logger.info("Embedding worker started and waiting for messages...");
    logger.info("Using Gemini Flash model for better quota efficiency");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down embedding worker...");
      try {
        await redisClient.quit();
        await channel.close();
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error("Failed to start embedding worker:", error);
    process.exit(1);
  }
};

startWorker();
