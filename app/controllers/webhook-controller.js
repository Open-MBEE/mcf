/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.webhook-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This implements the behavior and logic for webhooks.
 * It also provides function for interacting with webhooks.
 */

// Expose webhook controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  remove
};

// NPM modules
const uuidv4 = require('uuid/v4');

// Node modules
const assert = require('assert');

// MBEE modules
const Webhook = M.require('models.webhook');
const Org = M.require('models.organization');
const Project = M.require('models.project');
const Branch = M.require('models.branch');
const utils = M.require('lib.utils');
const errors = M.require('lib.errors');
const helper = M.require('lib.controller-utils');
const sani = M.require('lib.sanitization');
const permissions = M.require('lib.permissions');
const EventEmitter = M.require('lib.events');
const jmi = M.require('lib.jmi-conversions');
const validators = M.require('lib.validators');


/**
 * @description This function finds one or many webhooks. Depending on the parameters provided,
 * this function will find a single webhook by ID, multiple webhooks by ID, or all the webhooks
 * a user has access to, at varying levels of scope. A user can specify that they want to find
 * webhooks at the system level, org level, project level, or branch level. The user making
 * the request must have respective admin permissions at the level of the request, or be a
 * system-wide admin.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} [webhooks] - The webhooks to find. Can either be an array of
 * webhook ids, a single webhook id, or not provided, which defaults to every webhook at the
 * system/org/project/branch level being found.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of the found
 * objects. By default, no fields are populated.
 * @param {boolean} [options.includeArchived = false] - If true, find results will include
 * archived objects.
 * @param {string[]} [options.fields] - An array of fields to return. By default includes the
 * _id. To NOT include a field, provide a '-' in front.
 * @param {number} [options.limit = 0] - A number that specifies the maximum number of
 * documents to be returned to the user. A limit of 0 is equivalent to setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the number of
 * documents to skip returning. For example, if 10 documents are found and skip is 5, the first
 * 5 documents will NOT be returned.
 * @param {string} [options.sort] - Provide a particular field to sort the results by. To sort
 * in reverse order, provide a '-' in front.
 * @param {string} [options.org] - An org ID to query for webhooks on.
 * @param {string} [options.project] - A project ID to query for webhooks on. The org must also
 * be provided.
 * @param {string} [options.branch] - A branch ID to query for webhooks on. The org and project
 * must also be provided.
 * @param {string} [options.type] - Search for webhooks with a specific type.
 * @param {string} [options.name] - Search for webhooks with a specific name.
 * @param {string} [options.createdBy] - Search for webhooks with a specific createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for webhooks with a specific lastModifiedBy
 * value.
 * @param {string} [options.archived] - Search only for archived webhooks.  If false, only
 * returns unarchived webhooks.  Overrides the includeArchived option.
 * @param {string} [options.archivedBy] - Search for webhooks with a specific archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use dot notation
 * for the keys. Ex: custom.hello = 'world'.
 *
 * @returns {Promise<object[]>} Array of found webhook objects.
 *
 * @example
 * find({User}, ['webhook1', 'webhook2'], { type: 'Outgoing' })
 * .then(function(webhooks) {
 *   // Do something with the found webhooks
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function find(requestingUser, webhooks, options) {
  try {
    // Set options if no webhooks were provided, but options were
    if (typeof webhooks === 'object' && webhooks !== null && !Array.isArray(webhooks)) {
      // Note: assumes input param webhooks is input option param
      options = webhooks; // eslint-disable-line no-param-reassign
      webhooks = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['undefined', 'object', 'string'], webhooks, 'Webhooks');

    // Sanitize input parameters and create function-wide variables
    let saniWebhooks = (webhooks !== undefined)
      ? sani.db(JSON.parse(JSON.stringify(webhooks)))
      : undefined;
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const searchQuery = { archived: false };

    // Validate the provided options
    const validatedOptions = utils.validateOptions(options, ['includeArchived',
      'populate', 'fields', 'limit', 'skip', 'sort'], Webhook);

    // Ensure search options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['type', 'name', 'createdBy', 'lastModifiedBy', 'archived',
        'archivedBy', 'org', 'project', 'branch'];

      // Loop through provided options, look for validSearchOptions
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the archived search option is a boolean
          if (o === 'archived' && typeof options[o] !== 'boolean') {
            throw new M.DataFormatError(`The option '${o}' is not a boolean.`, 'warn');
          }
          // Ensure the search option is a string
          else if (typeof options[o] !== 'string' && o !== 'archived') {
            throw new M.DataFormatError(`The option '${o}' is not a string.`, 'warn');
          }
          // Add the search option to the searchQuery
          searchQuery[o] = sani.db(options[o]);
        }
      });
    }

    // Ensure saniWebhooks is an array
    if (saniWebhooks !== undefined && !Array.isArray(saniWebhooks)) saniWebhooks = [saniWebhooks];

    // Add webhook ids to the search query
    if (saniWebhooks !== undefined) searchQuery._id = { $in: saniWebhooks };

    // Add org, project, and branch to the search query
    if (searchQuery.hasOwnProperty('branch')) {
      if (!(searchQuery.hasOwnProperty('project') && searchQuery.hasOwnProperty('org'))) {
        throw new M.DataFormatError('Query for branch provided but not for org or project', 'warn');
      }
      searchQuery.reference = utils.createID(searchQuery.org, searchQuery.project,
        searchQuery.branch);
      delete searchQuery.org; delete searchQuery.project; delete searchQuery.branch;
    }
    else if (searchQuery.hasOwnProperty('project')) {
      if (!searchQuery.hasOwnProperty('org')) {
        throw new M.DataFormatError('Query for project provided but not for org', 'warn');
      }
      searchQuery.reference = utils.createID(searchQuery.org, searchQuery.project);
      delete searchQuery.org; delete searchQuery.project;
    }
    else if (searchQuery.hasOwnProperty('org')) {
      searchQuery.reference = searchQuery.org;
      delete searchQuery.org;
    }

    // If the includeArchived field is true, remove archived from the query; return everything
    if (validatedOptions.includeArchived) {
      delete searchQuery.archived;
    }
    // If the archived field is true, query only for archived webhooks
    if (validatedOptions.archived) {
      searchQuery.archived = true;
    }

    const foundWebhooks = await Webhook.find(searchQuery, validatedOptions.fieldsString,
      { skip: validatedOptions.skip,
        limit: validatedOptions.limit,
        sort: validatedOptions.sort,
        populate: validatedOptions.populateString
      });

    // Synchronously check the permissions for the webhooks
    await checkPermissions(reqUser, foundWebhooks, 'readWebhook',
      ((options && options.archived) || validatedOptions.includeArchived));

    return foundWebhooks;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This functions creates one or many webhooks. Before creating a webhook document,
 * it validates that the webhook data is formatted properly, ensures that the user has the proper
 * permissions, and upon creation returns the new document.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(object|object[])} webhooks - Either an array of objects containing webhook data or a
 * single object containing webhook data to create.
 * @param {string} [webhooks.name] - The name of the webhook.
 * @param {string} webhooks.type - The type of the webhook, which must be either 'Outgoing'
 * 'Incoming'.
 * @param {string} [webhooks.description] - An optional field to provide a description for
 * the webhook.
 * @param {object} webhooks.triggers - An array of strings referencing the events that trigger
 * outgoing webhooks and events that incoming webhooks will emit.
 * @param {object} [webhooks.response] - An object containing data used to send an http request upon
 * the webhook triggering. Outgoing webhooks must have a response field.
 * @param {object[]} [webhooks.response.url] - The url to send an http request to.
 * @param {object[]} [webhooks.response.method] - The method of the http request to send.
 * @param {object[]} [webhooks.response.headers] - The headers to send with the http request.
 * @param {object[]} [webhooks.response.token] - An optional token for additional security with
 * the http request.
 * @param {object[]} [webhooks.response.ca] - An optional ca for additional security with the
 * http request.
 * @param {object[]} [webhooks.response.data] - Optional data to send with the http request.
 * @param {string} [webhooks.token] - An optional field used to validate an external request and
 * trigger a webhook.
 * @param {string} [webhooks.tokenLocation] - A dot-delimited string that represents the location
 * of the token within an external request to trigger a webhook.
 * @param {object} [webhooks.reference] - An object representing the level at which the webhook is
 * registered. Can be blank to specify a server-level webhook or contain an org, project, and/or
 * branch id.
 * @param {string} [webhooks.reference.org] - The id of the owning organization.
 * @param {string} [webhooks.reference.project] - The id of the owning project.
 * @param {string} [webhooks.reference.branch] - The id of the owning branch.
 * @param {object} [webhooks.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of the found
 * objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default includes the _id,
 * id, and contains. To NOT include a field, provide a '-' in front.
 *
 * @returns {Promise<object[]>} Array of created webhook objects.
 *
 * @example
 * create({User}, [{Webhook1}, {Webhook2}, ...], { populate: ['createdBy'] })
 * .then(function(webhooks) {
 *   // Do something with the newly created webhooks
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function create(requestingUser, webhooks, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', webhooks, 'Webhooks');

    // Sanitize input parameters and create function-wide variables
    const saniWebhooks = sani.db(JSON.parse(JSON.stringify(webhooks)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let webhooksToCreate;

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], Webhook);

    // Check the type of the webhooks parameter; format it into an array if it's a single object
    if (Array.isArray(saniWebhooks)) {
      webhooksToCreate = saniWebhooks;
    }
    else if (typeof saniWebhooks === 'object') {
      webhooksToCreate = [saniWebhooks];
    }

    // Create a list of valid keys
    const validWebhookKeys = ['name', 'type', 'description', 'triggers', 'response', 'token',
      'tokenLocation', 'reference'];

    // Check that user has permission to create webhooks
    await checkPermissions(reqUser, webhooksToCreate, 'createWebhook');

    // Validate the webhook objects
    webhooksToCreate.forEach((webhook) => {
      try {
        // Validate the keys
        Object.keys(webhook).forEach((k) => {
          // Ensure it's on the list of valid keys
          assert.ok(validWebhookKeys.includes(k), `Invalid key: [${k}]`);
        });
      }
      catch (error) {
        throw new M.DataFormatError(error.message, 'warn');
      }
    });

    // Set the fields of the webhook object
    const webhookObjects = webhooksToCreate.map((webhookObj) => {
      webhookObj._id = uuidv4();

      if (webhookObj.hasOwnProperty('reference')) {
        if (webhookObj.reference.hasOwnProperty('branch')
          && (!webhookObj.reference.hasOwnProperty('project')
          || !webhookObj.reference.hasOwnProperty('org'))) {
          throw new M.DataFormatError(
            'Webhook reference contains branch but not project or org'
          );
        }
        else if (webhookObj.reference.hasOwnProperty('project')
          && !webhookObj.reference.hasOwnProperty('org')) {
          throw new M.DataFormatError('Webhook reference contains project but not org');
        }
        const idArray = [];
        if (webhookObj.reference.hasOwnProperty('org')) idArray.push(webhookObj.reference.org);
        if (webhookObj.reference.hasOwnProperty('project')) idArray.push(webhookObj.reference.project);
        if (webhookObj.reference.hasOwnProperty('branch')) idArray.push(webhookObj.reference.branch);
        webhookObj.reference = utils.createID(idArray);
      }
      else {
        webhookObj.reference = '';
      }

      if (webhookObj.hasOwnProperty('token')) {
        webhookObj.token = `${reqUser._id}:${webhookObj.token}`;
      }

      webhookObj.lastModifiedBy = reqUser._id;
      webhookObj.createdBy = reqUser._id;
      webhookObj.updatedOn = Date.now();
      webhookObj.archivedBy = webhookObj.archived ? reqUser._id : null;
      webhookObj.archivedOn = webhookObj.archived ? Date.now() : null;

      return webhookObj;
    });

    // Create the webhooks
    const createdWebhooks = await Webhook.insertMany(webhookObjects);

    // Find the newly created webhooks
    const createdIDs = createdWebhooks.map((w) => w._id);
    const foundWebhooks = await Webhook.find({ _id: { $in: createdIDs } },
      validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });

    // Emit the event for webhook creation
    EventEmitter.emit('webhooks-created', foundWebhooks);

    return foundWebhooks;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function updates one or many webhooks. It checks that the user has permissions
 * at the appropriate level and also that the user is not attempting to modify an immutable field.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {object|object[]} webhooks - An array of objects containing updates to webhooks or
 * a single object containing an update to a single webhook.
 * @param {string} webhooks.id - The ID of the webhook being updated. Field
 * cannot be updated but is required to find webhook.
 * @param {string} [webhooks.name] - The updated name of the webhook.
 * @param {string} [webhooks.description] - The updated description of the webhook.
 * @param {string[]} [webhooks.triggers] - The updated list of triggers for the webhook.
 * @param {object[]} [webhooks.response] - The updated response object for an outgoing webhook.
 * @param {object[]} [webhooks.response.url] - The url to send an http request to.
 * @param {object[]} [webhooks.response.method] - The method of the http request to send.
 * @param {object[]} [webhooks.response.headers] - The headers to send with the http request.
 * @param {object[]} [webhooks.response.token] - An optional token for additional security with
 * the http request.
 * @param {object[]} [webhooks.response.ca] - An optional ca for additional security with the
 * http request.
 * @param {object[]} [webhooks.response.data] - Optional data to send with the http request.
 * @param {string} [webhooks.token] - A key that external requests to trigger the webhook must
 * provide in order to verify the request.
 * @param {string} [webhooks.tokenLocation] - A dot-delimited string that represents the location
 * of the token within an external request to trigger a webhook.
 * @param {object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id, id, and contains. To NOT include a field, provide a '-' in
 * front.
 *
 * @returns {Promise<object[]>} Array of updated webhook objects.
 *
 * @example
 * update({User}, [{Webhook1}, {Webhook2}...], { populate: 'parent' })
 * .then(function(webhooks) {
 *   // Do something with the newly updated webhooks
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function update(requestingUser, webhooks, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType('object', webhooks, 'Webhooks');

    // Sanitize input parameters and function-wide variables
    const saniWebhooks = sani.db(JSON.parse(JSON.stringify(webhooks)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const duplicateCheck = [];
    let webhooksToUpdate;

    // Initialize and ensure options are valid
    const validatedOptions = utils.validateOptions(options, ['populate', 'fields'], Webhook);

    // Check the type of the webhooks parameter; standardize input into array format
    if (Array.isArray(saniWebhooks)) {
      webhooksToUpdate = saniWebhooks;
    }
    else if (typeof saniWebhooks === 'object') {
      webhooksToUpdate = [saniWebhooks];
    }

    // Ensure update data is formatted properly
    webhooksToUpdate.forEach((webhook) => {
      // Ensure that each update object has an _id
      if (webhook.id === undefined) {
        throw new M.DataFormatError('One or more webhook updates does not have an id.');
      }
      // Check that the update array does not contain duplicate ids
      if (duplicateCheck.includes(webhook.id)) {
        throw new M.DataFormatError(`Duplicate ids found in update array: ${webhook.id}`);
      }
      duplicateCheck.push(webhook.id);
    });

    // Get webhookIDs
    const webhookIDs = webhooksToUpdate.map((w) => w.id);

    // Find the webhooks
    const foundWebhooks = await Webhook.find({ _id: { $in: webhookIDs } });

    // Check that all webhooks were found
    if (foundWebhooks.length !== webhooksToUpdate.length) {
      const foundIDs = foundWebhooks.map((w) => w._id);
      const notFound = webhookIDs.filter((w) => !foundIDs.includes(w));
      throw new M.NotFoundError(`The following webhooks were not found: [${notFound}]`, 'warn');
    }

    // Convert webhook updates to jmi for efficiency
    const jmiUpdates = jmi.convertJMI(1, 2, webhooksToUpdate, 'id');
    const bulkArray = [];

    // Get array of editable parameters
    const validFields = Webhook.getValidUpdateFields();

    // First check that the user has permission to modify the webhooks
    await checkPermissions(reqUser, foundWebhooks, 'updateWebhook');

    // Check that the user isn't trying to make any invalid updates
    foundWebhooks.forEach((webhook) => {
      const webhookUpdate = jmiUpdates[webhook._id];

      // Save the _id but remove it from the update
      const id = webhook._id;
      delete webhookUpdate.id;

      // An archived webhook cannot be updated
      if (webhook.archived && (webhookUpdate.archived === undefined
        || webhookUpdate.archived !== false || webhookUpdate.archived !== 'false')) {
        throw new M.OperationError(`The Webhook [${webhook._id}] is archived. `
          + 'It must first be unarchived before performing this operation.', 'warn');
      }

      // For each key in the updated object
      Object.keys(webhookUpdate).forEach((key) => {
        // Check if the field is valid to update
        if (!validFields.includes(key)) {
          throw new M.OperationError(`Webhook property [${key}] cannot `
            + 'be changed.', 'warn');
        }

        // Get validator for field if one exists
        if (validators.webhook.hasOwnProperty(key)) {
          // If the validator is a regex string
          if (typeof validators.webhook[key] === 'string') {
            // If validation fails, throw error
            if (!RegExp(validators.webhook[key]).test(webhookUpdate[key])) {
              throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
                + `Invalid ${key}: [${webhookUpdate[key]}]`, 'warn');
            }
          }
          // If the validator is a function
          else if (typeof validators.webhook[key] === 'function') {
            if (!validators.webhook[key](webhookUpdate[key])) {
              throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
                + `Invalid ${key}: [${webhookUpdate[key]}]`, 'warn');
            }
          }
          else if (Object.keys(validators.webhook[key])
          .every(subkey => typeof validators.webhook[key][subkey] === 'function')) {
            const subkeys = Object.keys(validators.webhook[key]);
            subkeys.forEach((subkey) => {
              if (!validators.webhook[key][subkey](webhookUpdate[key])) {
                throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
                  + `Invalid ${key}: [${webhookUpdate[key]}]`, 'warn');
              }
            });
          }
          // Improperly formatted validator
          else {
            throw new M.ServerError(`Webhook validator [${key}] is improperly `
              + 'formatted.');
          }
        }

        if (key === 'archived') {
          // If the webhook is being archived
          if (webhookUpdate[key] && !webhook[key]) {
            webhookUpdate.archivedBy = reqUser._id;
            webhookUpdate.archivedOn = Date.now();
          }
          // If the org is being unarchived
          else if (!webhookUpdate[key] && webhook[key]) {
            webhookUpdate.archivedBy = null;
            webhookUpdate.archivedOn = null;
          }
        }
      });

      // Update lastModifiedBy field and updatedOn
      webhookUpdate.lastModifiedBy = reqUser._id;
      webhookUpdate.updatedOn = Date.now();

      // --- Incoming Webhook specific checks ---
      if (webhook.type === 'Incoming') {
        if (webhookUpdate.response !== undefined) {
          throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
            + 'An incoming webhook cannot have a response field.', 'warn');
        }
      }

      // --- Outgoing Webhook specific checks ---
      else if (webhook.type === 'Outgoing') {
        if (webhookUpdate.token !== undefined) {
          throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
            + 'An outgoing webhook cannot have a token.', 'warn');
        }
        if (webhookUpdate.tokenLocation !== undefined) {
          throw new M.DataFormatError(`Webhook ${webhook._id} validation failed: `
            + 'An outgoing webhook cannot have a tokenLocation.', 'warn');
        }
      }

      // Push the update onto the list of updates
      bulkArray.push({
        updateOne: {
          filter: { _id: id },
          update: webhookUpdate
        }
      });
    });

    // Send it
    await Webhook.bulkWrite(bulkArray);

    // Find the updated webhooks
    const foundUpdatedWebhooks = await Webhook.find({ _id: { $in: webhookIDs } },
      validatedOptions.fieldsString,
      { populate: validatedOptions.populateString });

    // Emit the event webhooks-updated
    EventEmitter.emit('webhooks-updated', foundUpdatedWebhooks);

    return foundUpdatedWebhooks;
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description This function removes one or many webhooks and returns the _ids of the deleted
 * webhooks.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {(string|string[])} webhooks - The webhooks to remove. Can either be an array of webhook
 * ids or a single webhook id.
 * @param {object} [options] - A parameter that provides supported options. There are currently
 * no supported options.
 *
 * @returns {Promise<object[]>} Array of deleted webhook ids.
 *
 * @example
 * remove({User}, ['webhook1', 'webhook2'])
 * .then(function(webhooks) {
 *   // Do something with the deleted webhooks
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
async function remove(requestingUser, webhooks, options) {
  try {
    // Ensure input parameters are correct type
    helper.checkParams(requestingUser, options);
    helper.checkParamsDataType(['object', 'string'], webhooks, 'Webhooks');

    // Sanitize input parameters and create function-wide variables
    const saniWebhooks = sani.db(JSON.parse(JSON.stringify(webhooks)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    let webhooksToDelete = [];

    // Check the type of the webhooks parameter
    if (Array.isArray(saniWebhooks) && saniWebhooks.length !== 0) {
      webhooksToDelete = saniWebhooks;
    }
    else if (typeof saniWebhooks === 'string') {
      webhooksToDelete = [saniWebhooks];
    }

    // Initialize search query
    const searchQuery = { _id: { $in: webhooksToDelete } };

    // Find webhooks to delete
    const foundWebhooks = await Webhook.find(searchQuery);
    const foundWebhookIDs = foundWebhooks.map((w) => w._id);

    // Check that all webhooks were found
    const notFoundIDs = webhooksToDelete.filter((w) => !foundWebhookIDs.includes(w));
    // If not all were found, throw an error
    if (notFoundIDs.length > 0) {
      throw new M.NotFoundError('The following webhooks were not found: '
        + `[${notFoundIDs}]`, 'warn');
    }

    // Check permission to delete webhooks
    await checkPermissions(reqUser, foundWebhooks, 'deleteWebhook');

    // Delete the webhooks
    await Webhook.deleteMany({ _id: { $in: webhooksToDelete } });

    // Emit event for webhook deletion
    EventEmitter.emit('webhooks-deleted', foundWebhooks);

    return foundWebhooks.map((w) => w._id);
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description A helper function that parses the reference id of a webhook and then
 * checks that the requesting user has permission to access the webhook.
 *
 * @param {User} reqUser - The model representing the requesting user.
 * @param {Webhook[]} webhooks - An array of webhooks to check permissions for.
 * @param {string} operation - The permission operation to check; read, write, update, or delete.
 * @param {boolean} archiveOption - A boolean to specify whether the user is searching for
 * an archived webhook or not. If so, webhooks existing on archived orgs/projects/branches will
 * also be returned.
 */
async function checkPermissions(reqUser, webhooks, operation, archiveOption = false) {
  for (let i = 0; i < webhooks.length; i++) {
    const webhook = webhooks[i];

    let orgID; let projID; let branchID;
    let organization; let project; let branch;

    if (typeof webhook.reference === 'object' && webhook.reference !== null) {
      if (webhook.reference.hasOwnProperty('org')) orgID = webhook.reference.org;
      if (webhook.reference.hasOwnProperty('project')) projID = webhook.reference.project;
      if (webhook.reference.hasOwnProperty('branch')) branchID = webhook.reference.branch;
    }
    else if (typeof webhook.reference === 'string') {
      const ids = webhook.reference === '' ? [] : utils.parseID(webhook.reference);
      if (ids.length > 0) orgID = ids.shift();
      if (ids.length > 0) projID = ids.shift();
      if (ids.length > 0) branchID = ids.shift();
    }

    if (orgID) {
      // Find the organization and validate that it was found and not archived (unless specified)
      // eslint-disable-next-line no-await-in-loop
      organization = await helper.findAndValidate(Org, orgID, archiveOption);
    }
    if (projID) {
      // Find the project and validate that it was found and not archived (unless specified)
      // eslint-disable-next-line no-await-in-loop
      project = await helper.findAndValidate(Project, utils.createID(orgID, projID),
        archiveOption);
    }
    if (branchID) {
      // Ensure the branch is not archived
      // eslint-disable-next-line no-await-in-loop
      branch = await helper.findAndValidate(Branch, utils.createID(orgID, projID, branchID),
        archiveOption);
    }

    // Check the permissions
    permissions[operation](reqUser, organization, project, branch);
  }
}
