// /post-service/controllers/post.controllers.js

const postService = require("../services/post.service");
const logger = require("../utils/logger");

class PostController {
  async createPost(req, res) {
    try {
      const userId = req.user.id;
      let postData = { ...req.body, userId };
      let file = req.file;

      logger.info(`Create post request for user ${userId}:`, {
        postType: postData.postType,
        hasFile: !!file,
        bodyMediaUrl: postData.mediaUrl,
        hasMetadata: !!postData.metadata,
      });

      // Handle the case where file was pre-uploaded to Cloudinary
      // and the URL is provided in metadata
      if (!file && postData.postType !== "ARTICLE" && postData.metadata?.url) {
        // Create a file-like object from metadata
        file = {
          secure_url: postData.metadata.url,
          path: postData.metadata.url,
          public_id: postData.metadata.public_id,
          original_filename: postData.metadata.file_name || postData.title,
          originalname: postData.metadata.file_name || postData.title,
          format:
            postData.metadata.format || postData.metadata.url.split(".").pop(),
          bytes: postData.metadata.file_size,
        };
        logger.info(
          `Using pre-uploaded Cloudinary file: ${file.secure_url || file.path}`
        );
      }

      // Set mediaUrl in postData if we have a file
      if (file && (file.secure_url || file.path)) {
        postData.mediaUrl = file.secure_url || file.path;
        logger.info(`File data to be used: ${postData.mediaUrl}`);
      }

      // Additional validation for media posts
      if (postData.postType === "VIDEO" || postData.postType === "AUDIO") {
        if (!file && !postData.mediaUrl && !postData.metadata?.url) {
          logger.error(
            `Media post creation failed: No media source provided for ${postData.postType}`
          );
          return res.status(400).json({
            error: `${postData.postType} posts require either an uploaded file or a media URL`,
          });
        }
      }

      // Pass the data to the service
      const post = await postService.createPost(postData, file);

      logger.info(`Post created successfully: ${post.id}`);
      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      logger.error("Create post failed:", error.message);
      logger.error("Full error:", error);

      // Return more specific error messages
      if (error.message.includes("File data or mediaUrl is required")) {
        return res.status(400).json({
          error: "Media upload required",
          message:
            "Please upload a file or provide a valid media URL for video/audio posts",
          details: error.message,
        });
      }

      res.status(400).json({
        error: "Post creation failed",
        message: error.message,
      });
    }
  }

  async getPost(req, res) {
    try {
      const { postId } = req.params;
      const post = await postService.getPostById(postId);
      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      logger.error("Get post failed:", error.message);
      res.status(404).json({
        error: "Post not found",
        message: error.message,
      });
    }
  }
}

module.exports = new PostController();
