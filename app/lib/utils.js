/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines miscellaneous helper functions.
 */

// Node modules
const assert = require('assert');
const path = require('path');

/**
 * @description Provides time unit conversions.
 */
module.exports.timeConversions = {
  MILLISECONDS: 1,
  SECONDS: 1000,
  MINUTES: 60 * 1000,
  HOURS: 60 * 60 * 1000,
  DAYS: 24 * 60 * 60 * 1000
};

/**
 * The string used as the UID delimiter.
 * @type {string}
 */
module.exports.ID_DELIMITER = ':';

/**
 * @description Defines a render utility wrapper for the Express res.render
 * function to define and pass in default options.
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {String} name - Name of the template to render
 * @param {Object} params - List of parameters to render
 */
module.exports.render = function(req, res, name, params) {
  const opts = params || {};
  opts.pluginNames = (M.config.server.plugins.enabled)
    ? require(path.join(M.root, 'plugins', 'routes.js')).loadedPlugins : []; // eslint-disable-line global-require
  opts.ui = opts.ui || M.config.server.ui;
  opts.user = opts.user || ((req.user) ? req.user.getPublicData() : '');
  opts.title = opts.title || 'Model-Based Engineering Environment';
  return res.render(name, opts);
};

/**
 * @description Loops over a given array and asserts that each item is of a
 * specific type. If any item in the array is not of the specified type, an
 * error is thrown. It is assumed the array should always have items in it, if
 * the array is empty an error is thrown.
 *
 * @param {Object} arrItems - An array of values to check.
 * @param {String} assertType - The type to check. Options: ['string', 'object',
 *                            'number', 'undefined', 'boolean', 'symbol'].
 */
module.exports.assertType = function(arrItems, assertType) {
  // An empty array is never expected
  if (!Array.isArray(arrItems)) {
    const desc = `Array was expected. Got ${typeof arrItems}`;
    throw new M.CustomError(desc, 400);
  }

  // An empty array is never expected
  if (arrItems.length === 0) {
    const desc = 'Array is empty. Assertion check failed.';
    throw new M.CustomError(desc, 400);
  }

  // Define valid type
  const validType = ['string', 'object', 'number', 'undefined', 'boolean', 'symbol'];

  // Check type NOT included in validTypes
  if (!validType.includes(assertType)) {
    // Invalid type, throw error
    const desc = `${assertType} is not a valid javascript type.`;
    throw new M.CustomError(desc, 400);
  }
  Object.keys(arrItems).forEach((item) => {
    if (typeof arrItems[item] !== assertType) { // eslint-disable-line valid-typeof
      throw new M.CustomError(`Value is not a ${assertType}.`, 400);
    }
  });
};

/**
 * @description Calls assertType to verify that `arrItems` is an array
 * containing items of type `checkType`. Returns true f all items in the array
 * of the specified type. Otherwise false is returned. Returns false is
 * assertType throws an error.
 *
 * @param {Object} arrItems - An array of values to check.
 * @param {String} checkType - The type to check. Options: ['string', 'object',
 *                            'number', 'undefined', 'boolean', 'symbol'].
 * @return {Boolean} true - type is correct
 *                   false - error
 */
module.exports.checkType = function(arrItems, checkType) {
  try {
    this.assertType(arrItems, checkType);
    return true;
  }
  catch (error) {
    return false;
  }
};

/**
 * @description Given an array of string properties and an object, asserts that
 * the object has all of those properties.
 *
 * @example
 *  assertExists(['id', 'project.id'], { id: '123', project: {id: '456'} });
 *
 * @param {Object} properties - An array of strings denoting keys.
 * @param {Object} obj - The object being searched.
 */
module.exports.assertExists = function(properties, obj) {
  properties.forEach((prop) => {
    let ref = obj;
    // Split property on '.' characters.
    // Loop over nested object properties, updating ref with each iteration.
    prop.split('.').forEach(p => { ref = ref[p]; });
    if (ref === undefined) {
      throw new M.CustomError(`Object does not have property ${prop}.`, 400);
    }
  });
};

/**
 * @description Given an array of properties and an object, checks that the
 * object has each of the properties by calling assertExists. Returns true if
 * the object has all of those properties. If not, or if assertsExists throws
 * an error, false is returned.
 *
 * @param {Object} properties - A list of strings denoting keys.
 * @param {Object} obj - The object being searched.
 * @return {Boolean} true - property exists
 *                   false - error
 */
module.exports.checkExists = function(properties, obj) {
  try {
    this.assertExists(properties, obj);
    return true;
  }
  catch (error) {
    return false;
  }
};

/**
 * @description Checks whether the user is an admin or not. Throws an error
 * if user is not an admin.
 *
 * @param {User} user - The user object being checked.
 */
module.exports.assertAdmin = function(user) {
  if (!user.admin) {
    throw new M.CustomError('User does not have permissions.', 401);
  }
};

/**
 * @description Creates a colon delimited string from any number of arguments.
 * If any items are not strings or other failure occurs, an error is thrown.
 *
 * @param {String} args - An arbitrary number of strings to be appended.
 * @return {String} args with uid delimiter
 */
module.exports.createID = function(...args) {
  this.assertType(args, 'string');
  return args.join(this.ID_DELIMITER);
};

/**
 * @description Splits a UID on the UID delimiter up and returns an array of
 * UID components.
 *
 * @param {String} uid - The uid.
 * @return {String} uid with delimiter
 */
module.exports.parseID = function(uid) {
  if (!uid.includes(this.ID_DELIMITER)) {
    throw new M.CustomError('Invalid UID.', 400);
  }
  return uid.split(this.ID_DELIMITER);
};

/**
 * @description Title-cases a string.
 *
 * @param {String} s - The string to be title-cased
 *  @param {boolean} keepUpper- Boolean indicating wither or not keep uppercase characters as is
 * @return {String} the word with upper case
 */
module.exports.toTitleCase = function(s, keepUpper = false) {
  // Check if s NOT string or contains whitespace
  if (typeof s !== 'string') {
    // Cannot be title-cased, return word
    return s;
  }

  let words = s.split(' ');
  words = words.map(word => {
    // Define title-cased string
    let titleCasedString = '';

    // Upper-Case the first letter
    titleCasedString += word[0].toUpperCase();

    // For remaining characters in word, make lowercase
    for (let i = 1; i < word.length; i++) {
      // Lower-case ith character, append to titleCasedString
      titleCasedString += (keepUpper) ? word[i] : word[i].toLowerCase();
    }


    return titleCasedString;
  });

  return words.join(' ');
};

/**
 * @description Checks that two objects are equal by stringifying them and
 * comparing the resulting strings.
 *
 * @param a
 * @param b
 */
module.exports.deepEqual = function(a, b) {
  try {
    assert.deepEqual(a, b, 'The objects are not equal');
    return true;
  }
  catch (error) {
    return false;
  }
};

/**
 * @description Adds/updates values in original object based on update object.
 *
 * @param {Object} originalObj - The original object, which will be updated with
 *                               values from the second object.
 * @param {Object} updateObj - The object containing new or changed fields that
 *                             will be added/changed in the original object.
 */
module.exports.updateAndCombineObjects = function(originalObj, updateObj) {
  // Get all existing keys for originalObject
  const firstKeys = Object.keys(originalObj);

  // Loop through all of the keys in updateObject
  Object.keys(updateObj).forEach((key) => {
    // If the key is not in originalObject, add it
    if (!firstKeys.includes(key)) {
      originalObj[key] = updateObj[key];
    }
    // If the key is in originalObject, and it's value is a nested object,
    // recursively call this function with the value of the key/value pair
    else if (typeof originalObj[key] === 'object' && typeof updateObj[key] === 'object') {
      this.updateAndCombineObjects(originalObj[key], updateObj[key]);
    }
    // Key exists in originalObj, but original value isn't an object, replace it
    else {
      originalObj[key] = updateObj[key];
    }
  });
};
