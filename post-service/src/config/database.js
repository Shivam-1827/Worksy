require("dotenv").config();
const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");


const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, 
    },
  },
  logging: (msg) => logger.info(msg),
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    logger.info("Database connection has been established successfully.");
  } catch (error) {
    logger.error("Unable to connect to the database: ", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
