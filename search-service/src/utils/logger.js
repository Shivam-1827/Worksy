// logger.js
const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");
const util = require("util");

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};
winston.addColors(colors);

// Pretty print everything (objects, errors, etc.)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = message;

    // Handle objects in message
    if (typeof msg === "object") {
      msg = util.inspect(msg, { depth: null, colors: true });
    }

    // Handle error objects (message + stack)
    if (msg instanceof Error) {
      msg = `${msg.message}\n${msg.stack}`;
    }

    // Handle extra metadata
    let extra = "";
    if (Object.keys(meta).length > 0) {
      extra = util.inspect(meta, { depth: null, colors: true });
    }

    return `${timestamp} ${level}: ${msg} ${extra}`;
  })
);

// Daily rotate transport
const dailyRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, "../../logs/%DATE%-app.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: logFormat,
  transports: [
    // Console output
    new winston.transports.Console({ format: logFormat }),

    // Error logs only
    new DailyRotateFile({
      filename: path.join(__dirname, "../../logs/%DATE%-error.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // Combined daily logs
    dailyRotateTransport,
  ],
});

// Stream for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
