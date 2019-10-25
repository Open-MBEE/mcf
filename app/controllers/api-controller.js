/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.api-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 * @author Josh Kaplan
 * @author Leah De Laurell
 * @author Phillip Lee
 * @author Connor Doyle
 *
 * @description Defines the HTTP Rest API interface file. This file tightly
 * couples with the app/api-routes.js file.
 */
/* eslint-disable jsdoc/match-description */
/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabling these rules due to the use of headers for api endpoints


// Node modules
const path = require('path');

// NPM modules
const swaggerJSDoc = require('swagger-jsdoc');
const multer = require('multer');
const upload = multer().single('file');

// MBEE modules
const ArtifactController = M.require('controllers.artifact-controller');
const ElementController = M.require('controllers.element-controller');
const BranchController = M.require('controllers.branch-controller');
const OrgController = M.require('controllers.organization-controller');
const ProjectController = M.require('controllers.project-controller');
const UserController = M.require('controllers.user-controller');
const errors = M.require('lib.errors');
const jmi = M.require('lib.jmi-conversions');
const logger = M.require('lib.logger');
const publicData = M.require('lib.get-public-data');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');

// Expose `API Controller functions`
module.exports = {
  swaggerJSON,
  login,
  test,
  version,
  getOrgs,
  postOrgs,
  putOrgs,
  patchOrgs,
  deleteOrgs,
  getOrg,
  postOrg,
  putOrg,
  patchOrg,
  deleteOrg,
  getAllProjects,
  getProjects,
  postProjects,
  putProjects,
  patchProjects,
  deleteProjects,
  getProject,
  postProject,
  putProject,
  patchProject,
  deleteProject,
  getUsers,
  postUsers,
  putUsers,
  patchUsers,
  deleteUsers,
  searchUsers,
  getUser,
  postUser,
  putUser,
  patchUser,
  deleteUser,
  whoami,
  patchPassword,
  getElements,
  postElements,
  putElements,
  patchElements,
  deleteElements,
  searchElements,
  getElement,
  postElement,
  putElement,
  patchElement,
  deleteElement,
  getBranches,
  postBranches,
  patchBranches,
  deleteBranches,
  getBranch,
  patchBranch,
  postBranch,
  deleteBranch,
  getArtifact,
  patchArtifact,
  postArtifact,
  deleteArtifact,
  getBlob,
  postBlob,
  deleteBlob,
  getBlobById,
  invalidRoute
};

/* ------------------------( API Helper Function )--------------------------- */
/**
 * @description This is a utility function that formats an object as JSON.
 * This function is used for formatting all API responses.
 *
 * @param {object} obj - An object to convert to JSON-formatted string.
 * @param {boolean} [minified=false] - Whether or not to format the object.
 *
 * @returns {string} JSON string of object parameter.
 */
function formatJSON(obj, minified = false) {
  // If the object should be minified
  if (minified) {
    return JSON.stringify(obj);
  }
  // Stringify and format the object
  else {
    return JSON.stringify(obj, null, M.config.server.api.json.indent);
  }
}

/**
 * @description This is a utility function that formats an object as JSON.
 * This function is used for formatting all API responses.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {string} message - The response message or error message.
 * @param {number} statusCode - The status code for the response.
 * @param {string} [contentType="application/json"] - The content type for
 * the response.
 *
 * @returns {object} The response object.
 */
function returnResponse(req, res, message, statusCode,
  contentType = 'application/json') {
  if (statusCode === 200) {
    // We send these headers for a success response
    res.header('Content-Type', contentType);
  }
  else {
    // We send these headers for an error response
    res.header('Content-Type', 'text/plain');
  }

  // Send the message
  res.status(statusCode).send(message);
  // Log the response
  logger.logResponse(message.length, req, res);
  // Return res
  return res;
}

/**
 * @description Generates the Swagger specification based on the Swagger JSDoc
 * in the API routes file.
 *
 * @returns {object} swaggerJS object.
 */
function swaggerSpec() {
  return swaggerJSDoc({
    swaggerDefinition: {
      info: {
        title: 'MBEE API Documentation',          // Title (required)
        version: M.version                        // Version (required)
      }
    },
    apis: [
      path.join(M.root, 'app', 'api-routes.js') // Path to the API docs
    ]
  });
}

/* -------------------------( General API Endpoints )------------------------ */
/**
 * GET /api/doc/swagger.json
 *
 * @description Returns the swagger JSON specification.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with swagger JSON
 */
function swaggerJSON(req, res) {
  // Return swagger specification
  const json = formatJSON(swaggerSpec());
  return returnResponse(req, res, json, 200);
}

/**
 * POST /api/login
 *
 * @description Returns the login token after AuthController.doLogin().
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with session token
 */
function login(req, res) {
  const json = formatJSON({ token: req.session.token });
  return returnResponse(req, res, json, 200);
}

/**
 * GET /api/test
 *
 * @description Returns 200 status. Used to confirm API is up and running.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 */
function test(req, res) {
  res.status(200).send('');
  logger.logResponse(0, req, res);
}

/**
 * GET /api/version
 *
 * @description Returns the version number as JSON.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with version
 */
function version(req, res) {
  // Create version object
  const json = formatJSON({
    version: M.version,
    schemaVersion: M.schemaVersion,
    build: `${M.build}`
  });

  // Return version object
  return returnResponse(req, res, json, 200);
}

/* ----------------------( Organization API Endpoints )---------------------- */
/**
 * GET /api/orgs
 *
 * @description Gets an array of all organizations that a user has access to.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with orgs' public data
 *
 * NOTE: All users are members of the 'default' org, should always have
 * access to at least this organization.
 */
async function getOrgs(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let ids;
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    sort: 'string',
    ids: 'array',
    minified: 'boolean',
    name: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check query for ids
  if (options.ids) {
    ids = options.ids;
    delete options.ids;
  }
  // No IDs include in options, check body for IDs
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'string')) {
    ids = req.body;
  }
  // No IDs in options or body, check body for org objects
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    ids = req.body.map(o => o.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Get all organizations the requesting user has access to
    // NOTE: find() sanitizes arrOrgID.
    const orgs = await OrgController.find(req.user, ids, options);
    // Verify orgs array is not empty
    if (orgs.length === 0) {
      throw new M.NotFoundError('No orgs found.', 'warn');
    }

    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData, minified);

    // Return 200: OK and public org data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs
 *
 * @description Creates multiple orgs from an array of objects.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with orgs' public data
 */
async function postOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the org data
  let orgData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      orgData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    orgData = req.body;
  }

  try {
    // Create organizations from org data
    // NOTE: create() sanitizes orgData
    const orgs = await OrgController.create(req.user, orgData, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData, minified);

    // Return 200: OK and created orgs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/orgs
 *
 * @description Creates or replaces multiple orgs from an array of objects.
 * NOTE: this route is reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with orgs' public data
 */
async function putOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the org data
  let orgData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      orgData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    orgData = req.body;
  }

  try {
    // Create or replace organizations in org data
    // NOTE: createOrReplace() sanitizes orgData
    const orgs = await OrgController.createOrReplace(req.user, orgData, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData, minified);

    // Return 200: OK and created/replaced orgs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs
 *
 * @description Updates multiple orgs from an array of objects.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with orgs' public data
 */
async function patchOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the org data
  let orgData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      orgData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    orgData = req.body;
  }

  try {
    // Update the specified orgs
    // NOTE: update() sanitizes orgData
    const orgs = await OrgController.update(req.user, orgData, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData, minified);

    // Return 200: OK and the updated orgs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs
 *
 * @description Deletes multiple orgs from an array of org IDs or array of org
 * objects.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with array of deleted org IDs.
 */
async function deleteOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If req.body contains objects, grab the org IDs from the objects
  if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    req.body = req.body.map(o => o.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified orgs
    const orgIDs = await OrgController.remove(req.user, req.body, options);
    // Return 200: OK and the deleted org IDs
    // Format JSON
    const json = formatJSON(orgIDs, minified);

    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/orgs/:orgid
 *
 * @description Gets an organization by its id.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with org's public data
 */
async function getOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    includeArchived: 'boolean',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the org from it's id
    // NOTE: find() sanitizes req.params.orgid
    const orgs = await OrgController.find(req.user, req.params.orgid, options);
    // If no orgs found, return 404 error
    if (orgs.length === 0) {
      throw new M.NotFoundError(
        `Organization [${req.params.orgid}] not found.`, 'warn'
      );
    }

    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData[0], minified);

    // Return a 200: OK and the org's public data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid
 *
 * @description Takes an organization in the request body and an
 * organization ID in the URI and creates the organization.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with org's public data
 */
async function postOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.orgid)) {
    const error = new M.DataFormatError(
      'Organization ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the org ID in the body equal req.params.orgid
  req.body.id = req.params.orgid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create the organization with provided parameters
    // NOTE: create() sanitizes req.body
    const orgs = await OrgController.create(req.user, req.body, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData[0], minified);

    // Return 200: OK and created org
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/orgs/:orgid
 *
 * @description Creates or replaces an organization.
 * NOTE: this route is reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with org's public data
 */
async function putOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.orgid)) {
    const error = new M.DataFormatError(
      'Organization ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the org ID in the body equal req.params.orgid
  req.body.id = req.params.orgid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create or replace the organization with provided parameters
    // NOTE: createOrReplace() sanitizes req.body
    const orgs = await OrgController.createOrReplace(req.user, req.body, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData[0], minified);

    // Return 200: OK and created org
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid
 *
 * @description Updates the specified org.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with updated org
 */
async function patchOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.orgid)) {
    const error = new M.DataFormatError(
      'Organization ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set body org id
  req.body.id = req.params.orgid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Update the specified organization
    // NOTE: update() sanitizes req.body
    const orgs = await OrgController.update(req.user, req.body, options);
    // Get the public data of each org
    const orgsPublicData = sani.html(
      orgs.map(o => publicData.getPublicData(o, 'org', options))
    );

    // Format JSON
    const json = formatJSON(orgsPublicData[0], minified);

    // Return 200: OK and the updated org
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid
 *
 * @description Takes an orgid in the URI and deletes the corresponding org.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 * @param {Function} next - Callback function.
 *
 * @returns {object} Response object with deleted org ID.
 */
async function deleteOrg(req, res, next) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified organization
    // NOTE: remove() sanitizes req.params.orgid
    const orgIDs = await OrgController.remove(req.user, req.params.orgid, options);
    const orgID = orgIDs[0];

    // Format JSON
    const json = formatJSON(orgID, minified);

    // Return 200: OK and the deleted org IDs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/* -----------------------( Project API Endpoints )-------------------------- */
/**
 * GET /api/projects
 *
 * @description Gets all projects a user has access to across all orgs.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with projects' public data
 */
async function getAllProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    sort: 'string',
    minified: 'boolean',
    name: 'string',
    visibility: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Get all projects the requesting user has access to
    const projects = await ProjectController.find(req.user, null, undefined, options);
    // Verify project array is not empty
    if (projects.length === 0) {
      throw new M.NotFoundError('No projects found.', 'warn');
    }

    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData, minified);

    // Return 200: OK and public project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/org/:orgid/projects
 *
 * @description Gets an array of all projects that a user has access to on
 * a specified org or an array of specified projects on the specified org.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with projects' public data
 */
async function getProjects(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let ids;
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    ids: 'array',
    sort: 'string',
    minified: 'boolean',
    name: 'string',
    visibility: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check if ids was provided in the request query
  if (options.ids) {
    // Split the string by comma, add strings to ids
    ids = options.ids;
    delete options.ids;
  }
  // If project ids provided in array in request body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'string')) {
    ids = req.body;
  }
  // If project objects provided in array in request body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    ids = req.body.map(p => p.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Get all projects the requesting user has access to in a specified org
    // NOTE: find() sanitizes req.params.orgid and ids
    const projects = await ProjectController.find(req.user, req.params.orgid, ids, options);

    // Verify project array is not empty
    if (projects.length === 0) {
      throw new M.NotFoundError('No projects found.', 'warn');
    }

    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData, minified);

    // Return 200: OK and public project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/org/:orgid/projects
 *
 * @description This function creates multiple projects.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with created projects.
 */
async function postProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the project data
  let projectData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      projectData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    projectData = req.body;
  }

  try {
    // Create the specified projects
    // NOTE: create() sanitizes req.params.orgid and projectData
    const projects = await ProjectController.create(req.user, req.params.orgid, projectData,
      options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData, minified);

    // Return 200: OK and created project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/org/:orgid/projects
 *
 * @description This function creates/replaces multiple projects.
 * NOTE: this route is reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {object} Response object with created/replaced projects.
 */
async function putProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the project data
  let projectData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      projectData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    projectData = req.body;
  }

  try {
    // Create or replace the specified projects
    // NOTE: createOrReplace() sanitizes req.params.orgid and projectData
    const projects = await ProjectController.createOrReplace(req.user, req.params.orgid,
      projectData, options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData, minified);

    // Return 200: OK and created/replaced project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/org/:orgid/projects
 *
 * @description This function updates multiple projects.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with updated projects.
 */
async function patchProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the project data
  let projectData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      projectData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    projectData = req.body;
  }

  try {
    // Update the specified projects
    // NOTE: update() sanitizes req.params.orgid projectData
    const projects = await ProjectController.update(req.user, req.params.orgid,
      projectData, options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData, minified);

    // Return 200: OK and updated project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/org/:orgid/projects
 *
 * @description Deletes multiple projects from an array of project IDs or
 * array of project objects.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with deleted project IDs.
 */
async function deleteProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If req.body contains objects, grab the project IDs from the objects
  if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    req.body = req.body.map(p => p.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified projects
    const projectIDs = await ProjectController.remove(req.user, req.params.orgid,
      req.body, options);
    const parsedIDs = projectIDs.map(p => utils.parseID(p).pop());

    // Format JSON
    const json = formatJSON(parsedIDs, minified);

    // Return 200: OK and the deleted project IDs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/org/:orgid/projects/:projectid
 *
 * @description Gets a project by its project ID.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with project's public data
 */
async function getProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    includeArchived: 'boolean',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the project
    // NOTE: find() sanitizes req.params.projectid and req.params.orgid
    const projects = await ProjectController.find(req.user, req.params.orgid,
      req.params.projectid, options);
    // If no projects found, return 404 error
    if (projects.length === 0) {
      throw new M.NotFoundError(
        `Project [${req.params.projectid}] not found.`, 'warn'
      );
    }

    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData[0], minified);

    // Return 200: OK and public project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid
 *
 * @description Takes an organization ID and project ID in the URI and project
 * data in the request body, and creates a project.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created project.
 */
async function postProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If project ID was provided in the body, ensure it matches project ID in params
  if (req.body.hasOwnProperty('id') && (req.params.projectid !== req.body.id)) {
    const error = new M.DataFormatError(
      'Project ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the projectid in req.body in case it wasn't provided
  req.body.id = req.params.projectid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create project with provided parameters
    // NOTE: create() sanitizes req.params.orgid and req.body
    const projects = await ProjectController.create(req.user, req.params.orgid, req.body, options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData[0], minified);

    // Return 200: OK and created project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/orgs/:orgid/projects/:projectid
 *
 * @description  Creates or replaces a project.
 * NOTE: this route is reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created project.
 */
async function putProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If project ID was provided in the body, ensure it matches project ID in params
  if (req.body.hasOwnProperty('id') && (req.params.projectid !== req.body.id)) {
    const error = new M.DataFormatError(
      'Project ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the orgid in req.body in case it wasn't provided
  req.body.id = req.params.projectid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create or replace project with provided parameters
    // NOTE: createOrReplace() sanitizes req.params.orgid and req.body
    const projects = await ProjectController.createOrReplace(req.user, req.params.orgid,
      req.body, options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData[0], minified);

    // Return 200: OK and created/replaced project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid
 *
 * @description Updates the project specified in the URI.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with updated project.
 */
async function patchProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If project ID was provided in the body, ensure it matches project ID in params
  if (req.body.hasOwnProperty('id') && (req.params.projectid !== req.body.id)) {
    const error = new M.DataFormatError(
      'Project ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the orgid in req.body in case it wasn't provided
  req.body.id = req.params.projectid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Update the specified project
    // NOTE: update() sanitizes req.params.orgid and req.body
    const projects = await ProjectController.update(req.user, req.params.orgid,
      req.body, options);
    const publicProjectData = sani.html(
      projects.map(p => publicData.getPublicData(p, 'project', options))
    );

    // Format JSON
    const json = formatJSON(publicProjectData[0], minified);

    // Return 200: OK and updated project data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid
 *
 * @description Takes an orgid and projectid in the URI and deletes a project.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with deleted project ID.
 */
async function deleteProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified project
    // NOTE: remove() sanitizes req.params.orgid and req.params.projectid
    const projectIDs = await ProjectController.remove(req.user, req.params.orgid,
      req.params.projectid, options);
    const parsedIDs = utils.parseID(projectIDs[0]).pop();

    // Format JSON
    const json = formatJSON(parsedIDs, minified);

    // Return 200: OK and the deleted project ID
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/* -----------------------( User API Endpoints )------------------------------*/
/**
 * GET /api/users
 *
 * @description Gets multiple users by ID or all users in the system.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with users' public data
 */
async function getUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    sort: 'string',
    usernames: 'array',
    minified: 'boolean',
    fname: 'string',
    preferredName: 'string',
    lname: 'string',
    email: 'string',
    custom: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set usernames to undefined
  let usernames;

  // Usernames provided in query
  if (options.usernames) {
    usernames = options.usernames;
    delete options.usernames;
  }
  // Usernames provided in body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'string')) {
    usernames = req.body;
  }
  // Check user object in body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    usernames = req.body.map(p => p.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Get Users
    // NOTE: find() sanitizes req.usernames
    const users = await UserController.find(req.user, usernames, options);

    // Set the failedlogins parameter to true if the requesting user is an admin
    if (req.user.admin) options.failedlogins = true;

    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Verify users public data array is not empty
    if (publicUserData.length === 0) {
      throw new M.NotFoundError('No users found.', 'warn');
    }

    // Format JSON
    const json = formatJSON(publicUserData, minified);

    // Return 200: OK and public user data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/users
 *
 * @description Creates multiple users.
 * NOTE: System-wide admin only.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with users' public data
 */
async function postUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the user data
  let userData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      userData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    userData = req.body;
  }

  try {
    // Create users
    // NOTE: create() sanitizes userData
    const users = await UserController.create(req.user, userData, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData, minified);

    // Return 200: OK and public user data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/users
 *
 * @description Creates or replaced multiple users. NOTE: This endpoint is
 * reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with users' public data
 */
async function putUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the user data
  let userData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      userData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    userData = req.body;
  }

  try {
    // Create or replace users
    // NOTE: createOrReplace() sanitizes userData
    const users = await UserController.createOrReplace(req.user, userData, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData, minified);

    // Return 200: OK and public user data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/users
 *
 * @description Updates multiple users.
 * NOTE: System-wide admin only.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with users' public data
 */
async function patchUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the user data
  let userData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      userData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    userData = req.body;
  }

  try {
    // Update the specified users
    // NOTE: update() sanitizes userData
    const users = await UserController.update(req.user, userData, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData, minified);

    // Return 200: OK and the updated users
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/users
 *
 * @description Deletes multiple users from an array of user IDs or array of user
 * objects.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with usernames
 */
async function deleteUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified users
    // NOTE: remove() sanitizes req.body
    const usernames = await UserController.remove(req.user, req.body, options);
    // Format JSON
    const json = formatJSON(usernames, minified);

    // Return 200: OK and deleted usernames
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/users/:username
 *
 * @description Gets user by their username.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with user's public data
 */
async function getUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    includeArchived: 'boolean',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the member from its username
    // NOTE: find() sanitizes req.params.username
    const users = await UserController.find(req.user, req.params.username, options);
    // If no user found, return 404 error
    if (users.length === 0) {
      throw new M.NotFoundError(
        `User [${req.params.username}] not found.`, 'warn'
      );
    }

    // Set the failedlogins parameter to true if the requesting user is an admin
    if (req.user.admin) options.failedlogins = true;

    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData[0], minified);

    // Return a 200: OK and the user's public data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/users/:username
 *
 * @description Creates a new user.
 * NOTE: System-wide admin only.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created user
 */
async function postUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If username was provided in the body, ensure it matches username in params
  if (req.body.hasOwnProperty('username') && (req.body.username !== req.params.username)) {
    const error = new M.DataFormatError(
      'Username in body does not match username in params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the username in req.body in case it wasn't provided
  req.body.username = req.params.username;

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create user with provided parameters
    // NOTE: create() sanitizes req.body
    const users = await UserController.create(req.user, req.body, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData[0], minified);

    // Return 200: OK and created user
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/users/:username
 *
 * @description Creates or replaces a user. NOTE: This endpoint is reserved for
 * system-wide admins ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created user
 */
async function putUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If username was provided in the body, ensure it matches username in params
  if (req.body.hasOwnProperty('username') && (req.body.username !== req.params.username)) {
    const error = new M.DataFormatError(
      'Username in body does not match username in params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the username in req.body in case it wasn't provided
  req.body.username = req.params.username;

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Creates or replaces a user with provided parameters
    // NOTE: createOrReplace() sanitizes req.body
    const users = await UserController.createOrReplace(req.user, req.body, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData[0], minified);

    // Return 200: OK and created/replaced user
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/users/:username
 *
 * @description Updates the user.
 * NOTE: System-wide admin only. Non admin can only edit themselves.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated user
 */
async function patchUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If username was provided in the body, ensure it matches username in params
  if (req.body.hasOwnProperty('username') && (req.body.username !== req.params.username)) {
    const error = new M.DataFormatError(
      'Username in body does not match username in params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set body username
  req.body.username = req.params.username;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Update the specified user
    // NOTE: update() sanitizes req.body
    const users = await UserController.update(req.user, req.body, options);
    const publicUserData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(publicUserData[0], minified);

    // Return 200: OK and updated user
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/users/:username
 *
 * @description Deletes a user.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with deleted username
 */
async function deleteUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified user
    // NOTE: remove() sanitizes req.params.username
    const usernames = await UserController.remove(req.user, req.params.username, options);
    const username = usernames[0];

    // Format JSON
    const json = formatJSON(username, minified);

    // Return 200: OK and the deleted username
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /users/whoami
 *
 * @description Returns the public information of the currently logged in user.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with user's public data
 */
async function whoami(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  const publicUserData = sani.html(
    publicData.getPublicData(req.user, 'user', options)
  );

  // Format JSON
  const json = formatJSON(publicUserData, minified);

  // Returns 200: OK and the users public data
  return returnResponse(req, res, json, 200);
}

/**
 * GET /users/search
 *
 * @description Does a text based search on users and returns any matches.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with found users
 */
async function searchUsers(req, res) {
  // Define options and query
  // Note: Undefined if not set
  let options;
  let query = '';
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    archived: 'boolean',
    includeArchived: 'boolean',
    limit: 'number',
    skip: 'number',
    sort: 'string',
    q: 'string',
    minified: 'boolean',
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for q (query)
  if (options.q) {
    query = options.q;
    delete options.q;
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find users
    // NOTE: search() sanitizes input params
    const users = await UserController.search(req.user, query, options);
    // Verify users public data array is not empty
    if (users.length === 0) {
      throw new M.NotFoundError('No users found.', 'warn');
    }

    // Set the failedlogins parameter to true if the requesting user is an admin
    if (req.user.admin) options.failedlogins = true;

    const usersPublicData = sani.html(
      users.map(u => publicData.getPublicData(u, 'user', options))
    );

    // Format JSON
    const json = formatJSON(usersPublicData, minified);

    // Return a 200: OK and public user data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/users/:username/password
 *
 * @description Updates a users password.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated user public data.
 */
async function patchPassword(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Ensure old password was provided
  if (!req.body.oldPassword) {
    const error = new M.DataFormatError('Old password not in request body.', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Ensure new password was provided
  if (!req.body.password) {
    const error = new M.DataFormatError('New password not in request body.', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Ensure confirmed password was provided
  if (!req.body.confirmPassword) {
    const error = new M.DataFormatError('Confirmed password not in request body.', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Ensure user is not trying to change another user's password
  if (req.user._id !== req.params.username) {
    const error = new M.OperationError('Cannot change another user\'s password.', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Update the password
    const user = await UserController.updatePassword(req.user, req.body.oldPassword,
      req.body.password, req.body.confirmPassword);
    const publicUserData = sani.html(
      publicData.getPublicData(user, 'user', options)
    );

    // Format JSON
    const json = formatJSON(publicUserData, minified);

    // Returns 200: OK and the updated user's public data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/* -----------------------( Elements API Endpoints )------------------------- */
/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Gets all elements or get specified elements.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with elements' public data
 */
async function getElements(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let elemIDs;
  let options;
  let format;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    subtree: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    lean: 'boolean',
    sort: 'string',
    ids: 'array',
    format: 'string',
    minified: 'boolean',
    parent: 'string',
    source: 'string',
    target: 'string',
    type: 'string',
    name: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check query for element IDs
  if (options.ids) {
    elemIDs = options.ids;
    delete options.ids;
  }
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'string')) {
    // No IDs include in options, check body
    elemIDs = req.body;
  }
  // Check element object in body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    elemIDs = req.body.map(p => p.id);
  }

  // Check for format conversion option
  if (options.hasOwnProperty('format')) {
    const validFormats = ['jmi1', 'jmi2', 'jmi3'];
    // If the provided format is not valid, error out
    if (!validFormats.includes(options.format)) {
      const error = new M.DataFormatError(`The format ${options.format} is not a `
        + 'valid format.', 'warn');
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
    format = options.format;
    delete options.format;
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find elements
    // NOTE: find() sanitizes input params
    const elements = await ElementController.find(req.user, req.params.orgid, req.params.projectid,
      req.params.branchid, elemIDs, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Verify elements public data array is not empty
    if (elementsPublicData.length === 0) {
      throw new M.NotFoundError('No elements found.', 'warn');
    }

    const retData = elementsPublicData;

    // Check for JMI conversion
    if (format) {
      // Convert data to correct JMI format
      try {
        let jmiData = [];

        // If JMI type 1, return plain element public data
        if (format === 'jmi1') {
          jmiData = elementsPublicData;
        }
        else if (format === 'jmi2') {
          jmiData = jmi.convertJMI(1, 2, elementsPublicData, 'id');
        }
        else if (format === 'jmi3') {
          jmiData = jmi.convertJMI(1, 3, elementsPublicData, 'id');
        }

        // Format JSON
        const json = formatJSON(jmiData, minified);

        // Return a 200: OK and public JMI type 3 element data
        return returnResponse(req, res, json, 200);
      }
      catch (err) {
        throw err;
      }
    }

    // Format JSON
    const json = formatJSON(retData, minified);

    // Return a 200: OK and public element data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Creates specified elements.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created elements
 */
async function postElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean',
    gzip: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the element data
  let elementData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      elementData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    elementData = req.body;
  }

  try {
    // Create the specified elements
    // NOTE: create() sanitizes input params
    const elements = await ElementController.create(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, elementData, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData, minified);

    // Return 200: OK and the new elements
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Creates/replaces specified elements. NOTE: this route is
 * reserved for system-wide admins ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created/replaced elements
 */
async function putElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the element data
  let elementData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      elementData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    elementData = req.body;
  }

  try {
    // Create or replace the specified elements
    // NOTE: createOrReplace() sanitizes input params
    const elements = await ElementController.createOrReplace(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, elementData, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData, minified);

    // Return 200: OK and the new/replaced elements
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Updates specified elements.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated elements
 */
async function patchElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the element data
  let elementData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      elementData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    elementData = req.body;
  }

  try {
    // Update the specified elements
    // NOTE: update() sanitizes input params
    const elements = await ElementController.update(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, elementData, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData, minified);

    // Return 200: OK and the updated elements
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Deletes multiple elements from an array of element IDs or array
 * of element objects.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 * @returns {object} Response object with element ids.
 */
async function deleteElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified elements
    // NOTE: remove() sanitizes input params
    const elements = await ElementController.remove(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);
    const parsedIDs = elements.map(e => utils.parseID(e).pop());

    // Format JSON
    const json = formatJSON(parsedIDs, minified);

    // Return 200: OK and the deleted element ids
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/search
 *
 * @description Does a text based search on elements and returns any matches.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with elements
 */
async function searchElements(req, res) {
  // Define options and query
  // Note: Undefined if not set
  let options;
  let query = '';
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    limit: 'number',
    fields: 'array',
    skip: 'number',
    sort: 'string',
    q: 'string',
    minified: 'boolean',
    parent: 'string',
    source: 'string',
    target: 'string',
    type: 'string',
    name: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for q (query)
  if (options.hasOwnProperty('q')) {
    query = options.q;
    delete options.q;
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find elements
    // NOTE: search() sanitizes input params
    const elements = await ElementController.search(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, query, options);
    // Verify elements public data array is not empty
    if (elements.length === 0) {
      throw new M.NotFoundError('No elements found.', 'warn');
    }

    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData, minified);

    // Return a 200: OK and public element data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Gets an element.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with element's public data
 */
async function getElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    includeArchived: 'boolean',
    subtree: 'boolean',
    fields: 'array',
    minified: 'boolean',
    rootpath: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the element
    // NOTE: find() sanitizes input params
    const elements = await ElementController.find(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.params.elementid, options);
    // If no element found, return 404 error
    if (elements.length === 0) {
      throw new M.NotFoundError(
        `Element [${req.params.elementid}] not found.`, 'warn'
      );
    }

    let elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // If the subtree option was not provided, return only the first element
    if (!options.subtree && !options.rootpath) {
      elementsPublicData = elementsPublicData[0];
    }

    // Format JSON
    const json = formatJSON(elementsPublicData, minified);

    // Return 200: OK and the elements
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Creates an element.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created element
 */
async function postElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.elementid)) {
    const error = new M.DataFormatError(
      'Element ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the element ID in the body equal req.params.elementid
  req.body.id = req.params.elementid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create element with provided parameters
    // NOTE: create() sanitizes input params
    const elements = await ElementController.create(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData[0], minified);

    // Return 200: OK and the created element
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PUT /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Creates or replaces an element. NOTE: this route is reserved
 * for system-wide admins ONLY.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created/replaced element
 */
async function putElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.elementid)) {
    const error = new M.DataFormatError(
      'Element ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the element ID in the body equal req.params.elementid
  req.body.id = req.params.elementid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create or replace element with provided parameters
    // NOTE: createOrReplace() sanitizes input params
    const elements = await ElementController.createOrReplace(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData[0], minified);

    // Return 200: OK and the created/replaced element
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Updates the specified element.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated element
 */
async function patchElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.elementid)) {
    const error = new M.DataFormatError(
      'Element ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the element ID in the body equal req.params.elementid
  req.body.id = req.params.elementid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Updates the specified element
    // NOTE: update() sanitizes input params
    const elements = await ElementController.update(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);
    const elementsPublicData = sani.html(
      elements.map(e => publicData.getPublicData(e, 'element', options))
    );

    // Format JSON
    const json = formatJSON(elementsPublicData[0], minified);

    // Return 200: OK and the updated element
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Deletes an element.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with deleted element id.
 */
async function deleteElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified element
    // NOTE: remove() sanitizes input params
    const element = await ElementController.remove(req.user, req.params.orgid, req.params.projectid,
      req.params.branchid, [req.params.elementid], options);
    const parsedID = utils.parseID(element[0]).pop();

    // Format JSON
    const json = formatJSON(parsedID, minified);

    // Return 200: OK and deleted element ID
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/* -----------------------( Branches API Endpoints )------------------------- */
/**
 * GET /api/orgs/:orgid/projects/:projectid/branches
 *
 * @description Gets all branches or get specified branches.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with branches' public data
 */
async function getBranches(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let branchIDs;
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    includeArchived: 'boolean',
    fields: 'array',
    limit: 'number',
    skip: 'number',
    sort: 'string',
    ids: 'array',
    minified: 'boolean',
    source: 'string',
    tag: 'boolean',
    name: 'string',
    createdBy: 'string',
    lastModifiedBy: 'string',
    archivedBy: 'string'
  };

  // Loop through req.query
  if (req.query) {
    Object.keys(req.query).forEach((k) => {
      // If the key starts with custom., add it to the validOptions object
      if (k.startsWith('custom.')) {
        validOptions[k] = 'string';
      }
    });
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check query for branch IDs
  if (options.ids) {
    branchIDs = options.ids;
    delete options.ids;
  }
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'string')) {
    // No IDs include in options, check body
    branchIDs = req.body;
  }
  // Check branch object in body
  else if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    branchIDs = req.body.map(p => p.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find branches
    // NOTE: find() sanitizes input params
    const branches = await BranchController.find(req.user, req.params.orgid, req.params.projectid,
      branchIDs, options);
    const branchesPublicData = sani.html(
      branches.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Verify branches public data array is not empty
    if (branchesPublicData.length === 0) {
      throw new M.NotFoundError('No branches found.', 'warn');
    }

    // Format JSON
    const json = formatJSON(branchesPublicData, minified);

    // Return a 200: OK and public branch data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/org/:orgid/projects/:projectid/branches
 *
 * @description This function creates multiple branches.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with created branches.
 */
async function postBranches(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the branch data
  let branchData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      branchData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    branchData = req.body;
  }

  try {
    // Create the specified branches
    // NOTE: create() sanitizes req.params.orgid, req.params.projectid, and branchData
    const branches = await BranchController.create(req.user, req.params.orgid, req.params.projectid,
      branchData, options);
    const publicBranchData = sani.html(
      branches.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Format JSON
    const json = formatJSON(publicBranchData, minified);

    // Return 200: OK and created branch data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches
 *
 * @description Updates specified branches.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated branches
 */
async function patchBranches(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Get the branch data
  let branchData;
  if (req.headers['content-type'] === 'application/gzip') {
    try {
      // This function parses incoming gzipped data
      branchData = await utils.handleGzip(req);
    }
    catch (error) {
      // Error occurred with options, report it
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  }
  else {
    branchData = req.body;
  }

  try {
    // Update the specified branches
    // NOTE: update() sanitizes input params
    const branches = await BranchController.update(req.user, req.params.orgid, req.params.projectid,
      branchData, options);
    const branchesPublicData = sani.html(
      branches.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Format JSON
    const json = formatJSON(branchesPublicData, minified);

    // Return 200: OK and the updated branches
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/org/:orgid/projects/:projectid/branches
 *
 * @description Deletes multiple branches from an array of branch IDs or
 * array of branch objects.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with deleted branch IDs.
 */
async function deleteBranches(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If req.body contains objects, grab the branch IDs from the objects
  if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    req.body = req.body.map(b => b.id);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified branches
    const branchIDs = await BranchController.remove(req.user, req.params.orgid,
      req.params.projectid, req.body, options);
    const parsedIDs = branchIDs.map(p => utils.parseID(p).pop());

    // Format JSON
    const json = formatJSON(parsedIDs, minified);

    // Return 200: OK and the deleted branch IDs
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/org/:orgid/projects/:projectid/branches/:branchid
 *
 * @description Gets a branch by its branch ID.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with branch's public data
 */
async function getBranch(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    includeArchived: 'boolean',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the branch
    // NOTE: find() sanitizes req.params.branchid, req.params.projectid and req.params.orgid
    const branch = await BranchController.find(req.user, req.params.orgid, req.params.projectid,
      req.params.branchid, options);
    // If no branch found, return 404 error
    if (branch.length === 0) {
      throw new M.NotFoundError(
        `Branch [${req.params.branchid}] not found.`, 'warn'
      );
    }

    const publicBranchData = sani.html(
      branch.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Format JSON
    const json = formatJSON(publicBranchData[0], minified);

    // Return 200: OK and public branch data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid
 *
 * @description Creates a branch.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created branch
 */
async function postBranch(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.branchid)) {
    const error = new M.DataFormatError(
      'Branch ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the branch ID in the body equal req.params.branchid
  req.body.id = req.params.branchid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Create branch with provided parameters
    // NOTE: create() sanitizes input params
    const branch = await BranchController.create(req.user, req.params.orgid, req.params.projectid,
      req.body, options);
    const branchesPublicData = sani.html(
      branch.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Format JSON
    const json = formatJSON(branchesPublicData[0], minified);

    // Return 200: OK and the created branch
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid
 *
 * @description Updates the specified branch.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated branch
 */
async function patchBranch(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.branchid)) {
    const error = new M.DataFormatError(
      'Branch ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the branch ID in the body equal req.params.branchid
  req.body.id = req.params.branchid;

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Updates the specified branch
    // NOTE: update() sanitizes input params
    const branch = await BranchController.update(req.user, req.params.orgid, req.params.projectid,
      req.body, options);
    const branchPublicData = sani.html(
      branch.map(b => publicData.getPublicData(b, 'branch', options))
    );

    // Format JSON
    const json = formatJSON(branchPublicData[0], minified);

    // Return 200: OK and the updated branch
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid
 *
 * @description Takes an orgid, projectid, and branchid in the URI and
 * deletes a branch.
 *
 * @param {object} req - request express object
 * @param {object} res - response express object
 *
 * @returns {object} Response object with deleted branch ID.
 */
async function deleteBranch(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  try {
    // Remove the specified branch
    // NOTE: remove() sanitizes params
    const branchID = await BranchController.remove(req.user, req.params.orgid, req.params.projectid,
      req.params.branchid, options);
    const parsedIDs = utils.parseID(branchID[0]).pop();

    // Format JSON
    const json = formatJSON(parsedIDs, minified);

    // Return 200: OK and the deleted branch ID
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/* -----------------------( Artifacts API Endpoints )------------------------- */
/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 *
 * @description Gets a single artifact by ID.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with found artifact
 */
async function getArtifact(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean',
    includeArchived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  try {
    // Find the artifact from its artifact.id, branch.id, project.id, and org.id
    // NOTE: find() sanitizes input params
    const artifact = await ArtifactController.find(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.params.artifactid, options);

    // If no artifact found, return 404 error
    if (artifact.length === 0) {
      throw new M.NotFoundError(
        `Artifact [${req.params.artifactid}] not found.`, 'warn'
      );
    }

    const publicArtifactData = sani.html(
      artifact.map(a => publicData.getPublicData(a, 'artifact', options))
    );

    // Format JSON
    const json = formatJSON(publicArtifactData[0], minified);

    // Return 200: OK and public artifact data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 *
 * @description Creates a single artifact.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with created artifact
 */
async function postArtifact(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // If artifact ID was provided in the body, ensure it matches artifact ID in params
  if (Object.prototype.hasOwnProperty.call('id')
    && (req.params.artifactid !== req.body.id)) {
    const error = new M.DataFormatError(
      'Artifact ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the artifact ID in the body equal req.params.artifactid
  req.body.id = req.params.artifactid;

  // Create artifact with provided parameters
  // NOTE: create() sanitizes input params
  try {
    const artifact = await ArtifactController.create(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);

    const artifactsPublicData = sani.html(
      artifact.map(a => publicData.getPublicData(a, 'artifact', options))
    );
    // Format JSON
    const json = formatJSON(artifactsPublicData[0], minified);
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 *
 * @description Updates a single artifact.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with updated artifact
 */
async function patchArtifact(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    fields: 'array',
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }

  // Set the lean option to true for better performance
  options.lean = true;

  // Singular api: should not accept arrays
  if (Array.isArray(req.body)) {
    const error = new M.DataFormatError('Input cannot be an array', 'warn');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Sanitize body
  req.body = JSON.parse(JSON.stringify(req.body));

  // If an ID was provided in the body, ensure it matches the ID in params
  if (Object.prototype.hasOwnProperty.call('id')
    && (req.params.artifactid !== req.body.id)) {
    const error = new M.DataFormatError(
      'Artifact ID in the body does not match ID in the params.', 'warn'
    );
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Set the artifact ID in the body equal req.params.artifactid
  req.body.id = req.params.artifactid;

  try {
    // Update the specified artifact
    // NOTE: update() sanitizes input params
    const artifact = await ArtifactController.update(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.body, options);

    const artifactsPublicData = sani.html(
      artifact.map(a => publicData.getPublicData(a, 'artifact', options))
    );

    // Format JSON
    const json = formatJSON(artifactsPublicData[0], minified);
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid
 *
 * @description Deletes a single artifact.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response object with success boolean
 */
async function deleteArtifact(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;
  let minified = false;

  // Define valid option and its parsed type
  const validOptions = {
    minified: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return res.status(error.status).send(error);
  }

  // Check options for minified
  if (options.hasOwnProperty('minified')) {
    minified = options.minified;
    delete options.minified;
  }
  try {
    // Remove the specified artifact
    // NOTE: remove() sanitizes input params
    const artIDs = await ArtifactController.remove(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.params.artifactid, options);
    const parsedIDs = artIDs.map(a => utils.parseID(a).pop());

    // Format JSON
    const json = formatJSON(parsedIDs[0], minified);

    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/orgs/:orgid/projects/:projectid/artifacts/blob
 *
 * @description Gets an artifact blob by org.id, project.id,
 * location, filename.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {Buffer} Artifact blob.
 */
async function getBlob(req, res) {
  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  try {
    const artifactBlob = await ArtifactController.getBlob(req.user, req.params.orgid,
      req.params.projectid, req.query);

    // Set filename
    res.header('Content-Disposition', `attachment; filename=${req.query.filename}`);

    // Return 200: OK and public artifact data
    return returnResponse(req, res, artifactBlob, 200,
      utils.getContentType(req.query.filename));
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/artifacts/blob
 *
 * @description Post an artifact blob by org.id, project.id,
 * location, filename.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Posted Artifact object.
 */
async function postBlob(req, res) {
  await upload(req, res, async function(err) {
    // Sanity Check: there should always be a user in the request
    if (!req.user) {
      M.log.critical('No requesting user available.');
      const error = new M.ServerError('Request Failed');
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }

    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      M.log.error(err);
      const error = new M.ServerError('Artifact upload failed.', 'warn');
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }

    // Sanity Check: file is required
    if (!req.file) {
      const error = new M.DataFormatError('Artifact Blob file must be defined.', 'warn');
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }

    try {
      const artifact = await ArtifactController.postBlob(req.user, req.params.orgid,
        req.params.projectid, req.body, req.file.buffer);

      // Set minified to true
      const minified = true;

      // Format JSON
      const json = formatJSON(artifact, minified);
      return returnResponse(req, res, json, 200);
    }
    catch (error) {
      return returnResponse(req, res, error.message, errors.getStatusCode(error));
    }
  });
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/artifacts/blob
 *
 * @description Deletes an artifact blob by org.id, project.id,
 * location, filename.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Deleted Artifact object.
 */
async function deleteBlob(req, res) {
  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  try {
    const artifact = await ArtifactController.deleteBlob(req.user, req.params.orgid,
      req.params.projectid, req.query);

    // Set minified to true
    const minified = true;

    // Format JSON
    const json = formatJSON(artifact, minified);

    // Return 200: OK and public artifact data
    return returnResponse(req, res, json, 200);
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/artifacts/:artifactid/blob
 *
 * @description Gets an artifact blob by its org.id, project.id, branch.id and
 * artifact.id.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {Buffer} Artifact blob.
 */
async function getBlobById(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    includeArchived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    M.log.critical('No requesting user available.');
    const error = new M.ServerError('Request Failed');
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }

  try {
    // Add additional options
    options.fields = ['location', 'filename'];

    // Find the artifact from its artifact.id, project.id, and org.id
    // NOTE: find() sanitizes input params
    const artMetadata = await ArtifactController.find(req.user, req.params.orgid,
      req.params.projectid, req.params.branchid, req.params.artifactid, options);

    // Ensure blob found
    if (artMetadata.length === 0) {
      throw new M.NotFoundError(
        `No artifact blob found. [${req.params.artifactid}]`, 'warn'
      );
    }
    const artifactBlob = await ArtifactController.getBlob(req.user, req.params.orgid,
      req.params.projectid, artMetadata[0]);

    // Set filename
    res.header('Content-Disposition', `attachment; filename=${artMetadata[0].filename}`);

    // Return 200: OK and public artifact data
    return returnResponse(req, res, artifactBlob, 200,
      utils.getContentType(artMetadata[0].filename));
  }
  catch (error) {
    // If an error was thrown, return it and its status
    return returnResponse(req, res, error.message, errors.getStatusCode(error));
  }
}

/**
 * ALL /api/*
 *
 * @description Returns an error message if a user tries to access an invalid
 * api route.
 *
 * @param {object} req - Request express object
 * @param {object} res - Response express object
 *
 * @returns {object} Response error message
 */
function invalidRoute(req, res) {
  const json = 'Invalid Route or Method.';
  return returnResponse(req, res, json, 404);
}
