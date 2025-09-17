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
      logger.error("Validation errors:", error.errors);
      res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
        details: error.errors.map((err) => err.message),
      });
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
        postType: zod.enum(["VIDEO", "AUDIO","PDF"]),
        mediaUrl: zod.string().url("Invalid media URL.").optional(),
        metadata: zod
          .object({
            public_id: zod.string().optional(),
            url: zod.string().url("Invalid metadata URL.").optional(),
            file_name: zod.string().optional(),
            file_size: zod.number().optional(),
            format: zod.string().optional(),
          })
          .optional(),
      }),
      file: zod
        .object({
          path: zod.string().optional(),
          secure_url: zod.string().optional(), // For Cloudinary uploads
          public_id: zod.string().optional(), // For Cloudinary uploads
          originalname: zod.string().optional(),
          original_filename: zod.string().optional(), // Cloudinary field
          mimetype: zod.string().optional(),
          size: zod.number().optional(),
          bytes: zod.number().optional(), // Cloudinary field
          format: zod.string().optional(), // Cloudinary field
        })
        .optional(),
    })
    .superRefine(({ body, file }, ctx) => {
      // More flexible validation logic
      const hasUploadedFile = file && (file.secure_url || file.path);
      const hasMediaUrl = body.mediaUrl;
      const hasMetadataUrl = body.metadata && body.metadata.url;

      logger.info("Media validation check:", {
        hasUploadedFile: hasUploadedFile ? file.secure_url || file.path : false,
        hasMediaUrl,
        hasMetadataUrl,
        fileKeys: file ? Object.keys(file) : [],
        bodyKeys: Object.keys(body),
      });

      if (!hasUploadedFile && !hasMediaUrl && !hasMetadataUrl) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          message:
            "Media posts require either an uploaded file, a media URL, or metadata with a URL.",
          path: ["body"],
        });
      }
    });
}

module.exports = PostValidationMiddleware;
