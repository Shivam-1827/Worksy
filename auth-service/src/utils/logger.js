// logger.js
const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");
const util = require("util");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};
winston.addColors(colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = message;

    if (typeof msg === "object") {
      msg = util.inspect(msg, { depth: null, colors: true });
    }

    if (msg instanceof Error) {
      msg = `${msg.message}\n${msg.stack}`;
    }

    let extra = "";
    if (Object.keys(meta).length > 0) {
      extra = util.inspect(meta, { depth: null, colors: true });
    }

    return `${timestamp} ${level}: ${msg} ${extra}`;
  })
);

// Daily rotate transport for combined logs
const dailyRotateTransport = new DailyRotateFile({
  dirname: path.join(__dirname, "../../logs/archived"), // archived folder
  filename: "%DATE%-app.log",
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
    new winston.transports.Console({ format: logFormat }),

    // Error logs only (archived)
    new DailyRotateFile({
      dirname: path.join(__dirname, "../../logs/archived"),
      filename: "%DATE%-error.log",
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

    dailyRotateTransport,
  ],
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
