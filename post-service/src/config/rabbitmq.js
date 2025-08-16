const amqp = require("amqplib");
const logger = require("../utils/logger");

let channel;

async function connectRabbitMQ() {
  try {
    // Decide connection URL
    const rabbitUrl =
      process.env.RABBITMQ_URL_LOCAL || // For local dev
      process.env.RABBITMQ_URL_DOCKER || // For Docker containers
      process.env.RABBITMQ_URL || // Fallback
      "amqp://localhost";

    const connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.assertQueue("otp_email_queue");
    logger.info(`RabbitMQ connected on ${rabbitUrl} and queue asserted`);
  } catch (error) {
    logger.error("Unable to connect to rabbitMQ: ", error);
    process.exit(1);
  }
}

function getChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not available");
  }
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
