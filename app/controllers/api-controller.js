/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.api-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the HTTP Rest API interface file. This file tightly
 * couples with the app/api-routes.js file.
 */

// Node.js Modules
const path = require('path');

// NPM Modules
const swaggerJSDoc = require('swagger-jsdoc');

// MBEE Modules
const ElementController = M.require('controllers.element-controller');
const OrgController = M.require('controllers.organization-controller');
const ProjectController = M.require('controllers.project-controller');
const UserController = M.require('controllers.user-controller');
const utils = M.require('lib.utils');

// Expose `API Controller functions`
module.exports = {
  swaggerJSON,
  login,
  test,
  version,
  getOrgs,
  postOrgs,
  patchOrgs,
  deleteOrgs,
  getOrg,
  postOrg,
  patchOrg,
  deleteOrg,
  getAllProjects,
  getProjects,
  postProjects,
  patchProjects,
  deleteProjects,
  getProject,
  postProject,
  patchProject,
  deleteProject,
  getUsers,
  postUsers,
  patchUsers,
  deleteUsers,
  getUser,
  postUser,
  patchUser,
  deleteUser,
  whoami,
  patchPassword,
  getElements,
  postElements,
  patchElements,
  deleteElements,
  getElement,
  postElement,
  patchElement,
  deleteElement,
  invalidRoute
};

/* ------------------------( API Helper Function )--------------------------- */
/**
 * @description This is a utility function that formats an object as JSON.
 * This function is used for formatting all API responses.
 *
 * @param {Object} obj - An object to convert to JSON-formatted string.
 *
 * @returns {string} JSON string of object parameter
 */
function formatJSON(obj) {
  return JSON.stringify(obj, null, M.config.server.api.json.indent);
}

/**
 * @description Generates the Swagger specification based on the Swagger JSDoc
 * in the API routes file.
 *
 * @return {Object} swaggerJS object
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
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with swagger JSON
 */
function swaggerJSON(req, res) {
  // Return swagger specification
  res.header('Content-Type', 'application/json');
  return res.status(200).send(formatJSON(swaggerSpec()));
}

/**
 * POST /api/login
 *
 * @description Returns the login token after AuthController.doLogin().
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with session token
 */
function login(req, res) {
  res.header('Content-Type', 'application/json');
  return res.status(200).send(formatJSON({ token: req.session.token }));
}

/**
 * GET /api/test
 *
 * @description Returns 200 status. Used to confirm API is up and running.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with 200 status code
 */
function test(req, res) {
  res.header('Content-Type', 'application/json');
  return res.status(200).send('');
}

/**
 * GET /api/version
 *
 * @description Returns the version number as JSON.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with version
 */
function version(req, res) {
  // Create version object
  const obj = {
    version: M.version,
    schemaVersion: M.schemaVersion,
    build: `${M.build}`
  };

  // Return version object
  res.header('Content-Type', 'application/json');
  return res.status(200).send(formatJSON(obj));
}

/* ----------------------( Organization API Endpoints )---------------------- */
/**
 * GET /api/orgs
 *
 * @description Gets an array of all organizations that a user has access to.
 * Returns a 404 error in no organizations are found.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with orgs' public data
 *
 * NOTE: All users are members of the 'default' org, should always have
 * access to at least this organization.
 */
function getOrgs(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let ids;
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    ids: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Get all organizations the requesting user has access to
  // NOTE: find() sanitizes arrOrgID.
  OrgController.find(req.user, ids, options)
  .then((orgs) => {
    // Verify orgs array is not empty
    if (orgs.length === 0) {
      const error = new M.CustomError('No orgs found.', 404, 'warn');
      return res.status(error.status).send(error);
    }

    // Return 200: OK and public org data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs.map(o => o.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/orgs
 *
 * @description Creates multiple orgs from an array of objects.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with orgs' public data
 */
function postOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Create organizations in request body
  // NOTE: create() sanitizes req.body
  OrgController.create(req.user, req.body, options)
  .then((orgs) => {
    // Return 200: OK and created orgs
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs.map(o => o.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/orgs
 *
 * @description Updates multiple orgs from an array of objects.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with orgs' public data
 */
function patchOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Update the specified orgs
  // NOTE: update() sanitizes req.body
  OrgController.update(req.user, req.body, options)
  .then((orgs) => {
    // Return 200: OK and the updated orgs
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs.map(o => o.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/orgs
 *
 * @description Deletes multiple orgs from an array of org IDs or array of org
 * objects.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with array of deleted org IDs.
 */
function deleteOrgs(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return res.status(error.status).send(error);
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If req.body contains objects, grab the org IDs from the objects
  if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    req.body = req.body.map(o => o.id);
  }

  // Remove the specified orgs
  OrgController.remove(req.user, req.body, options)
  // Return 200: OK and the deleted org IDs
  .then((orgIDs) => {
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgIDs));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /api/orgs/:orgid
 *
 * @description Gets an organization by its id.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with org's public data
 */
function getOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Find the org from it's id
  // NOTE: find() sanitizes req.params.orgid
  OrgController.find(req.user, req.params.orgid, options)
  .then((orgs) => {
    // If no orgs found, return 404 error
    if (orgs.length === 0) {
      const error = new M.CustomError(
        `Organization [${req.params.orgid}] not found.`, 404, 'warn'
      );
      return res.status(error.status).send(error);
    }

    // Return a 200: OK and the org's public data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/orgs/:orgid
 *
 * @description Takes an organization in the request body and an
 * organization ID in the URI and creates the organization.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with org's public data
 */
function postOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.orgid)) {
    const error = new M.CustomError(
      'Organization ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set the org ID in the body equal req.params.orgid
  req.body.id = req.params.orgid;

  // Create the organization with provided parameters
  // NOTE: create() sanitizes req.body
  OrgController.create(req.user, req.body, options)
  .then((orgs) => {
    // Return 200: OK and created org
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/orgs/:orgid
 *
 * @description Updates the specified org. Takes an id in the URI and update
 * object in the body, and update the org.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with updated org
 */
function patchOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.orgid)) {
    const error = new M.CustomError(
      'Organization ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set body org id
  req.body.id = req.params.orgid;

  // Update the specified organization
  // NOTE: update() sanitizes req.body
  OrgController.update(req.user, req.body, options)
  .then((orgs) => {
    // Return 200: OK and the updated org
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgs[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/orgs/:orgid
 *
 * @description Takes an orgid in the URI and deletes the corresponding org.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with deleted org ID.
 */
function deleteOrg(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return res.status(error.status).send(error);
  }

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // Remove the specified organization
  // NOTE: remove() sanitizes req.params.orgid
  OrgController.remove(req.user, req.params.orgid, options)
  .then((orgIDs) => {
    // Return 200: OK and the deleted org IDs
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(orgIDs[0]));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/* -----------------------( Project API Endpoints )-------------------------- */
/**
 * GET /api/projects
 *
 * @description Gets all projects a user has access to across all orgs.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with projects' public data
 */
function getAllProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Get all projects the requesting user has access to
  ProjectController.find(req.user, null, undefined, options)
  .then((projects) => {
    // Verify project array is not empty
    if (projects.length === 0) {
      const error = new M.CustomError('No projects found.', 404, 'warn');
      return res.status(error.status).send(error);
    }

    // Return 200: OK and public project data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects.map(p => p.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /api/org/:orgid/projects
 *
 * @description Gets an array of all projects that a user has access to on
 * a specified org or an array of specified projects on the specified org.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with projects' public data
 */
function getProjects(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let ids;
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    ids: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Get all projects the requesting user has access to in a specified org
  // NOTE: find() sanitizes req.params.orgid and ids
  ProjectController.find(req.user, req.params.orgid, ids, options)
  .then((projects) => {
    // Verify project array is not empty
    if (projects.length === 0) {
      const error = new M.CustomError('No projects found.', 404, 'warn');
      return res.status(error.status).send(error);
    }

    // Return 200: OK and public project data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects.map(p => p.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/org/:orgid/projects
 *
 * @description This function creates multiple projects.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with created projects.
 */
function postProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Create the specified projects
  // NOTE: create() sanitizes req.params.orgid and req.body
  ProjectController.create(req.user, req.params.orgid, req.body, options)
  .then((projects) => {
    // Return 200: OK and the created projects
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects.map(p => p.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/org/:orgid/projects
 *
 * @description This function updates multiple projects.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with updated projects.
 */
function patchProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Update the specified projects
  // NOTE: update() sanitizes req.params.orgid req.body
  ProjectController.update(req.user, req.params.orgid, req.body, options)
  .then((projects) => {
    // Return 200: OK and the updated projects
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects.map(p => p.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/org/:orgid/projects
 *
 * @description This function deletes multiple projects.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with deleted project IDs.
 */
function deleteProjects(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // If req.body contains objects, grab the project IDs from the objects
  if (Array.isArray(req.body) && req.body.every(s => typeof s === 'object')) {
    req.body = req.body.map(p => p.id);
  }

  // Remove the specified projects
  ProjectController.remove(req.user, req.params.orgid, req.body, options)
  .then((projectIDs) => {
    // Return 200: OK and the deleted project IDs
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projectIDs.map(p => utils.parseID(p).pop())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /api/org/:orgid/projects/:projectid
 *
 * @description Gets a project by its project ID.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with found project
 */
function getProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Find the project
  // NOTE: find() sanitizes req.params.projectid and req.params.orgid
  ProjectController.find(req.user, req.params.orgid, req.params.projectid, options)
  .then((projects) => {
    // If no projects found, return 404 error
    if (projects.length === 0) {
      const error = new M.CustomError(
        `Project [${req.params.projectid}] not found.`, 404, 'warn'
      );
      return res.status(error.status).send(error);
    }

    // Return a 200: OK and the found project
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/orgs/:orgid/projects/:projectid
 *
 * @description Takes an organization ID and project ID in the URI and project
 * data in the request body, and creates a project.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with created project.
 */
function postProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If project ID was provided in the body, ensure it matches project ID in params
  if (req.body.hasOwnProperty('id') && (req.params.projectid !== req.body.id)) {
    const error = new M.CustomError(
      'Project ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set the orgid in req.body in case it wasn't provided
  req.body.id = req.params.projectid;

  // Create project with provided parameters
  // NOTE: create() sanitizes req.params.orgid and req.body
  ProjectController.create(req.user, req.params.orgid, req.body, options)
  .then((projects) => {
    // Return 200: OK and created project
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid
 *
 * @description Updates the project specified in the URI.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with updated project.
 */
function patchProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If project ID was provided in the body, ensure it matches project ID in params
  if (req.body.hasOwnProperty('id') && (req.params.projectid !== req.body.id)) {
    const error = new M.CustomError(
      'Project ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set the orgid in req.body in case it wasn't provided
  req.body.id = req.params.projectid;

  // Update the specified project
  // NOTE: update() sanitizes req.params.orgid and req.body
  ProjectController.update(req.user, req.params.orgid, req.body, options)
  .then((projects) => {
    // Return 200: OK and the updated project
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(projects[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid
 *
 * @description Takes an orgid and projectid in the URI and deletes a project.
 * NOTE: This function is for system-wide admins ONLY.
 *
 * @param {Object} req - request express object
 * @param {Object} res - response express object
 *
 * @return {Object} Response object with deleted project ID.
 */
function deleteProject(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Remove the specified project
  // NOTE: remove() sanitizes req.params.orgid and req.params.projectid
  ProjectController.remove(req.user, req.params.orgid, req.params.projectid, options)
  .then((projectIDs) => {
    // Return 200: OK and the deleted project ID
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(utils.parseID(projectIDs[0]).pop()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/* -----------------------( User API Endpoints )------------------------------*/
/**
 * GET /api/users
 *
 * @description Gets multiple users by ID or all users in the system.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with users' public data
 */
function getUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    usernames: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Get Users
  // NOTE: find() sanitizes req.usernames
  UserController.find(req.user, usernames, options)
  .then((users) => {
    // Return 200: OK and public user data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(users.map(u => u.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/users
 *
 * @description Creates multiple users.
 * NOTE: System-wide admin only.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with users' public data
 */
function postUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Create users
  // NOTE: create() sanitizes req.body
  UserController.create(req.user, req.body, options)
  .then((users) => {
    // Return 200: OK and public user data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(users.map(u => u.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/users
 *
 * @description Updates multiple users.
 * NOTE: System-wide admin only.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with users' public data
 */
function patchUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Update the specified users
  // NOTE: update() sanitizes req.body
  UserController.update(req.user, req.body, options)
  .then((users) => {
    // Return 200: OK and the updated users
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(users.map(u => u.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/users
 *
 * @description Deletes multiple users.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with usernames
 */
function deleteUsers(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Remove the specified users
  // NOTE: remove() sanitizes req.body
  UserController.remove(req.user, req.body, options)
  .then((usernames) => {
    // Return 200: OK and deleted usernames
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(usernames));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /api/users/:username
 *
 * @description Gets user by their username.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with user's public data
 */
function getUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Find the member from it's username
  // NOTE: find() sanitizes req.params.username
  UserController.find(req.user, req.params.username, options)
  .then((user) => {
    // If no user found, return 404 error
    if (user.length === 0) {
      const error = new M.CustomError(
        `User [${req.params.username}] not found.`, 404, 'warn'
      );
      return res.status(error.status).send(error);
    }

    // Return a 200: OK and the user's public data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(user[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/users/:username
 *
 * @description Creates a new user.
 * NOTE: System-wide admin only.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with created user
 */
function postUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If username was provided in the body, ensure it matches username in params
  if (req.body.hasOwnProperty('username') && (req.body.username !== req.params.username)) {
    const error = new M.CustomError(
      'Username in body does not match username in params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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
    return res.status(error.status).send(error);
  }

  // Create user with provided parameters
  // NOTE: create() sanitizes req.body
  UserController.create(req.user, req.body, options)
  .then((users) => {
    // Return 200: OK and created user
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(users[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/users/:username
 *
 * @description Updates the user.
 * NOTE: System-wide admin only. Non admin can only edit themselves.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with updated user
 */
function patchUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If username was provided in the body, ensure it matches username in params
  if (req.body.hasOwnProperty('username') && (req.body.username !== req.params.username)) {
    const error = new M.CustomError(
      'Username in body does not match username in params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set body username
  req.body.username = req.params.username;

  // Update the specified user
  // NOTE: update() sanitizes req.body
  UserController.update(req.user, req.body, options)
  .then((users) => {
    // Return 200: OK and updated user
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(users[0].getPublicData()));
  })
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/users/:username
 *
 * @description Deletes a user.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with deleted username
 */
function deleteUser(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Remove the specified user
  // NOTE: remove() sanitizes req.params.username
  UserController.remove(req.user, req.params.username, options)
  .then((usernames) => {
    // Return 200: OK and the deleted username
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(usernames[0]));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /users/whoami
 *
 * @description Returns the public information of the currently logged in user.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with user's public data
 */
function whoami(req, res) {
  // Sanity check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // Returns 200: OK and the users public data
  res.header('Content-Type', 'application/json');
  return res.status(200).send(formatJSON(req.user.getPublicData()));
}

/**
 * PATCH /api/users/:username/password
 *
 * @description Updates a users password.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with updated user public data.
 */
function patchPassword(req, res) {
  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // Ensure old password was provided
  if (!req.body.oldPassword) {
    const error = new M.CustomError('Old password not in request body.', 400, 'warn');
    return res.status(error.status).send(error);
  }

  // Ensure new password was provided
  if (!req.body.password) {
    const error = new M.CustomError('New password not in request body.', 400, 'warn');
    return res.status(error.status).send(error);
  }

  // Ensure confirmed password was provided
  if (!req.body.confirmPassword) {
    const error = new M.CustomError('Confirmed password not in request body.', 400, 'warn');
    return res.status(error.status).send(error);
  }

  // Ensure user is not trying to change another user's password
  if (req.user.username !== req.params.username) {
    const error = new M.CustomError('Cannot change another user\'s password.', 403, 'warn');
    return res.status(error.status).send(error);
  }

  // Update the password
  UserController.updatePassword(req.user, req.body.oldPassword,
    req.body.password, req.body.confirmPassword)
  .then((updatedUser) => {
    // Returns 200: OK and the updated user's public data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(updatedUser.getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/* -----------------------( Elements API Endpoints )------------------------- */
/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Gets all elements or get specified elements.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with elements
 */
function getElements(req, res) {
  // Define options and ids
  // Note: Undefined if not set
  let elemIDs;
  let options;

  // Define valid option and its parsed type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    subtree: 'boolean',
    ids: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Default branch to master
  const branchid = 'master';

  // Find elements
  // NOTE: find() sanitizes input params
  ElementController.find(req.user, req.params.orgid, req.params.projectid,
    branchid, elemIDs, options)
  .then((elements) => {
    // Return only public element data
    const elementsPublicData = elements.map(e => e.getPublicData());

    // Verify elements public data array is not empty
    if (elementsPublicData.length === 0) {
      const error = new M.CustomError('No elements found.', 404, 'warn');
      return res.status(error.status).send(error);
    }

    // Return a 200: OK and public element data
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(elementsPublicData));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Creates specified elements.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with created elements
 */
function postElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Default branch to master
  const branchid = 'master';

  // Create the specified elements
  // NOTE: create() sanitizes input params
  ElementController.create(req.user, req.params.orgid, req.params.projectid,
    branchid, req.body, options)
  .then((elements) => {
    // Return 200: OK and the new elements
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(elements.map(e => e.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Updates specified elements.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with updated elements
 */
function patchElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Default branch to master
  const branchid = 'master';

  // Update the specified elements
  // NOTE: update() sanitizes input params
  ElementController.update(req.user, req.params.orgid, req.params.projectid,
    branchid, req.body, options)
  .then((elements) => {
    // Return 200: OK and the updated elements
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(elements.map(e => e.getPublicData())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements
 *
 * @description Deletes multiple elements.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 * @return {Object} Response object with element ids.
 */
function deleteElements(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // Default branch to master
  const branchid = 'master';

  // Attempt to parse query options
  try {
    // Extract options from request query
    options = utils.parseOptions(req.query, validOptions);
  }
  catch (error) {
    // Error occurred with options, report it
    return res.status(error.status).send(error);
  }

  // Remove the specified elements
  // NOTE: remove() sanitizes input params
  ElementController.remove(req.user, req.params.orgid, req.params.projectid,
    branchid, req.body, options)
  .then((elements) => {
    // Return 200: OK and the deleted element ids
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(elements.map(e => utils.parseID(e).pop())));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * GET /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Gets an element.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with element
 */
function getElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option type
  const validOptions = {
    populate: 'array',
    archived: 'boolean',
    subtree: 'boolean'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Default branch to master
  const branchid = 'master';

  // Find the element
  // NOTE: find() sanitizes input params
  ElementController.find(req.user, req.params.orgid, req.params.projectid,
    branchid, req.params.elementid, options)
  .then((elements) => {
    // If no element found, return 404 error
    if (elements.length === 0) {
      const error = new M.CustomError(
        `Element [${req.params.elementid}] not found.`, 404, 'warn'
      );
      return res.status(error.status).send(error);
    }

    // If subtree option was provided, return array of elements
    if (options.subtree) {
      // Return a 200: OK and the elements
      res.header('Content-Type', 'application/json');
      return res.status(200).send(formatJSON(elements.map(e => e.getPublicData())));
    }

    // Return a 200: OK and the element
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(elements[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * POST /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Creates an element.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with created element
 */
function postElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.elementid)) {
    const error = new M.CustomError(
      'Element ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set the element ID in the body equal req.params.elementid
  req.body.id = req.params.elementid;

  // Default branch to master
  const branchid = 'master';

  // Create element with provided parameters
  // NOTE: create() sanitizes input params
  ElementController.create(req.user, req.params.orgid, req.params.projectid,
    branchid, req.body, options)
  .then((element) => {
    // Return 200: OK and created element
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(element[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * PATCH /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Updates the specified element.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with updated element
 */
function patchElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option type
  const validOptions = {
    populate: 'array'
  };

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
  }

  // If an ID was provided in the body, ensure it matches the ID in params
  if (req.body.hasOwnProperty('id') && (req.body.id !== req.params.elementid)) {
    const error = new M.CustomError(
      'Element ID in the body does not match ID in the params.', 400, 'warn'
    );
    return res.status(error.status).send(error);
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

  // Set the element ID in the body equal req.params.elementid
  req.body.id = req.params.elementid;

  // Default branch to master
  const branchid = 'master';

  // Updates the specified element
  // NOTE: update() sanitizes input params
  ElementController.update(req.user, req.params.orgid, req.params.projectid,
    branchid, req.body, options)
  .then((element) => {
    // Return 200: OK and the updated element
    res.header('Content-Type', 'application/json');
    return res.status(200).send(formatJSON(element[0].getPublicData()));
  })
  // If an error was thrown, return it and its status
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * DELETE /api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid
 *
 * @description Deletes an element.
 * NOTE: This function is system-admin ONLY.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response object with deleted element id.
 */
function deleteElement(req, res) {
  // Define options
  // Note: Undefined if not set
  let options;

  // Define valid option and its parsed type
  const validOptions = {};

  // Sanity Check: there should always be a user in the request
  if (!req.user) {
    const error = new M.CustomError('Request Failed.', 500, 'critical');
    return res.status(error.status).send(error);
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

  // Default branch to master
  const branchid = 'master';

  // Remove the specified element
  // NOTE: remove() sanitizes input params
  ElementController.remove(req.user, req.params.orgid, req.params.projectid,
    branchid, [req.params.elementid], options)
  .then((element) => {
    res.header('Content-Type', 'application/json');
    // Return 200: OK and deleted element
    return res.status(200).send(formatJSON(utils.parseID(element[0]).pop()));
  })
  .catch((error) => res.status(error.status || 500).send(error));
}

/**
 * ALL /api/*
 *
 * @description Returns an error message if a user tries to access an invalid
 * api route.
 *
 * @param {Object} req - Request express object
 * @param {Object} res - Response express object
 *
 * @return {Object} Response error message
 */
function invalidRoute(req, res) {
  return res.status(404).send('Invalid Route or Method.');
}
