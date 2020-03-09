/**
 * @classification UNCLASSIFIED
 *
 * @module lib.utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Connor Doyle
 * @author Phillip Lee
 *
 * @description Defines miscellaneous helper functions.
 */
/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow lists in descriptions


// Node modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// MBEE modules
const publicData = M.require('lib.get-public-data');

// Define mine type to content type look up table
const mineTypeTable = {
  '7z': 'application/x-7z-compressed',
  pdf: 'application/pdf',
  bin: 'application/octet-stream',
  bmp: 'image/bmp',
  css: 'text/css',
  csv: 'text/csv',
  json: 'application/json',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  mp4: 'video/mp4',
  png: 'image/png',
  svg: 'image/svg+xml',
  svd: 'application/vnd.svd',
  tar: 'application/x-tar',
  xml: 'application/xml',
  yaml: 'text/yaml',
  zip: 'application/zip'
};

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
 *
 * @type {string}
 */
module.exports.ID_DELIMITER = ':';

/**
 * @description Defines a render utility wrapper for the Express res.render
 * function to define and pass in default options.
 *
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 * @param {string} name - Name of the template to render.
 * @param {object} params - List of parameters to render.
 *
 * @returns {Function} Returns the response render function with the name and options.
 */
module.exports.render = function(req, res, name, params) {
  const opts = params || {};
  opts.pluginNames = (M.config.server.plugins.enabled)
    ? require(path.join(M.root, 'plugins', 'routes.js')).loadedPlugins : []; // eslint-disable-line global-require
  opts.ui = opts.ui || M.config.server.ui;
  opts.user = opts.user || ((req.user) ? publicData.getPublicData(req.user, req.user, 'user', {}) : '');
  opts.title = opts.title || 'Model-Based Engineering Environment';
  return res.render(name, opts);
};

/**
 * @description Creates a colon delimited string from any number of arguments.
 * If any items are not strings or other failure occurs, an error is thrown.
 *
 * @param {...string|string[]} args - An arbitrary number of strings to be
 * appended or an array of strings.
 *
 * @returns {string} Concatenated args with uid delimiter.
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
 * @description Splits a UID on the UID delimiter up and returns an array of UID components.
 *
 * @param {string} uid - The uid.
 *
 * @returns {string[]} Split uid.
 */
module.exports.parseID = function(uid) {
  return uid.split(this.ID_DELIMITER);
};

/**
 * @description Title-cases a string.
 *
 * @param {string} s - The string to be title-cased.
 * @param {boolean} [keepUpper=false] - Boolean indicating wither or not keep
 * uppercase characters as is.
 *
 * @returns {string} The title-cased word.
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
 * @param {*} a - The first parameter to be compared.
 * @param {*} b - The second parameter to be compared.
 *
 * @returns {boolean} Returns whether the parameters do or do not share deep equality.
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
 * @param {object} options - An optional parameter that provides supported
 * options.
 * @param {object} validOptions - An object containing valid option as keys and
 * the object's data type as values. e.g. populate: 'array'.
 *
 * @returns {object} Returns the parsed options object.
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
      if (options[option] === 'true' || options[option] === true) {
        parsedOptions[option] = true;
      }
      else if (options[option] === 'false' || options[option] === false) {
        parsedOptions[option] = false;
      }
      else if (!(typeof options[option] === 'boolean')) {
        throw new M.DataFormatError(`Option ${option} is not a boolean`, 'warn');
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
 * @param {object} options - The options object passed into the controller. Should
 * contain key/value pairs where the key is the option and the value is
 * the user input.
 * @param {string[]} validOptions - An array of valid options for that function.
 * @param {object} model - The model of the controller which called this
 * function.
 *
 * @returns {object} An object with key/value pairs formatted for use by the
 * controllers.
 */
module.exports.validateOptions = function(options, validOptions, model) {
  // Initialize the object to be returned to the user
  const validatedOptions = { populateString: '' };

  // Define valid search options depending on the model
  let validSearchOptions = [];
  switch (model.modelName) {
    case 'Organization':
      validSearchOptions = ['name', 'createdBy', 'lastModifiedBy', 'archived', 'archivedBy'];
      break;
    case 'Project':
      validSearchOptions = ['name', 'visibility', 'createdBy', 'lastModifiedBy', 'archived', 'archivedBy'];
      break;
    case 'Branch':
      validSearchOptions = ['tag', 'source', 'name', 'createdBy', 'lastModifiedBy', 'archived',
        'archivedBy'];
      break;
    case 'Element':
      validSearchOptions = ['parent', 'source', 'target', 'type', 'name', 'createdBy',
        'lastModifiedBy', 'archived', 'archivedBy', 'artifact'];
      // Set populateString to include require virtuals
      validatedOptions.populateString = 'contains sourceOf targetOf ';
      break;
    case 'Artifact':
      validSearchOptions = ['name', 'createdBy', 'archived', 'lastModifiedBy', 'archivedBy'];
      break;
    case 'User':
      validSearchOptions = ['fname', 'preferredName', 'lname', 'email', 'createdBy',
        'lastModifiedBy', 'archived', 'archivedBy'];
      break;
    case 'Webhook':
      validSearchOptions = ['type', 'name', 'createdBy', 'lastModifiedBy', 'archived',
        'archivedBy', 'org', 'project', 'branch'];
      break;
    default:
      throw new M.DataFormatError('No model provided', 'warn');
  }
  const requiredElementFields = ['contains', 'sourceOf', 'targetOf'];

  // Check if no options provided
  if (!options) {
    return validatedOptions;
  }

  // For each option provided
  Object.keys(options).forEach((opt) => {
    let val = options[opt];

    // Special case, ignore these as the controller handles these
    if (validSearchOptions.includes(opt) || opt.startsWith('custom.')) {
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
          validatedOptions.populateString += `${p} `;
        }
      });
    }

    // Handle the includeArchived option
    if (opt === 'includeArchived') {
      // Ensure value is a boolean
      if (typeof val !== 'boolean') {
        throw new M.DataFormatError('The option \'includeArchived\' is not a boolean.', 'warn');
      }
      // Only set this option if the user is not also specifying 'archived' in the search
      if (!Object.keys(options).includes('archived')) {
        validatedOptions.includeArchived = val;
      }
    }

    // Handle the subtree option
    if (opt === 'subtree') {
      // Ensure value is a boolean
      if (typeof options.subtree !== 'boolean') {
        throw new M.DataFormatError('The option \'subtree\' is not a boolean.', 'warn');
      }
      // Ensure subtree and rootpath are not both enabled at the same time
      if (options.rootpath) {
        throw new M.DataFormatError('Options \'subtree\' and \'rootpath\' cannot be'
        + ' applied simultaneously', 'warn');
      }

      // Set the subtree option in the returnObject
      validatedOptions.subtree = val;
    }

    // Handle the depth option
    if (opt === 'depth') {
      // Ensure value is a number
      if (typeof options.depth !== 'number') {
        throw new M.DataFormatError('The option \'depth\' is not a number.', 'warn');
      }
      // Ensure depth and rootpath are not both enabled at the same time
      if (options.rootpath) {
        throw new M.DataFormatError('Options \'depth\' and \'rootpath\' cannot be'
          + ' applied simultaneously', 'warn');
      }

      // Set the subtree option in the returnObject
      validatedOptions.depth = val;
    }

    // Handle the rootpath option
    if (opt === 'rootpath') {
      // Ensure value is a boolean
      if (typeof options.rootpath !== 'boolean') {
        throw new M.DataFormatError('The option \'rootpath\' is not a boolean.', 'warn');
      }
      validatedOptions.rootpath = val;
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
      validatedOptions.fieldsString = val.join(' ');

      // Handle special case for element virtuals
      if (model.modelName === 'Element') {
        const notSpecifiedVirtuals = requiredElementFields.filter(e => !val.includes(e));

        // For each virtual not specified in fields
        notSpecifiedVirtuals.forEach((virt) => {
          // Remove the virtual from the populateString
          validatedOptions.populateString = validatedOptions.populateString.replace(`${virt} `, '');
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
      validatedOptions.limit = val;
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
      validatedOptions.skip = val;
    }

    // Handle the sort option
    if (opt === 'sort') {
      // Get rid of the default value
      validatedOptions.sort = {};
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
      validatedOptions.sort[val] = order;
    }

    // Handle the deleteBlob option
    if (opt === 'deleteBlob') {
      // Ensure the value is a boolean
      if (typeof options.deleteBlob !== 'boolean') {
        throw new M.DataFormatError('The option \'deleteBlob\' is not a boolean.', 'warn');
      }

      // Set the deleteBlob option in the returnObject
      validatedOptions.deleteBlob = val;
    }
  });

  return validatedOptions;
};

/**
 * @description Handles a data stream containing gzipped data.
 *
 * @param {object} dataStream - The stream object carrying a gzip file.
 *
 * @returns {Promise<Buffer>} A promise containing the unzipped data.
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

/**
 * @description Looks up the content type based on the file extension.
 * Defaults to 'application/octet-stream' if no extension is found.
 *
 * @param {(string|null)} filename - Name of the file.
 *
 * @returns {string} - The content type of the file.
 */
module.exports.getContentType = function(filename) {
  // Initialize content type
  let contentType = 'application/octet-stream';

  // If filename null or has no extensions
  if (filename === null || !(filename.includes('.'))) {
    return contentType;
  }
  // Extract extension
  const ext = filename.split('.').pop();

  // Check ext in lookup table
  if (ext in mineTypeTable) {
    contentType = mineTypeTable[ext];
  }
  return contentType;
};

/**
 * @description Checks that the available heap memory allows for a file to be
 * read into memory.
 *
 * @param {string} filePath - The path of the file.
 *
 * @returns {boolean} If the file is safe to read or not.
 */
module.exports.readFileCheck = function(filePath) {
  // Check that the file exists
  if (fs.existsSync(filePath)) {
    // Get the size of the file, in bytes
    const fileSize = fs.statSync(filePath).size;
    // Get the total heap usage, in bytes
    const currentHeapUsage = process.memoryUsage().heapUsed;

    // Get the theoretical remaining heap usage after reading the file
    const totalHeapUsage = currentHeapUsage + fileSize;

    // If within 95% of memory limit, file is NOT safe to read
    return !(totalHeapUsage / 1024 / 1024 >= M.memoryLimit * 0.95);
  }
  else {
    // File does not exist, not safe to read
    return false;
  }
};

/**
 * @description This is a utility function that formats an object as JSON.
 * This function is used for formatting all API responses.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {string} message - The response message or error message.
 * @param {number} statusCode - The status code for the response.
 * @param {Function} next - Callback to to trigger the next middleware.
 * @param {string} [contentType="application/json"] - The content type for
 * the response.
 */
module.exports.formatResponse = function formatResponse(req, res, message, statusCode,
  next = null, contentType = 'application/json') {
  if (statusCode === 200) {
    // We send these headers for a success response
    res.header('Content-Type', contentType);
  }
  else {
    // We send these headers for an error response
    res.header('Content-Type', 'text/plain');
  }

  // Set the status code
  res.status(statusCode);

  // Pass the message along
  res.locals.message = message;

  // Set a marker that this response has been formatted
  res.locals.responseFormatted = true;

  // Calling next() allows post-APIController middleware to log the response. next should only
  // be passed in to this function when this function is called due to an error.
  if (next !== null) next();
};
