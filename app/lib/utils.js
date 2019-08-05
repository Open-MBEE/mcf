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
const zlib = require('zlib');

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
 * @param {(...string|string[])} args - An arbitrary number of strings to be
 * appended or an array of strings.
 *
 * @return {string} Concatenated args with uid delimiter
 */
module.exports.createID = function(...args) {
  // If passed in an array of strings, set equal to args
  if (Array.isArray(args[0]) && args[0].every(e => typeof e === 'string')) {
    args = args[0]; // eslint-disable-line
  }

  // For each argument
  args.forEach((a) => {
    // Verify the argument is a string
    if (typeof a !== 'string') {
      throw new M.DataFormatError('Argument is not a string.', 'warn');
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
    throw new M.DataFormatError('Invalid UID.', 'warn');
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
      throw new M.DataFormatError(`Invalid parameter: ${key}`, 'warn');
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
        throw new M.DataFormatError(`${options[option]} is not a number`, 'warn');
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
  const returnObject = { populateString: '', sort: { $natural: 1 } };
  // Define valid searchOptions for the org model
  const orgSearchOptions = ['name', 'createdBy', 'lastModifiedBy', 'archivedBy'];
  // Define valid searchOptions for the project model
  const projectSearchOptions = ['name', 'visibility', 'createdBy',
    'lastModifiedBy', 'archivedBy'];
  // Define valid searchOptions for the branch model
  const branchSearchOptions = ['tag', 'source', 'name', 'createdBy',
    'lastModifiedBy', 'archivedBy'];
  // Define valid searchOptions for the element model
  const elemSearchOptions = ['parent', 'source', 'target', 'type', 'name',
    'createdBy', 'lastModifiedBy', 'archivedBy'];
  // Define valid searchOptions for the user model
  const userSearchOptions = ['fname', 'preferredName', 'lname', 'email',
    'createdBy', 'lastModifiedBy', 'archivedBy'];
  const requiredElementFields = ['contains', 'sourceOf', 'targetOf'];

  // Add required populate fields to populate string for Element model
  if (model.modelName === 'Element') {
    // Set populateString to include require virtuals
    returnObject.populateString = 'contains sourceOf targetOf ';
  }

  // Check if no options provided
  if (!options) {
    return returnObject;
  }

  // For each option provided
  Object.keys(options).forEach((opt) => {
    let val = options[opt];

    // Special case, ignore these as the controller handles these
    if ((model.modelName === 'Element'
      && (elemSearchOptions.includes(opt) || opt.startsWith('custom.')))
      || (model.modelName === 'Branch'
      && (branchSearchOptions.includes(opt) || opt.startsWith('custom.')))
      || (model.modelName === 'User'
      && (userSearchOptions.includes(opt) || opt.startsWith('custom.')))
      || (model.modelName === 'Project'
      && (projectSearchOptions.includes(opt) || opt.startsWith('custom.')))
      || (model.modelName === 'Organization'
      && (orgSearchOptions.includes(opt) || opt.startsWith('custom.')))) {
      // Ignore iteration of loop
      return;
    }
    // If the option is not valid for the calling function
    else if (!validOptions.includes(opt)) {
      throw new M.DataFormatError(`Invalid option [${opt}].`, 'warn');
    }

    // Handle the populate option
    if (opt === 'populate') {
      // Ensure the value is an array
      if (!Array.isArray(val)) {
        throw new M.DataFormatError('The option \'populate\' is not an array.', 'warn');
      }
      // Ensure every item in val is a string
      if (!val.every(o => typeof o === 'string')) {
        throw new M.DataFormatError(
          'Every value in the populate array must be a string.', 'warn'
        );
      }

      // Ensure each field is able to be populated
      const validPopulateFields = model.getValidPopulateFields();
      val.forEach((p) => {
        // If the field cannot be populated, throw an error
        if (!validPopulateFields.includes(p)) {
          throw new M.OperationError(`The field ${p} cannot be populated.`, 'warn');
        }

        // If the field is not a required virtual on the Element model
        if (!(model.modelName === 'Element' && requiredElementFields.includes(p))) {
          // Add field to populateString
          returnObject.populateString += `${p} `;
        }
      });
    }

    // Handle the archived option
    if (opt === 'archived') {
      // Ensure value is a boolean
      if (typeof val !== 'boolean') {
        throw new M.DataFormatError('The option \'archived\' is not a boolean.', 'warn');
      }

      // Set the field archived in the returnObject
      returnObject.archived = val;
    }

    // Handle the subtree option
    if (opt === 'subtree') {
      // Ensure value is a boolean
      if (typeof options.subtree !== 'boolean') {
        throw new M.DataFormatError('The option \'subtree\' is not a boolean.', 'warn');
      }

      // Set the subtree option in the returnObject
      returnObject.subtree = val;
    }

    // Handle the fields option
    if (opt === 'fields') {
      // Ensure the value is an array
      if (!Array.isArray(val)) {
        throw new M.DataFormatError('The option \'fields\' is not an array.', 'warn');
      }
      // Ensure every item in the array is a string
      if (!val.every(o => typeof o === 'string')) {
        throw new M.DataFormatError(
          'Every value in the fields array must be a string.', 'warn'
        );
      }

      // If -_id in array remove it, that field MUST be returned
      val = val.filter(field => field !== '-_id');

      // Set the fieldsString option in the returnObject
      returnObject.fieldsString = val.join(' ');

      // Handle special case for element virtuals
      if (model.modelName === 'Element') {
        const notSpecifiedVirtuals = requiredElementFields.filter(e => !val.includes(e));

        // For each virtual not specified in fields
        notSpecifiedVirtuals.forEach((virt) => {
          // Remove the virtual from the populateString
          returnObject.populateString = returnObject.populateString.replace(`${virt} `, '');
        });
      }
    }

    // Handle the limit option
    if (opt === 'limit') {
      // Ensure the value is a number
      if (typeof options.limit !== 'number') {
        throw new M.DataFormatError('The option \'limit\' is not a number.', 'warn');
      }

      // Set the limit option in the returnObject
      returnObject.limit = val;
    }

    // Handle the option skip
    if (opt === 'skip') {
      // Ensure the value is a number
      if (typeof options.skip !== 'number') {
        throw new M.DataFormatError('The option \'skip\' is not a number.', 'warn');
      }

      // Ensure the value is not negative
      if (options.skip < 0) {
        throw new M.DataFormatError('The option \'skip\' cannot be negative.', 'warn');
      }

      // Set the skip option in the returnObject
      returnObject.skip = val;
    }

    // Handle the sort option
    if (opt === 'sort') {
      // Get rid of the default value
      returnObject.sort = {};
      // initialize sort order
      let order = 1;
      // If the user has specified sorting in reverse order
      if (val[0] === '-') {
        order = -1;
        val = val.slice(1);
      }
      // Handle cases where user is looking for _id
      if (val === 'id' || val === 'username') {
        val = '_id';
      }
      // Return the parsed sort option in the format {sort_field: order}
      returnObject.sort[val] = order;
    }

    // Handle the lean option
    if (opt === 'lean') {
      // Ensure the value is a boolean
      if (typeof options.lean !== 'boolean') {
        throw new M.DataFormatError('The option \'lean\' is not a boolean.', 'warn');
      }

      // Set the lean option in the returnObject
      returnObject.lean = val;
    }
  });

  return returnObject;
};

/**
 * @description Handles a data stream containing gzipped data.
 *
 * @param {Object} dataStream - The stream object carrying a gzip file
 *
 * @return {Promise} A promise containing the unzipped data
 */
module.exports.handleGzip = function(dataStream) {
  // Create the promise to return
  return new Promise((resolve, reject) => {
    // We receive the data in chunks so we want to collect the entire file before trying to unzip
    const chunks = [];
    dataStream.on('data', (chunk) => {
      // Hold each chunk in memory
      chunks.push(chunk);
    });
    dataStream.on('end', () => {
      // Combine the chunks into a single buffer when the stream is done sending
      const buffer = Buffer.concat(chunks);
      // Unzip the data
      zlib.gunzip(buffer, (err, result) => {
        if (err) {
          M.log.warn(err.message);
          return reject(new M.DataFormatError('Could not unzip the provided file', 'warn'));
        }
        // Return the unzipped data
        return resolve(JSON.parse(result.toString()));
      });
    });
  });
};
