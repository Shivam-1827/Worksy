const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    logger.error('Redis client error', err);
});

const connectRedis = async() => {
    try {
        await redisClient.connect();
        logger.info('Redis connection has been established successfully');
    } catch (error) {
        logger.error('Unable to connect redis: ', error);
        process.exit(1);
    }
}

module.exports = {redisClient, connectRedis};