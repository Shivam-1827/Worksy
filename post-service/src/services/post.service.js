const Post = require("../models/post.model");
const logger = require("../utils/logger");
const { getChannel } = require("../config/rabbitmq");

class PostService {
  async createPost(postData, file) {
    try {
      const {
        userId,
        title,
        content,
        professionalTags,
        postType,
        mediaUrl,
        metadata,
      } = postData;

      logger.info(`Creating post of type ${postType} for user ${userId}`);

      // --- Normalize tags ---
      let tags = professionalTags;
      if (typeof tags === "string") {
        try {
          tags = JSON.parse(tags);
        } catch {
          tags = tags.split(",").map((t) => t.trim());
        }
      }
      if (!Array.isArray(tags)) tags = tags ? [tags] : [];
      tags = tags.filter(Boolean); // remove empty strings

      let finalUrl;
      let finalMetadata = metadata || null;

      // --- Handle file and mediaUrl priority ---
      if (file && (file.secure_url || file.path)) {
        finalUrl = file.secure_url || file.path;
        finalMetadata = {
          public_id: file.public_id || null,
          url: finalUrl,
          file_name:
            file.original_filename ||
            file.originalname ||
            file.filename ||
            null,
          format: file.format || finalUrl.split(".").pop(),
          file_size: file.bytes || file.size || 0,
        };
        logger.info(`Using uploaded file URL: ${finalUrl}`);
      } else if (mediaUrl) {
        finalUrl = mediaUrl;
        logger.info(`Using provided mediaUrl: ${finalUrl}`);
      } else if (metadata?.url) {
        finalUrl = metadata.url;
        finalMetadata = {
          ...metadata,
          public_id: metadata.public_id || null,
          file_size: metadata.file_size || 0,
          file_name: metadata.file_name || metadata.url.split("/").pop(),
          format: metadata.format || metadata.url.split(".").pop(),
        };
        logger.info(`Using metadata URL: ${finalUrl}`);
      }

      // --- Validate required media URL for non-ARTICLE ---
      if (postType !== "ARTICLE" && !finalUrl) {
        throw new Error(`File or mediaUrl is required for ${postType} posts.`);
      }

      // --- Prepare post object ---
      const postObj = {
        userId,
        title,
        content: postType === "ARTICLE" ? content : null,
        professionalTags: tags,
        postType,
        mediaUrl: finalUrl || null,
        metadata: finalMetadata,
        status: "PROCESSING",
      };

      const post = await Post.create(postObj);
      logger.info(`Post created: ${post.id}`);

      if (postType === "ARTICLE" && post.content) {
        const channel = getChannel();
        if (channel) {
          channel.sendToQueue(
            "embedding_queue",
            Buffer.from(
              JSON.stringify({
                postId: post.id,
                postType: post.postType,
                content: post.content,
                title: post.title,
                professionalTags: post.professionalTags,
                userId: post.userId,
              })
            )
          );
          logger.info(
            `Article post ${post.id} queued for embedding processing`
          );
        }
      }


      // --- Queue media posts for embedding ---
      if ((postType === "VIDEO" || postType === "AUDIO") && finalUrl) {
        const channel = getChannel();
        if (!channel) {
          logger.warn(
            `RabbitMQ channel not ready. Post ${post.id} will not be queued immediately.`
          );
        } else {
          const messageData = {
            postId: post.id,
            postType: post.postType,
            metadata: post.metadata,
            mediaUrl: post.mediaUrl,
            content: post.content,
            userId: post.userId,
            professionalTags: post.professionalTags,
            title: post.title,
          };
          channel.sendToQueue(
            "embedding_queue",
            Buffer.from(JSON.stringify(messageData))
          );
          logger.info(`Post ${post.id} queued for embedding processing`);
        }
      }

      return post;
    } catch (error) {
      logger.error("Failed to create post:", error);
      throw error;
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
