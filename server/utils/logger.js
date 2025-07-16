// logger.js
const winston = require("winston");
const expressWinston = require("express-winston");
const path = require("path");
const fs = require("fs");

// 1) Ensure ./logs directory exists
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 2) Create the Winston logger instance
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json()
  ),
  transports: [
    // All logs → combined.log
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    // Only error-level logs → error.log
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
  ],
});

// 3) Export a request-logging middleware
const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  level: "info",
  meta: true,
  msg:
    "{{req.method}} {{req.url}} HTTP/{{req.httpVersion}} " +
    "{{res.statusCode}} {{res.responseTime}}ms",
  expressFormat: false,
  colorize: false,
  ignoreRoute: () => false,
});

// 4) Export an error-logging middleware
const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.json()
  ),
});

// 5) Export the logger itself if you want to `logger.info(…)` manually elsewhere
module.exports = {
  logger,
  requestLogger,
  errorLogger,
};

