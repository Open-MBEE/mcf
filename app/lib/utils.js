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

// MBEE modules
const publicData = M.require('lib.get-public-data');

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
  opts.user = opts.user || ((req.user) ? publicData.getPublicData(req.user, 'user') : '');
  opts.title = opts.title || 'Model-Based Engineering Environment';
  return res.render(name, opts);
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
  // For each argument
  args.forEach((a) => {
    // Verify the argument is a string
    if (typeof a !== 'string') {
      throw new M.CustomError('Argument is not a string.', 400);
    }
  });

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
    else if (validOptions[option] === 'string') {
      parsedOptions[option] = options[option];
    }
    else if (validOptions[option] === 'number') {
      const number = parseInt(options[option], 10);
      if (isNaN(number)) { // eslint-disable-line no-restricted-globals
        throw new M.CustomError(`${options[option]} is not a number`, 400, 'warn');
      }
      else {
        parsedOptions[option] = number;
      }
    }
  });
  return parsedOptions;
};

/**
 * @description Validates a list of options and returns the desired response in
 * an object.
 *
 * @param {Object} options - The options object passed into the controller.
 * Should contain key/value pairs where the key is the option and the value is
 * the user input
 * @param {string[]} validOptions - An array of valid options for that function.
 * @param {Object} model - The model of the controller which called this
 * function.
 *
 * @return {Object} An object with key/value pairs formatted for use by the
 * controllers.
 */
module.exports.validateOptions = function(options, validOptions, model) {
  // Define the object to be returned to the user. Initialize populateString
  const returnObject = { populateString: '' };
  // Define valid searchOptions for the element model
  const searchOptions = ['parent', 'source', 'target', 'type', 'name',
    'createdBy', 'lastModifiedBy', 'archivedBy'];

  // Define the populateString for elements, since we populate contains by default
  if (model.modelName === 'Element') {
    returnObject.populateString = 'contains ';
  }
  // Not a valid mongoose model, throw an error
  else if (!model.hasOwnProperty('modelName')) {
    throw new M.CustomError('A valid model was not provided.', 500, 'error');
  }

  // Check if no options provided
  if (!options) {
    return returnObject;
  }

  // For each option provided
  Object.keys(options).forEach((opt) => {
    let val = options[opt];

    // Special case, ignore these as the controller handles these
    if (model.modelName === 'Element'
      && (searchOptions.includes(opt) || opt.startsWith('custom.'))) {
      // Ignore iteration of loop
      return;
    }
    // If the option is not valid for the calling function
    else if (!validOptions.includes(opt)) {
      throw new M.CustomError(`Invalid option [${opt}].`, 400, 'warn');
    }

    // Handle the populate option
    if (opt === 'populate') {
      // Ensure the value is an array
      if (!Array.isArray(val)) {
        throw new M.CustomError('The option \'populate\' is not an array.', 400, 'warn');
      }
      // Ensure every item in val is a string
      if (!val.every(o => typeof o === 'string')) {
        throw new M.CustomError(
          'Every value in the populate array must be a string.', 400, 'warn'
        );
      }

      // Ensure each field is able to be populated
      const validPopulateFields = model.getValidPopulateFields();
      val.forEach((p) => {
        // If the field cannot be populated, throw an error
        if (!validPopulateFields.includes(p)) {
          throw new M.CustomError(`The field ${p} cannot be populated.`, 400, 'warn');
        }
      });

      // Set the populateString option in the returnObject
      returnObject.populateString += val.join(' ');
    }

    // Handle the archived option
    if (opt === 'archived') {
      // Ensure value is a boolean
      if (typeof val !== 'boolean') {
        throw new M.CustomError('The option \'archived\' is not a boolean.', 400, 'warn');
      }

      // Set the field archived in the returnObject
      returnObject.archived = val;
    }

    // Handle the subtree option
    if (opt === 'subtree') {
      // Ensure value is a boolean
      if (typeof options.subtree !== 'boolean') {
        throw new M.CustomError('The option \'subtree\' is not a boolean.', 400, 'warn');
      }

      // Set the subtree option in the returnObject
      returnObject.subtree = val;
    }

    // Handle the fields option
    if (opt === 'fields') {
      // Ensure the value is an array
      if (!Array.isArray(val)) {
        throw new M.CustomError('The option \'fields\' is not an array.', 400, 'warn');
      }
      // Ensure every item in the array is a string
      if (!val.every(o => typeof o === 'string')) {
        throw new M.CustomError(
          'Every value in the fields array must be a string.', 400, 'warn'
        );
      }

      // If -_id in array remove it, that field MUST be returned
      val = val.filter(field => field !== '-_id');

      // Set the fieldsString option in the returnObject
      returnObject.fieldsString = val.join(' ');
    }

    // Handle the limit option
    if (opt === 'limit') {
      // Ensure the value is a number
      if (typeof options.limit !== 'number') {
        throw new M.CustomError('The option \'limit\' is not a number.', 400, 'warn');
      }

      // Set the limit option in the returnObject
      returnObject.limit = val;
    }

    // Handle the option skip
    if (opt === 'skip') {
      // Ensure the value is a number
      if (typeof options.skip !== 'number') {
        throw new M.CustomError('The option \'skip\' is not a number.', 400, 'warn');
      }

      // Ensure the value is not negative
      if (options.skip < 0) {
        throw new M.CustomError('The option \'skip\' cannot be negative.', 400, 'warn');
      }

      // Set the skip option in the returnObject
      returnObject.skip = val;
    }

    // Handle the lean option
    if (opt === 'lean') {
      // Ensure the value is a boolean
      if (typeof options.lean !== 'boolean') {
        throw new M.CustomError('The option \'lean\' is not a boolean.', 400, 'warn');
      }

      // Set the lean option in the returnObject
      returnObject.lean = val;
    }
  });

  return returnObject;
};
