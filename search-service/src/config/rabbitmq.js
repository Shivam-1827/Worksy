const amqp = require("amqplib");
const logger = require("../utils/logger");

let channel;

async function connectRabbitMQ() {
  const maxRetries = 10;
  const retryDelayMs = 5000; 
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const rabbitUrl =
        process.env.RABBITMQ_URL_LOCAL ||
        process.env.RABBITMQ_URL_DOCKER ||
        process.env.RABBITMQ_URL ||
        "amqp://localhost";

      const connection = await amqp.connect(rabbitUrl);
      channel = await connection.createChannel();
      await channel.assertQueue("otp_email_queue");
      logger.info(`RabbitMQ connected on ${rabbitUrl} and queue asserted`);
      return; 
    } catch (error) {
      retries++;
      logger.warn(
        `RabbitMQ connection failed. Retrying in ${
          retryDelayMs / 1000
        } seconds... (Attempt ${retries}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  logger.error(
    `Unable to connect to RabbitMQ after ${maxRetries} attempts.`
  );
  process.exit(1);
}

function getChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not available");
  }
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };
