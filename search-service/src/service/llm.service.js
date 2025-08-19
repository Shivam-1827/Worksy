// src/services/llm.service.js
const geminiService = require("./gemini.service");
const logger = require("../utils/logger");

/**
 * An abstraction layer for LLM-related services.
 * Currently just exports the GeminiService.
 */
class LlmService {
  /**
   * Generates a response from the LLM based on a user query and context.
   * @param {string} query The user's original search query.
   * @param {string} context The context from the vector database.
   * @returns {Promise<string>} The processed LLM response.
   */
  async getResponse(query, context) {
    logger.info("Using GeminiService for LLM response.");
    return geminiService.getLlmResponse(query, context);
  }
}

module.exports = new LlmService();
