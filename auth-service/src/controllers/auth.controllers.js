const express = require('express');
const authService = require('../services/auth.service');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

class AuthController{
    async register(req, res){
        try {
            const user =  await authService.register(req.body);

            logger.info('User registered successfully');

            res.status(200).json({
                user
            });
        } catch (error) {
            logger.error(`Registration failed at auth: `, error.message);
            res.status(400).json({
                error: error.message
            });
        }
    }

    async login(req, res){
        try {
            const { email, password } = req.body;
            const { user, accessToken, refreshToken } = await authService.login(
              email,
              password
            );

            logger.info('login successful');

            res.status(200).json({ user, accessToken, refreshToken });
        } catch (error) {
            logger.error("Login  error:", error.message);
            res.status(401).json({ error: "Invalid credentials" });
        }
    }

    async refreshAccessToken(req, res){
        const refreshToken = req.body.token;
        if (refreshToken == null) return res.sendStatus(401);

        try {
          const newAccessToken = await authService.refreshAccessToken(
            refreshToken
          );
          res.json({ accessToken: newAccessToken });
        } catch (error) {
          logger.error("Token refresh  error:", error.message);
          res.sendStatus(403);
        }
    }

    async forgotPassword(req, res){
        try {
          const clientId = req.headers["sec-websocket-key"];
          const { eventId } = await authService.forgotPassword(
            req.body.email,
            clientId
          );
          res
            .status(200)
            .json({ message: "OTP sent, awaiting status update", eventId });
        } catch (error) {
          logger.error("Forgot password  error:", error.message);
          res.status(400).json({ error: error.message });
        }
    }

    async resetPasswordWithOTP(req, res){
         try {
           const { email, otp, newPassword } = req.body;
           await authService.resetPasswordWithOTP(email, otp, newPassword);
           res.status(200).json({ message: "Password reset successfully." });
         } catch (error) {
           logger.error("Reset password API error:", error.message);
           res.status(400).json({ error: error.message });
         }
    }

    async getUserProfile(req, res){
        try {
          const user = await authService.getUserProfile(req.user.id);
          res.status(200).json(user);
        } catch (error) {
          logger.error("Get profile error:", error.message);
          res.status(404).json({ error: error.message });
        }
    }

    async updatePassword(req, res){
        try {
          const { oldPassword, newPassword } = req.body;
          await authService.updatePassword(
            req.user.id,
            oldPassword,
            newPassword
          );
          res.status(200).json({ message: "Password updated successfully." });
        } catch (error) {
          logger.error("Update password  error:", error.message);
          res.status(400).json({ error: error.message });
        }
    }

    async updateEmail(req, res){
        try {
          const { newEmail } = req.body;
          const updatedUser = await authService.updateEmail(
            req.user.id,
            newEmail
          );
          res.status(200).json(updatedUser);
        } catch (error) {
          logger.error("Update email  error:", error.message);
          res.status(400).json({ error: error.message });
        }
    }

    async logout(req, res){
        try {
          await authService.logout(req.user.id);
          res.status(200).json({ message: "Logged out successfully." });
        } catch (error) {
          logger.error("Logout  error:", error.message);
          res.status(500).json({ error: "Failed to logout." });
        }
    }

    async updateProfile(req, res){
         try {
           const updatedUser = await authService.updateProfile(
             req.user.id,
             req.body
           );
           res.status(200).json(updatedUser);
         } catch (error) {
           logger.error("Update profile  error:", error.message);
           res.status(400).json({ error: error.message });
         }
    }
}

module.exports = new AuthController();