// /post-service/middleware/post.validation.middleware.js

const zod = require("zod");
const logger = require("../utils/logger");

class PostValidationMiddleware {
  static validate = (schema) => (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
        file: req.file,
      });
      next();
    } catch (error) {
      logger.error("Validation failed:", error.message);
      res
        .status(400)
        .json({ message: "Validation failed", errors: error.errors });
    }
  };

  static createArticleSchema = zod.object({
    body: zod.object({
      title: zod.string().min(1, "Title is required."),
      content: zod.string().min(1, "Content is required for an article."),
      professionalTags: zod.array(zod.string()).optional(),
      postType: zod.literal("ARTICLE"),
    }),
  });

  static createMediaSchema = zod
    .object({
      body: zod.object({
        title: zod.string().min(1, "Title is required."),
        professionalTags: zod
          .union([
            zod.string().transform((val) => [val]),
            zod.array(zod.string()),
          ])
          .optional(),
        postType: zod.enum(["VIDEO", "AUDIO"]),
        mediaUrl: zod.string().url("Invalid media URL.").optional(),
        metadata: zod
          .object({
            public_id: zod.string(),
            url: zod.string().url("Invalid metadata URL."),
            file_name: zod.string().optional(),
            file_size: zod.number().optional(),
            format: zod.string().optional(),
          })
          .optional(),
      }),
      file: zod
        .object({
          path: zod.string(),
          originalname: zod.string(),
          mimetype: zod.string(),
          size: zod.number(),
        })
        .optional(),
    })
    .superRefine(({ body, file }, ctx) => {
      // Custom validation logic
      if (!file && !body.mediaUrl && !body.metadata?.url) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          message: "Either a file or a media URL/metadata must be provided.",
          path: ["body", "file"],
        });
      }
    });
}

module.exports = PostValidationMiddleware;
