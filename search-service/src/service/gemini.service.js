
const { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage } = require("@langchain/core/messages");
const logger = require("../utils/logger");

class GeminiService {
  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables.");
    }
    this.embeddingsModel = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "text-embedding-004",
    });
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-1.5-flash",
    });
  }

  async createEmbeddings(text) {
    try {
      logger.info("Generating embeddings for text...");
      const embeddings = await this.embeddingsModel.embedDocuments([text]);
      return embeddings[0];
    } catch (error) {
      logger.error("Error creating embeddings:", error);
      throw new Error("Failed to create embeddings.");
    }
  }

  // New method to refine the user's search query
  async refineQuery(query) {
    try {
      logger.info("Refining user query with LLM...");
      const prompt = `
        You are an expert search query refiner. A user has submitted a search query.
        Your task is to rephrase and expand upon this query to make it more precise and detailed for a vector database search.
        
        Example:
        User query: "React forms"
        Refined query: "Best practices for building forms in React using libraries like Formik or React Hook Form, including validation and state management."

        Example:
        User query: "what is kubernetes"
        Refined query: "A comprehensive guide to Kubernetes, explaining its core concepts like pods, services, and deployments, and how it's used for container orchestration."
        
        Refined query for user query: "${query}"
      `;
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    } catch (error) {
      logger.error("Error refining query:", error);
      throw new Error("Failed to refine query.");
    }
  }

  async getLlmResponse(query, context) {
    try {
      logger.info("Generating LLM response...");
      const prompt = `
        You are an expert for local service professionals.
        Based on the following context, provide a detailed and helpful solution.
        If the context does not contain a solution, state that and then provide
        a solution from your general knowledge.
        
        User Query: ${query}
        
        Context from database:
        ${context}
      `;
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content;
    } catch (error) {
      logger.error("Error getting LLM response:", error);
      throw new Error("Failed to get LLM response.");
    }
  }
}

module.exports = new GeminiService();