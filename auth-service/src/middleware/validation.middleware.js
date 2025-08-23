const zod = require("zod");
const logger = require("../utils/logger");

class ValidationMiddleware {
  static validate = (schema) => (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      logger.error("Validation failed: ", error.message);
      res.status(400).json({
        message: "Validation failed",
      });
    }
  };

  static registerSchema = zod.object({
    body: zod.object({
      email: zod.string().email("Invalid email format"),
      password: zod
        .string()
        .min(8, "Password must be 8 characters long.")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        ),
      professionalTitle: zod.string().optional(),
      location: zod.string().optional(),
    }),
  });

  static loginSchema = zod.object({
    body: zod.object({
      email: zod.string().email("Invalid email format"),
      password: zod.string(),
    }),
  });

  static updatePasswordSchema = zod.object({
    body: zod.object({
      oldPassword: zod.string(),
      newPassword: zod
        .string()
        .min(8, "New password must be 8 characters long.")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        ),
    }),
  });

  static updateEmailSchema = zod.object({
    body: zod.object({
      newEmail: zod.string().email("Invalid new email format."),
    }),
  });

  static forgotPasswordSchema = zod.object({
    body: zod.object({
      email: zod.string().email("Invalid email format."),
    }),
  });

  static resetPasswordOtpSchema = zod.object({
    body: zod.object({
      email: zod.string().email("Invalid email format."),
      otp: zod.string().length(6, "OTP must be 6 digits."),
      newPassword: zod
        .string()
        .min(8, "New password must be 8 characters long.")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        ),
    }),
  });
}

module.exports = {
  validate: ValidationMiddleware.validate,
  registerSchema: ValidationMiddleware.registerSchema,
  loginSchema: ValidationMiddleware.loginSchema,
  updatePasswordSchema: ValidationMiddleware.updatePasswordSchema,
  updateEmailSchema: ValidationMiddleware.updateEmailSchema,
  forgotPasswordSchema: ValidationMiddleware.forgotPasswordSchema,
  resetPasswordOtpSchema: ValidationMiddleware.resetPasswordOtpSchema
};
