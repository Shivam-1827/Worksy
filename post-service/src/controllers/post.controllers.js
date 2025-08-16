// /post-service/controllers/post.controllers.js

const postService = require("../services/post.service");
const logger = require("../utils/logger");

class PostController {
  async createPost(req, res) {
    try {
      const userId = req.user.id;
      let postData = { ...req.body, userId };

      let file = req.file;

      if (!file && postData.postType !== "ARTICLE" && postData.metadata?.url) {
        file = {
          secure_url: postData.metadata.url,
          public_id: postData.metadata.public_id,
          original_filename: postData.title,
          format: postData.metadata.url.split(".").pop(),
        };
        logger.info(`Using pre-uploaded Cloudinary file: ${file.secure_url}`);
      }

      // ⚠️ This is the crucial line to add or ensure is there
      if (file) {
        postData.mediaUrl = file.secure_url;
        logger.info(`File data to be used: ${file.secure_url || file.path}`);
      }

      // Pass the modified postData object to the service
      const post = await postService.createPost(postData, file);
      res.status(201).json(post);
    } catch (error) {
      logger.error("Create post failed:", error.message);
      res.status(400).json({ error: error.message });
    }
  }

  async getPost(req, res) {
    try {
      const { postId } = req.params;
      const post = await postService.getPostById(postId);
      res.status(200).json(post);
    } catch (error) {
      logger.error("Get post failed:", error.message);
      res.status(404).json({ error: error.message });
    }
  }
}

module.exports = new PostController();
