const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const postController = require("../controllers/post.controllers");
const PostValidationMiddleware = require("../middleware/post.validation.middleware");
const authenticateToken = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const postRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/article",
  postRateLimiter,
  authenticateToken,
  PostValidationMiddleware.validate(
    PostValidationMiddleware.createArticleSchema
  ),
  postController.createPost
);

router.post(
  "/media",
  postRateLimiter,
  authenticateToken,
  upload.single("file"), // 'file' is the key for the uploaded file
  PostValidationMiddleware.validate(PostValidationMiddleware.createMediaSchema),
  postController.createPost
);

router.get("/:postId", authenticateToken, postController.getPost);

module.exports = router;
