// /post-service/services/post.service.js

const Post = require("../models/post.model");
const logger = require("../utils/logger");
const { getChannel } = require("../config/rabbitmq");

class PostService {
  async createPost(postData, file) {
    try {
      const { userId, title, content, professionalTags, postType, mediaUrl } =
        postData;

      // Normalize tags into an array
      let tags = professionalTags;
      if (typeof tags === "string") {
        try {
          tags = JSON.parse(tags); // case: stringified array
        } catch {
          tags = tags.split(",").map((t) => t.trim()); // case: comma-separated
        }
      }
      if (!Array.isArray(tags)) {
        tags = tags ? [tags] : [];
      }

      let post;
      const status = "PROCESSING";

      if (postType === "ARTICLE") {
        // Save article posts
        post = await Post.create({
          userId,
          title,
          content,
          professionalTags: tags,
          postType,
          status,
        });
      } else if (postType === "VIDEO" || postType === "AUDIO") {
        let finalUrl;
        let metadata = postData.metadata;

        // Case 1: A file was uploaded via Multer
        if (file && file.secure_url) {
          finalUrl = file.secure_url;
          metadata = {
            public_id: file.public_id,
            url: file.secure_url,
            file_name: file.original_filename,
            format: file.format,
          };
        }
        // Case 2: A media URL was provided in the request body
        else if (mediaUrl) {
          finalUrl = mediaUrl;
        }

        // Check if a URL was successfully determined
        if (!finalUrl) {
          throw new Error(
            "File data or mediaUrl is required for this post type."
          );
        }

        // Save video/audio posts
        post = await Post.create({
          userId,
          title,
          professionalTags: tags,
          postType,
          metadata,
          mediaUrl: finalUrl, // Use the determined finalUrl
          status,
        });
      }

      logger.info(
        `New post created by user ${userId} with type ${postType}: ${post.id}`
      );

      // Send to embedding worker
      const channel = getChannel();
      channel.sendToQueue(
        "embedding_queue",
        Buffer.from(
          JSON.stringify({
            postId: post.id,
            postType: post.postType,
            metadata: post.metadata,
            mediaUrl: post.mediaUrl,
            content: post.content,
            userId: post.userId,
            professionalTags: post.professionalTags,
            title: post.title,
          })
        )
      );

      return post;
    } catch (error) {
      logger.error("Failed to create post:", error);
      throw new Error("Failed to create post");
    }
  }

  async getPostById(postId) {
    const post = await Post.findByPk(postId);
    if (!post) throw new Error("Post not found");
    return post;
  }

  async updatePostStatus(postId, newStatus) {
    const post = await Post.findByPk(postId);
    if (!post) throw new Error("Post not found");
    post.status = newStatus;
    await post.save();
    logger.info(`Post ${postId} status updated to ${newStatus}`);
    return post;
  }
}

module.exports = new PostService();
