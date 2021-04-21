/**
 * @classification UNCLASSIFIED
 *
 * @module lib.logger
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Jake Ursetta
 * @author Connor Doyle
 *
 * @description Defines the MBEE logger. The logger should be used instead of
 * using `console.log`. The logger adds the ability to write to log
 * files, timestamp errors, include stack trace, and allow for colored text.
 *
 * To use the logger simply require this file (e.g.
 * `const log = require('logger.js')`.
 *
 * You can the use the logger:
 *   - `log.info('Hello World')`
 *   - `log.error('An error has occurred')`.
 */


// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const winston = require('winston');
const { combine, timestamp, label, printf } = winston.format;

// This defines our log levels
const levels = {
  critical: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5
};

// This defines the colors for each log level
const colors = {
  critical: 'red underline',
  error: 'red',
  warn: 'yellow',
  info: 'magenta',
  verbose: 'blue',
  debug: 'green'
};

// This defines the unicode format for each color
const fmt = {
  color: {
    grey: '\u001b[30m',
    red: '\u001b[31m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    blue: '\u001b[34m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    light_grey: '\u001b[37m',
    esc: '\u001b[39m'
  }
};

/**
 * @description This is the formatting function for console output. Note, a
 * separate function is used to define the format for the log files (the
 * fileFormatter() function).
 */
const formatter = printf((msg) => {
  // Retrieve the error stack
  const stack = new Error().stack;
  const lines = stack.split('\n');
  const reduced = [];
  let extra = '';

  // For each line in the stack trace, remove winston specific lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('node_modules')
         || lines[i].includes('DerivedLogger')
         || lines[i].includes('at doWrite')
         || lines[i].includes('at writeOrBuffer ')
         || lines[i].includes('CustomError')) {
      continue;
    }
    reduced.push(lines[i]);
  }

  // Retrieve the first line of failure
  // Note: There are some cases which the reduced stack is less than 2 lines
  const index = (reduced.length > 2) ? 2 : 1;
  const tmp = reduced[index].split(`${process.cwd()}/`);

  // Get the file and line number of the error
  const file = tmp[tmp.length - 1].split(':')[0].replace(/\//g, '.');
  const line = tmp[tmp.length - 1].split(':')[1];

  // We want to capitalize the log level. You cannot string.toUpperCase here
  // because the string includes the color formatter and toUpperCase will
  // break the color formatting.
  let level = msg.level
  .replace('critical', 'CRITICAL')
  .replace('error', 'ERROR')
  .replace('warn', 'WARN')
  .replace('info', 'INFO')
  .replace('verbose', 'VERBOSE')
  .replace('debug', 'DEBUG');

  // Add memory usage to debug level statements
  if (msg.level.includes('debug')) {
    // Get heap usage
    const heap = process.memoryUsage();
    const heapTotal = M.memoryLimit;
    const heapUsed = (heap.heapUsed / 1024 / 1024).toFixed(2);
    extra = `[heap ${(heapUsed / heapTotal * 100).toFixed(2)}% ${heapUsed}/${heapTotal}]`;
  }

  // If we want colored logs, this is our return string
  if (M.config.log.colorize) {
    const ts = `${fmt.color.light_grey}${msg.timestamp}${fmt.color.esc}`; // timestamp
    const f = `${fmt.color.cyan}${file}${fmt.color.esc}`;           // file
    // Print stack for error and critical logs
    let msgPrint = msg.message;
    if (msg.level.includes('error') || msg.level.includes('critical')) {
      msgPrint += `\n${msg.stack || reduced.join('\n')}`;
    }
    const sep = `${fmt.color.light_grey}::${fmt.color.esc}`;
    return `${ts} [${level}] ${f}\u001b[30m:${line} ${sep} ${extra} ${msgPrint}`;
  }

  // If colorize is false, we remove colors from the log level, timestamp and file.
  level = level
  .replace('\u001b[30m', '')
  .replace('\u001b[31m', '')
  .replace('\u001b[32m', '')
  .replace('\u001b[33m', '')
  .replace('\u001b[34m', '')
  .replace('\u001b[35m', '')
  .replace('\u001b[36m', '')
  .replace('\u001b[37m', '')
  .replace('\u001b[38m', '')
  .replace('\u001b[39m', '');
  const ts = `${msg.timestamp}`; // timestamp
  const f = `${file}`;           // file
  return `${ts} [${level}] ${f}:${line} -> ${extra} ${msg.message}`;
});

// Check that the logs directory exists
if (!fs.existsSync(path.join(M.root, 'logs'))) {
  // If logs directory doesn't exist, create it
  fs.mkdirSync(path.join(M.root, 'logs'));
}

/**
 * @description This creates the logger. Defines log level, log formatting and
 * transports. There are four transports (location which the log is written to):
 * the console, an error file, a combined log, and a debug log.
 *
 * @param {string} subcommand - The subcommand used with 'node mbee'.
 * @param {string} opts - The options used with 'node mbee {subcommand}'.
 *
 * @returns {object} Returns an instance of the winston logger.
 */
function makeLogger(subcommand, opts) {
  const loggerConfig = {
    level: M.config.log.level,
    levels: levels,
    format: combine(
      label({ label: 'MBEE' }),
      winston.format.colorize(),
      timestamp(),
      formatter
    ),
    transports: [
      // The Console transport is not included here for cleaner console output during testing.
      // error log transport - logs error-level and below to error log file
      new winston.transports.File({
        filename: path.join('logs', M.config.log.error_file),
        level: 'error'
      }),
      // combined log transport - logs default-level and below to combined log file
      // NOTE: Default level specified in config file
      new winston.transports.File({
        filename: path.join('logs', M.config.log.file),
        level: M.config.log.level
      }),
      // debug log transport - logs debug-level and below to debug log file
      new winston.transports.File({
        filename: path.join('logs', M.config.log.debug_file),
        level: 'debug'
      })
    ],
    exitOnError: false
  };
  // Add in a transport to log to the console if not running tests
  if (!(subcommand === 'test' && opts.includes('--suppress-console'))) {
    loggerConfig.transports.push(new winston.transports.Console());
  }
  return winston.createLogger(loggerConfig);
}

// Add defined colors to winston logger
winston.addColors(colors);


/**
 * @description Logs the response to an HTTP request.
 *
 * @param {object} req - Request object from express.
 * @param {object} res - Response object from express.
 */
function logResponse(req, res) {
  const message = formatResponseLog(req, res);
  // Log the info at 'info' level
  M.log.info(message);
}

/**
 * @description Logs the response to an HTTP request to a separate security log file for
 * security-sensitive API endpoints.
 *
 * @param {object} req - Request object from express.
 * @param {object} res - Response object from express.
 */
function logSecurityResponse(req, res) {
  const message = formatResponseLog(req, res);
  // Log the info to the security log
  fs.appendFileSync(path.join('logs', M.config.log.security_file), `${message}\n`);
}

/**
 * @description A helper function to format messages that log responses to API calls.
 *
 * @param {object} req - Request object from express.
 * @param {object} res - Response object from express.
 *
 * @returns {string} A formatted message containing information about the response to
 * an HTTP request.
 */
function formatResponseLog(req, res) {
  const responseMessage = (res.locals && res.locals.message) ? res.locals.message : '';
  const responseLength = typeof responseMessage === 'string'
    ? responseMessage.length
    : responseMessage.toString().length;
  const statusCode = res.locals.statusCode ? res.locals.statusCode : res.statusCode;

  // Set username to anonymous if req.user is not defined
  const username = (req.user) ? (req.user._id || req.user.username) : 'anonymous';
  const date = JSON.stringify(new Date()).replace(/"/g, '');
  let ip = req.ip;
  // If IP is ::1, set it equal to 127.0.0.1
  if (req.ip === '::1') {
    ip = '127.0.0.1';
  }
  // If IP starts with ::ffff:, remove the ::ffff:
  else if (req.ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return `RESPONSE: ${ip} ${username} [${date}] "${req.method} `
    + `${req.originalUrl}" ${statusCode} ${responseLength.toString()}`;
}

module.exports = {
  makeLogger,
  logResponse,
  logSecurityResponse
};
