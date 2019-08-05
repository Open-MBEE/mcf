/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.parse-json
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file defines a function which can be used to parse JSON
 * objects.
 */

/**
 * @description This function removes comments from a string separated by new
 * line characters to convert commented JSON to valid JSON.
 *
 * @param {string} inputString - The name of the file to parse.
 *
 * @return {Object} valid JSON
 */
module.exports.removeComments = function(inputString) {
  // Ensure inputString is of type string
  if (typeof inputString !== 'string') {
    throw new M.DataFormatError('Value is not a string.', 'warn');
  }

  // Attempt to read file into array separated by each newline character.
  const arrStringSep = inputString.split('\n');

  // Remove all array elements that start with '//', the JS comment identifier
  const arrCommRem = arrStringSep.filter(line => !RegExp(/^ *\/\//).test(line));

  // Join the array into a single string separated by new line characters
  // Return the now-valid JSON
  return arrCommRem.join('\n');
};
