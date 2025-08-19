const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const zod = require("zod");
const searchController = require("../controllers/search.controller");
const logger = require("../utils/logger");

// Define the validation schema for the search query
const searchSchema = zod.object({
  body: zod.object({
    query: zod
      .string()
      .min(1, "Search query is required."),
  }),
});

// A generic validation middleware to parse and handle errors
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
    });
    next();
  } catch (error) {
    logger.error("Validation failed:", error.errors);
    res.status(400).json({
      message: "Validation failed",
      errors: error.errors,
    });
  }
};

// Rate limiter for the search endpoint
const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // max 15 requests per minute per IP
  message:
    "Too many search requests from this IP, please try again in a minute.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply both middlewares to the search route
router.post(
  "/search",
  searchRateLimiter,
  validate(searchSchema),
  searchController.search
);

module.exports = router;
