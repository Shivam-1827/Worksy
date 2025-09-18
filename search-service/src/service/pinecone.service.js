
const { Pinecone } = require("@pinecone-database/pinecone");
const logger = require("../utils/logger");

class PineconeService {
  constructor() {
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
      throw new Error("Pinecone API key and index name are required.");
    }
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.indexName = process.env.PINECONE_INDEX;
  }

  async fetch(vector, topK = 5) {
    try {
      const index = this.pinecone.Index(this.indexName);
      logger.info(`Querying Pinecone index '${this.indexName}'...`);
      const results = await index.query({
        vector,
        topK,
        includeMetadata: true,
      });

      logger.info(`Found ${results.matches.length} matches.`);

      results.matches.forEach((match, index) => {
        logger.info(
          `Match ${index + 1}: Score ${match.score}, ID: ${match.id}`
        );
      });

      const matches = results.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
      }));

      return matches;
    } catch (error) {
      logger.error("Error querying Pinecone:", error);
      throw new Error("Failed to query Pinecone database.");
    }
  }
}

module.exports = new PineconeService();
