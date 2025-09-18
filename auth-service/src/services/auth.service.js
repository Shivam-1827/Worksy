const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const otpGenerator = require("otp-generator");
const { redisClient } = require("../config/redis");
const { v4: uuidv4 } = require("uuid");
const {getChannel} = require('../config/rabbitmq');


class AuthService {
  static generateAccessToken(user) {
    return jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
  }

  static generateRefreshToken(user) {
    return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
  }

  static generateOTP() {
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    return otp;
  }

  async register(userData) {
    try {
      const user = await User.create(userData);
      if (!user) {
        throw new Error("User registration failed");
      }

      logger.info(`New user registered successfully: ${user.email}`);
      return user;
    } catch (error) {
      logger.error("registration failed: ", error);
      throw new Error("Registration failed: ");
    }
  }

  async login(email, password) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        logger.error("Invalid login credentials");
        throw new Error("Invalid login credentials");
      }

      const matchPassword = await bcrypt.compare(password, user.password);

      if (!matchPassword) {
        logger.error("Invalid login credentials");
        throw new Error("Invalid login credentials");
      }

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      
      await redisClient.set(`refreshToken:${user.id}`, refreshToken, {
        EX: 604800,
      });

      logger.info(`User logged in: ${user.email}`);
      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error("Login failed: ", error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      const storedToken = await redisClient.get(`refreshToken:${decode.id}`);

      if (storedToken !== refreshToken) {
        throw new Error("Invalid or expired refresh token");
      }

      const user = await User.findByPk(decode.id);

      if (!user) {
        throw new Error("User not found");
      }

      const newAccessToken = generateAccessToken(user);
      logger.info(`Access token refreshed for the user: ${user.email}`);
      return newAccessToken;
    } catch (error) {
      logger.error("Token refresh failed: ", error);
      throw new Error("Invalid token");
    }
  }

  async logout(userId) {
    try {
      await redisClient.del(`refreshToken:${userId}`);

      await redisClient.set(
        `lastLogoutAt:${userId}`,
        Date.now().toString(),
        { EX: 60 * 60 * 24 * 7 } 
      );

      logger.info(`User logged out successfully: ${userId}`);
    } catch (error) {
      logger.error("Failed to logout: ", error);
      throw new Error("Failed to logout");
    }
  }

  async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (updateData.professionalTitle)
        user.professionalTitle = updateData.professionalTitle;
      if (updateData.location) user.location = updateData.location;
      await user.save();

      logger.info(`Profile updated for user Id: ${userId}`);
      return user;
    } catch (error) {
      logger.error("Failed to update the profile", error);
      throw new Error("Failed to update profile");
    }
  }

  async updateEmail(userId, newEmail) {
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new Error("User not found");

      user.email = newEmail;
      await user.save();
      logger.info(`Email updated for user ID: ${userId}`);
      return user;
    } catch (error) {
      logger.error("Failed to update email:", error);
      throw new Error("Failed to update email");
    }
  }

  async updatePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) throw new Error("User not found");

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) throw new Error("Invalid old password");

      user.password = newPassword;
      await user.save();
      logger.info(`Password updated for user ID: ${userId}`);
      return user;
    } catch (error) {
      logger.error("Failed to update password:", error);
      throw new Error("Failed to update password");
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password"] },
      });
      if (!user) throw new Error("User not found");
      return user;
    } catch (error) {
      logger.error("Failed to get user profile:", error);
      throw new Error("Failed to get user profile");
    }
  }

  async forgotPassword(email, clientId) {
    try {
      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error("User does not found");
      }

      const otp = AuthService.generateOTP();
      const eventId = uuidv4();

      await redisClient.set(`otp:${email}`, otp, { EX: 600 });

      const channel = getChannel();
      channel.sendToQueue(
        "otp_email_queue",
        Buffer.from(JSON.stringify({ email, otp, eventId, clientId }))
      );

      logger.info(
        `Password reset to job published for ${email}. EventId: ${eventId}`
      );

      return { eventId };
    } catch (error) {
      logger.error("Forgot password failed: ", error);
      throw new Error("Failed to initiate password reset");
    }
  }

  async resetPasswordWithOTP(email, otp, newPassword) {
    try {
      const storedOtp = await redisClient.get(`otp:${email}`);
      if (storedOtp !== otp) {
        throw new Error("Invalid or expired otp");
      }

      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      user.password = newPassword;
      await user.save();

      await redisClient.del(`otp:${email}`);

      logger.info(`Password reset successfully for user: ${email}`);
      return true;
    } catch (error) {
      logger.error("Password reset failed: ", error);
      throw new Error("Failed to reset password");
    }
  }
}

module.exports = new AuthService();