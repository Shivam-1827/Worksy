const { connectRabbitMQ, getChannel } = require("../config/rabbitmq");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");
const nodemailer = require("nodemailer");

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);

async function startWorker() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info("Redis connected in email worker");
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Missing EMAIL_USER or EMAIL_PASS environment variables");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await connectRabbitMQ();
    const channel = getChannel();

    logger.info("Email worker is listening for messages...");

    channel.consume("otp_email_queue", async (msg) => {
      if (msg) {
        const { email, otp, eventId } = JSON.parse(msg.content.toString());

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password reset OTP",
            html: `
              <h1>Password Reset Request</h1>
              <p>You requested to reset your password. Use the following OTP to proceed:</p>
              <h2>${otp}</h2>
              <p>This OTP is valid for 10 minutes.</p>
            `,
          });

          logger.info(`OTP email sent to ${email}. Notifying via Redis...`);

          await redisClient.publish(
            "otp_status",
            JSON.stringify({ eventId, status: "completed" })
          );
        } catch (error) {
          logger.error(`Error sending email to ${email}: ${error.message}`);

          await redisClient.publish(
            "otp_status",
            JSON.stringify({
              eventId,
              status: "failed",
              error: "Failed to send email",
            })
          );
        } finally {
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    logger.error(`Worker startup error: ${error.message}`);
    process.exit(1); 
  }
}

startWorker();
