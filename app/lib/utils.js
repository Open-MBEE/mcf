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
 * @param {string} name - Name of the template to render
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
 * @param {*} arrItems - An array of values to check.
 * @param {string} assertType - The type to check. Options: ['string', 'object',
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
 * @param {*} arrItems - An array of values to check.
 * @param {string} checkType - The type to check. Options: ['string', 'object',
 *                            'number', 'undefined', 'boolean', 'symbol'].
 *
 * @return {boolean} true - type is correct
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
 *
 * @return {boolean} true - property exists
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
 * @param {string} args - An arbitrary number of strings to be appended.
 *
 * @return {string} Concatenated args with uid delimiter
 */
module.exports.createID = function(...args) {
  this.assertType(args, 'string');
  return args.join(this.ID_DELIMITER);
};

/**
 * @description Splits a UID on the UID delimiter up and returns an array of
 * UID components.
 *
 * @param {string} uid - The uid.
 *
 * @return {string[]} Split uid
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
 * @param {string} s - The string to be title-cased
 * @param {boolean} [keepUpper=false] - Boolean indicating wither or not keep
 * uppercase characters as is
 *
 * @return {string} The title-cased word
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
 * @param {*} a
 * @param {*} b
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

/**
 * @description Converts data between different JMI types
 *
 * @param {number} from - The current JMI version of the data.
 * @param {number} to - The JMI version to convert the data to.
 * @param {Object|Object[]} data - The data to convert between JMI versions.
 * @param {string} [field=_id] - The field to parse type 1 on
 *
 * @return {Object|Object[]} The converted JMI.
 */
module.exports.convertJMI = function(from, to, data, field = '_id') {
  // Convert JMI type 1 to type 2
  if (from === 1 && to === 2) {
    // Error Check: Ensure data is in JMI type 1
    try {
      assert.ok(Array.isArray(data), 'Data is not in JMI type 1.');
    }
    catch (msg) {
      throw new M.CustomError(msg, 400, 'warn');
    }

    const returnObj = {};
    data.forEach((object) => {
      if (returnObj[object[field]]) {
        throw new M.CustomError('Invalid object, duplicate keys '
          + `[${object[field]}] exist.`, 403, 'warn');
      }
      returnObj[object[field]] = object;
    });
    return returnObj;
  }

  throw new M.CustomError('JMI conversion not yet implemented.', 501, 'warn');
};

/**
 * @description Parse option string into option objects.
 * Error is thrown for invalid options.
 * Note: Boolean strings are converted to booleans
 *          ex. "true" => true
 *       string separated commas are converted to arrays
 *          ex. "createdBy, modifiedBy" => {["createdBy", "modifiedBy"]}
 *
 * @param {Object} options - An optional parameter that provides supported
 * options.
 * @param {Object} validOptions - An object containing valid option as keys and
 * the object's data type as values. ex. populate: 'array'
 */
module.exports.parseOptions = function(options, validOptions) {
  // Check option is defined
  if (!options) {
    // No options, return empty object
    return {};
  }

  // Loop through all options
  Object.keys(options).forEach(function(key) {
    // Check options are valid
    if (!validOptions.hasOwnProperty(key)) {
      // Invalid key, throw error
      throw new M.CustomError(`Invalid parameter: ${key}`, 400, 'warn');
    }
  });

  // Define parsed option object
  const parsedOptions = {};
  // Loop through all options
  Object.keys(options).forEach((option) => {
    // Check option of boolean type
    if (validOptions[option] === 'boolean') {
      // Check and convert string to boolean
      if (options[option] === 'true') {
        parsedOptions[option] = true;
      }
      else if (options[option] === 'false') {
        parsedOptions[option] = false;
      }
    }
    // Check array type
    else if (validOptions[option] === 'array') {
      if (options[option].includes(',')) {
        // Multiple options, split into array
        parsedOptions[option] = options[option].split(',');
      }
      else {
        // Set single option within array
        parsedOptions[option] = [options[option]];
      }
    }
  });
  return parsedOptions;
};
