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

// MBEE modules
const utils = M.require('lib.utils');

/**
 * @description This function removes comments from a string separated by new
 * line characters to convert commented JSON to valid JSON.
 *
 * @params {String} inputString - The name of the file to parse.
 * @return {Array} valid JSON
 */
module.exports.removeComments = function(inputString) {
  // initialize arrStringSep
  let arrStringSep = null;
  try {
    // Ensure inputString is of type string
    utils.assertType([inputString], 'string');
    // Attempt to read file into array separated by each newline character.
    arrStringSep = inputString.split('\n');
  }
  catch (err) {
    throw err;
  }

  // Remove all array elements that start with '//', the JS comment identifier
  const arrCommRem = arrStringSep.filter(line => !RegExp(/^ *\/\//).test(line));

  // Join the array into a single string separated by new line characters
  // Return the now-valid JSON
  return arrCommRem.join('\n');
};
