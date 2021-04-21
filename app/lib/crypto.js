/**
 * @classification UNCLASSIFIED
 *
 * @module lib.crypto
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Josh Kaplan
 *
 * @description Defines common cryptographic functions.
 */

// Node modules
const crypto = require('crypto');  // NOTE: Refers to standard node crypto library

// Create an Initialization Vector (IV) of 16 random bytes for the createCipheriv
// and createDecipheriv functions
const iv = crypto.randomBytes(16);
// Set the length of the secret key in bytes
const keyLength = 32;
// Generate a cryptographic key in buffer form from the secret in the config.
// Limit size of the buffer to the specified key length.
const key = Buffer.concat([Buffer.from(M.config.server.secret)], keyLength);


/**
 * @description Encrypts data with AES-256 using the app secret and returns the
 * encrypted data as a base64 encoded string.
 *
 * @param {string} data - Data to be encrypted.
 *
 * @returns {string} Encrypted data.
 */
module.exports.encrypt = function encrypt(data) {
  // Create aes-256-cbc cipher object using secret key and random initialization vector
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  // Encrypt input using aes-256 cipher
  let encrypted = cipher.update(data, 'utf8', 'hex');
  // Marks end of encryption and returns hex format
  encrypted += cipher.final('hex');

  // Return base64 encrypted string
  return Buffer.from(encrypted, 'hex').toString('base64');
};

/**
 * @description Decrypts data with AES-256. It expects data to be in the same
 * base64 encoded string format returned by encrypt().
 *
 * @param {string} data - Data to be decrypted.
 *
 * @returns {object} Decrypted data.
 */
module.exports.decrypt = function decrypt(data) {
  if (data === undefined || data.toString() === '') {
    // NOTE: Changed from returning '{}' to throwing an error
    throw new M.ServerError('Can\'t decrypt data. Returning ...', 'warn');
  }

  try {
    // Create aes-256-cbc decipher object using secret key and random initialization vector
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Retrieve hex data from base64 encoded string
    const hexData = Buffer.from(data, 'base64').toString('hex');

    // Decrypt string
    let decrypted = decipher.update(hexData, 'hex', 'utf8');
    // Marks end of decryption and returns utf8 formatted string
    decrypted += decipher.final('utf8');

    // Return decrypted string
    return decrypted;
  }
  catch (error) {
    // Decryption failed, throw an error
    // NOTE: Changed from returning '{}' to throwing an error
    throw new M.ServerError('Decryption failed.', 'warn');
  }
};

/**
 * @description Generates token from user data.
 *
 * @param {object} data - Data to generate token.
 *
 * @returns {string} Encrypted token.
 */
module.exports.generateToken = function generateToken(data) {
  // Return encrypted input
  return module.exports.encrypt(JSON.stringify(data));
};

/**
 * @description Inspects user token.
 *
 * @param {string} token - Token to inspect.
 *
 * @returns {object} Decrypted token.
 */
module.exports.inspectToken = function inspectToken(token) {
  // Decrypt input and return parsed data
  return JSON.parse(module.exports.decrypt(token));
};

/**
 * @description Performs md5 hash with hex encoding.
 *
 * @param {object} data - Data to md5 hash.
 *
 * @returns {string} Hash of data.
 */
module.exports.md5Hash = function md5Hash(data) {
  // hash input data and return it
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * @description Performs sha256 hash with hex encoding.
 *
 * @param {object} data - Data to sha256 hash.
 *
 * @returns {string} Hash of data.
 */
module.exports.sha256Hash = function sha256Hash(data) {
  // hash input data and return it
  return crypto.createHash('sha256').update(data).digest('hex');
};
