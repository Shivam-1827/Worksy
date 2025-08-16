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

const {
  GoogleGenerativeAI,
  createUserContent,
  createPartFromUri,
} = require("@google/generative-ai");

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");

// --- Gemini setup ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const transcriptionModel = genAI.getGenerativeModel({
  model: "gemini-1.5-pro-latest",
});

// --- Download media file from Cloudinary ---
const downloadFileFromUrl = async (url, tempDir) => {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    const randomBytes = crypto.randomBytes(8).toString("hex");
    const filePath = path.join(
      tempDir,
      `${randomBytes}.${url.split(".").pop()}`
    );

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

// --- Transcription with Gemini ---
const transcribeAudioOrVideo = async (url, postType) => {
  logger.info(`Transcribing media from URL: ${url} using Gemini API.`);

  const tempDir = path.join(__dirname, "temp_downloads");
  await fs.mkdir(tempDir, { recursive: true });

  let localFilePath;
  try {
    localFilePath = await downloadFileFromUrl(url, tempDir);

    const mimeType = postType === "AUDIO" ? "audio/mp3" : "video/mp4";
    const file = await genAI.files.upload({
      filePath: localFilePath,
      mimeType,
    });

    const prompt =
      postType === "VIDEO"
        ? "Transcribe the video content into a single block of text."
        : "Transcribe the audio content into a single block of text.";

    const result = await transcriptionModel.generateContent({
      contents: createUserContent([
        createPartFromUri(file.uri, file.mimeType),
        prompt,
      ]),
    });

    const transcription = result.text();
    logger.info(
      `Transcription for media from URL: ${url} completed successfully.`
    );

    // Cleanup: remove file from Gemini & local storage
    await genAI.files.delete(file.name);
    await fs.unlink(localFilePath);

    return transcription;
  } catch (error) {
    logger.error(`Transcription failed for media from URL: ${url}`, error);
    if (localFilePath) {
      try {
        await fs.unlink(localFilePath);
      } catch (cleanupError) {
        logger.error("Failed to clean up temporary file:", cleanupError);
      }
    }
    throw error;
  }
};

// --- Pinecone setup ---
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX_NAME);

// --- Embedding model (Gemini) ---
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: process.env.GOOGLE_API_KEY,
});

// --- Process incoming messages from queue ---
// /post-service/workers/embedding.worker.js

const processMessage = async (msg) => {
  if (!msg) return;

  let postData;
  try {
    postData = JSON.parse(msg.content.toString());
    const { postId, postType, mediaUrl, content, title, professionalTags } =
      postData;

    // 1. Download the media file
    const tempDir = path.join(__dirname, "temp");
    await fs.mkdir(tempDir, { recursive: true });
    const localFilePath = await downloadFileFromUrl(mediaUrl, tempDir);
    logger.info(`Downloaded media for post ${postId} to ${localFilePath}`);

    // 2. Transcribe the media
    const mediaContent = createPartFromUri(localFilePath, "video/mp4"); // Adjust mime type
    const result = await transcriptionModel.generateContent({
      contents: [createUserContent("user", [mediaContent])],
    });
    const transcription = result.response.text();
    logger.info(`Transcription for post ${postId} created successfully.`);

    // 3. Split the transcription into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });
    const chunks = await textSplitter.splitText(transcription);
    logger.info(`Divided transcription into ${chunks.length} chunks.`);

    // 4. Create embeddings using langchain.js
    const embeddingModel = new GoogleGenerativeAIEmbeddings();
    const vectors = await embeddingModel.embedDocuments(chunks);
    const pineconeIndex = pinecone.index("your-index-name"); // Use your actual index name
    logger.info(`Embeddings for post ${postId} generated.`);

    // 5. Upsert the vectors to Pinecone
    const pineconeVectors = vectors.map((vector, index) => ({
      id: `${postId}-${index}`,
      values: vector,
      metadata: {
        post_id: postId,
        chunk_index: index,
        text: chunks[index],
        title,
        professionalTags,
        postType,
      },
    }));

    await pineconeIndex.upsert(pineconeVectors);
    logger.info(`Embeddings for post ${postId} stored in Pinecone.`);

    // 6. Update post status to COMPLETED
    await PostService.updatePostStatus(postId, "COMPLETED");

    // 7. Acknowledge message
    getChannel().ack(msg);
  } catch (error) {
    logger.error(
      `Failed to process message for post ${postData?.postId}:`,
      error
    );
    await PostService.updatePostStatus(postData.postId, "FAILED");
    getChannel().ack(msg);
  }
};

// --- Start Worker ---
const startWorker = async () => {
  await connectRabbitMQ();
  await connectRedis();

  const channel = getChannel();
  await channel.assertQueue("embedding_queue", { durable: true });

  channel.consume("embedding_queue", processMessage, { noAck: false });
  logger.info("Embedding worker started and waiting for messages...");
};

startWorker();
