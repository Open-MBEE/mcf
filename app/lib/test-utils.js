/**
 * @classification UNCLASSIFIED
 *
 * @module lib.test-utils.js
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Phillip Lee
 * @author Leah De Laurell
 * @author Connor Doyle
 * @author Jake Ursetta
 * @author Austin Bieber
 *
 * @description Helper function for MBEE test.
 * Used to create users, organizations, projects, elements in the database.
 * Assumes database connection already established.
 *
 * This function takes the complexity out of MBEE tests,
 * making MBEE tests easier to read and run.
 *
 */
// Node modules
const path = require('path');
const fs = require('fs');

// NPM modules
const chai = require('chai');
const Randexp = require('randexp');

// MBEE modules
const Artifact = M.require('models.artifact');
const Element = M.require('models.element');
const Branch = M.require('models.branch');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const errors = M.require('lib.errors');
const utils = M.require('lib.utils');
const ArtifactStrategy = M.require(`artifact.${M.config.artifact.strategy}`);
const validators = M.require('lib.validators');
let testData = JSON.parse(fs.readFileSync(path.join(M.root, 'test', 'test_data.json')).toString());

/**
 * @description Helper function to create test non-admin user in MBEE tests.
 *
 * @returns {Promise<User>} Returns the newly created user upon completion.
 */
module.exports.createNonAdminUser = async function() {
  try {
    // Attempt to find the non-admin user
    const foundUser = await User.findOne({ _id: testData.users[1].username });

    // If the user was found, return them
    if (foundUser !== null) {
      return foundUser;
    }
    // User not found, create them
    else {
      // Create user
      const user = {
        _id: testData.users[1].username,
        password: testData.users[1].password,
        fname: testData.users[1].fname,
        lname: testData.users[1].lname,
        admin: false
      };

      // Hash the user password
      User.hashPassword(user);

      // Save user object to the database
      const newUser = (await User.insertMany(user))[0];

      // Find the default organization
      const defaultOrg = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });

      // If the default org is not found, throw an error... this is a big problem if this occurs
      if (defaultOrg === null) {
        throw new M.ServerError('Default org not found during unit tests.', 'error');
      }

      // Add user to default org read/write permissions
      defaultOrg.permissions[newUser._id] = ['read', 'write'];

      // Save the updated org
      await Organization.updateOne({ _id: defaultOrg._id },
        { permissions: defaultOrg.permissions });

      // Return the newly created user
      return newUser;
    }
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to create test admin user in MBEE tests.
 *
 * @returns {Promise<User>} Returns the newly created admin user upon completion.
 */
module.exports.createTestAdmin = async function() {
  try {
    // Attempt to find the admin user
    const foundUser = await User.findOne({ _id: testData.adminUser.username });

    // If the admin user is found, return them
    if (foundUser !== null) {
      return foundUser;
    }
    // Admin user not found, create them
    else {
      // Create user
      const user = {
        _id: testData.adminUser.username,
        password: testData.adminUser.password,
        provider: 'local',
        admin: true
      };

      User.hashPassword(user);

      // Save user object to the database
      const newAdminUser = (await User.insertMany(user))[0];

      // Find the default organization
      const defaultOrg = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });

      // Add user to default org read/write permissions
      defaultOrg.permissions[newAdminUser._id] = ['read', 'write'];

      // Save the updated default org
      await Organization.updateOne({ _id: defaultOrg._id },
        { permissions: defaultOrg.permissions });

      // Return the newly created user
      return newAdminUser;
    }
  }
  catch (error) {
    return errors.captureError(error);
  }
};

/**
 * @description Helper function to delete test user in MBEE tests.
 *
 * @returns {Promise<string>} Returns the id of the deleted user.
 */
module.exports.removeNonAdminUser = async function() {
  try {
    // Find non-admin user
    const foundUser = await User.findOne({ _id: testData.users[1].username });
    // Delete the non-admin user
    await User.deleteMany({ _id: testData.users[1].username });

    // Fine the default org
    const defaultOrg = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    // Remove the non-admin user from the default org
    delete defaultOrg.permissions[foundUser._id];
    // Save the updated default org
    await Organization.updateOne({ _id: defaultOrg._id }, { permissions: defaultOrg.permissions });

    // Return the _id of the deleted non-admin user
    return foundUser._id;
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to delete test admin user in MBEE tests.
 *
 * @returns {Promise<string>} Returns the id of the deleted admin user.
 */
module.exports.removeTestAdmin = async function() {
  try {
    // Find the admin user
    const foundUser = await User.findOne({ _id: testData.adminUser.username });
    // Delete the admin user
    await User.deleteMany({ _id: testData.adminUser.username });

    // Find the default org
    const defaultOrg = await Organization.findOne({ _id: M.config.server.defaultOrganizationId });
    // Remove the admin user from the default org
    delete defaultOrg.permissions[foundUser._id];
    // Save the updated default org
    await Organization.updateOne({ _id: defaultOrg._id }, { permissions: defaultOrg.permissions });

    // Return the _id of the deleted admin user
    return foundUser._id;
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to create a test organization in MBEE tests.
 *
 * @param {object} adminUser - The admin user to create the org with.
 *
 * @returns {Promise<Organization>} Returns the newly created org upon
 * completion.
 */
module.exports.createTestOrg = async function(adminUser) {
  try {
    // Create the new organization
    const newOrg = {
      _id: testData.orgs[0].id,
      name: testData.orgs[0].name,
      custom: null,
      permissions: {}
    };
    newOrg.permissions[adminUser._id] = ['read', 'write', 'admin'];

    return (await Organization.insertMany(newOrg))[0];
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to create a test artifact in MBEE tests.
 *
 * @param {object} adminUser - The admin user to create the artifact with.
 * @param {string} orgID - The org to create the artifact on.
 * @param {string} projID - The project to create the artifact on.
 * @param {string} branchID - The branch to create the artifact on.
 *
 * @returns {Promise<Artifact>} Returns the newly created artifact upon
 * completion.
 */
module.exports.createTestArt = async function(adminUser, orgID, projID, branchID) {
  try {
    // Create the new artifact
    const newArt = {
      _id: utils.createID(orgID, projID, branchID, testData.artifacts[0].id),
      org: orgID,
      project: utils.createID(orgID, projID),
      description: testData.artifacts[0].description,
      filename: testData.artifacts[0].filename,
      location: testData.artifacts[0].location,
      strategy: M.config.artifact.strategy,
      branch: utils.createID(orgID, projID, branchID),
      custom: {},
      createdBy: adminUser._id,
      createdOn: Date.now(),
      lasModifiedBy: adminUser._id,
      updatedOn: Date.now()
    };

    return (await Artifact.insertMany(newArt))[0];
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to remove organization in MBEE tests.
 *
 * @returns {Promise<string>} Returns the id of the deleted org.
 */
module.exports.removeTestOrg = async function() {
  // Find all projects to delete
  const projectsToDelete = await Project.find({ org: testData.orgs[0].id }, null);
  const projectIDs = projectsToDelete.map(p => p._id);

  // Delete any artifacts in the org
  await Artifact.deleteMany({ project: { $in: projectIDs } });

  ArtifactStrategy.clear({
    orgID: testData.orgs[0].id
  });

  // Delete any elements in the found projects
  await Element.deleteMany({ project: { $in: projectIDs } });
  // Delete any branches in the found projects
  await Branch.deleteMany({ project: { $in: projectIDs } });
  // Delete any projects in the org
  await Project.deleteMany({ org: testData.orgs[0].id });
  // Delete the orgs
  await Organization.deleteMany({ _id: testData.orgs[0].id });
};

/**
 * @description Helper function to create a test project in MBEE tests.
 *
 * @param {object} adminUser - The admin user to create the project with.
 * @param {string} orgID - The id of the org to create the project on.
 *
 * @returns {Promise<Project>} Returns the newly created project upon
 * completion.
 */
module.exports.createTestProject = async function(adminUser, orgID) {
  try {
    // Create the new project object
    const newProject = {
      _id: utils.createID(orgID, testData.projects[0].id),
      org: orgID,
      name: testData.projects[0].name,
      createdBy: adminUser._id,
      custom: null,
      permissions: {}
    };
    newProject.permissions[adminUser._id] = ['read', 'write', 'admin'];
    // Save the project
    const createdProject = (await Project.insertMany(newProject))[0];

    // Create the master branch for the project
    const newBranch = {
      _id: utils.createID(orgID, testData.projects[0].id, testData.branches[0].id),
      project: createdProject._id,
      createdBy: adminUser._id,
      createdOn: Date.now(),
      lasModifiedBy: adminUser._id,
      updatedOn: Date.now(),
      name: testData.branches[0].name,
      source: null
    };
    // Save the branch
    const createdBranch = (await Branch.insertMany(newBranch))[0];

    // Create root elements
    const elementsToCreate = [];
    const baseElement = {
      project: createdProject._id,
      branch: createdBranch._id,
      createdBy: adminUser._id,
      createdOn: Date.now(),
      lasModifiedBy: adminUser._id,
      updatedOn: Date.now()
    };

    // For each of the valid root elements
    Element.getValidRootElements().forEach((e) => {
      // Clone the base object to avoid modifying if
      const obj = JSON.parse(JSON.stringify(baseElement));
      obj._id = utils.createID(createdBranch._id, e);

      // Handle setting each different name/parent
      if (e === 'model') {
        // Root model element, no parent
        obj.parent = null;
        obj.name = 'Model';
      }
      else if (e === '__mbee__') {
        obj.parent = utils.createID(createdBranch._id, 'model');
        obj.name = '__mbee__';
      }
      else {
        obj.parent = utils.createID(createdBranch._id, '__mbee__');
        obj.name = (e === 'undefined') ? 'undefined element' : 'holding bin';
      }
      // Append element object onto array of elements to create
      elementsToCreate.push(obj);
    });

    // Create the root model elements
    await Element.insertMany(elementsToCreate);

    // Return the created project
    return createdProject;
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to create a tag in MBEE tests.
 * @async
 *
 * @param {object} adminUser - The admin user to create the branch with.
 * @param {string} orgID - The org to create the branch on.
 * @param {string} projID - The project to create the branch on.
 *
 * @returns {Promise<Branch>} Returns a tagged branch.
 */
module.exports.createTag = async function(adminUser, orgID, projID) {
  try {
    // Create a new branch object, with tag: true
    const newTag = {
      _id: utils.createID(orgID, projID, 'tag'),
      project: utils.createID(orgID, projID),
      createdBy: adminUser._id,
      name: 'Tagged Branch',
      tag: true,
      source: utils.createID(orgID, projID, 'master')
    };

    // Save the tag
    const createdTag = (await Branch.insertMany(newTag))[0];

    // Create root elements
    const elementsToCreate = [];
    const baseElement = {
      project: utils.createID(orgID, projID),
      branch: createdTag._id,
      createdBy: adminUser._id,
      createdOn: Date.now(),
      lasModifiedBy: adminUser._id,
      updatedOn: Date.now()
    };

    // For each of the valid root elements
    Element.getValidRootElements().forEach((e) => {
      // Clone the base object to avoid modifying if
      const obj = JSON.parse(JSON.stringify(baseElement));
      obj._id = utils.createID(createdTag._id, e);

      // Handle setting each different name/parent
      if (e === 'model') {
        // Root model element, no parent
        obj.parent = null;
        obj.name = 'Model';
      }
      else if (e === '__mbee__') {
        obj.parent = utils.createID(createdTag._id, 'model');
        obj.name = '__mbee__';
      }
      else {
        obj.parent = utils.createID(createdTag._id, '__mbee__');
        obj.name = (e === 'undefined') ? 'undefined element' : 'holding bin';
      }
      // Append element object onto array of elements to create
      elementsToCreate.push(obj);
    });

    // Create a non root element in the tag
    elementsToCreate.push({
      _id: utils.createID(createdTag._id, testData.elements[1].id),
      project: utils.createID(orgID, projID),
      branch: createdTag._id,
      createdBy: adminUser._id,
      name: testData.elements[1].name
    });

    // Create the root model elements and single extra element
    await Element.insertMany(elementsToCreate);

    return createdTag;
  }
  catch (error) {
    throw errors.captureError(error);
  }
};

/**
 * @description Helper function to import a copy of test data.
 *
 * @param {string} filename - The file to read.
 *
 * @returns {object} Returns the imported test data.
 */
module.exports.importTestData = function(filename) {
  let testDataFresh;
  if (M.config.validators) {
    testDataFresh = generateCustomTestData();
  }
  else {
    // Import a copy of the data.json
    testDataFresh = JSON.parse(fs.readFileSync(path.join(M.root, 'test', filename)).toString());
  }
  // Return a newly assigned copy of the fresh data
  if (Array.isArray(testDataFresh)) {
    return Object.assign([], testDataFresh);
  }
  return Object.assign({}, testDataFresh);
};

/**
 * @description Helper function for setting mock request parameters.
 *
 * @param {object} user - The user making the request.
 * @param {object} params - Parameters for API req.
 * @param {object} body - Body for API req.
 * @param {string} method - API method of req.
 * @param {object} [query] - Query options for API req.
 *
 * @returns {object} Request object.
 */
module.exports.createRequest = function(user, params, body, method, query = {}) {
  // Error-Check
  if (typeof params !== 'object') {
    throw M.DataFormatError('params is not of type object.', 'warn');
  }
  if (typeof params !== 'object') {
    throw M.DataFormatError('body is not of type object.', 'warn');
  }

  return {
    headers: this.getHeaders(),
    method: method,
    originalUrl: 'ThisIsATest',
    params: params,
    body: body,
    ip: '::1',
    query: query,
    user: user,
    session: {}
  };
};

/**
 * @description Helper function for setting mock request parameters.  Creates a read
 * stream of a file and gives the stream request-like properties.
 *
 * @param {object} user - The user making the request.
 * @param {object} params - Parameters for API req.
 * @param {object} body - Body for API req.
 * @param {string} method - API method of req.
 * @param {object} [query] - Query options for API req.
 * @param {string} filepath - The path to the file to create the read stream of.
 * @param {object} headers - Headers for the API req.
 *
 * @returns {object} Request object.
 */
module.exports.createReadStreamRequest = function(user, params, body, method, query = {},
  filepath, headers) {
  // Error-Check
  if (typeof params !== 'object') {
    throw M.DataFormatError('params is not of type object.', 'warn');
  }
  if (typeof body !== 'object') {
    throw M.DataFormatError('body is not of type object.', 'warn');
  }

  const req = fs.createReadStream(filepath);
  req.user = user;
  req.params = params;
  req.body = body;
  req.method = method;
  req.query = query;
  req.headers = this.getHeaders(headers);
  req.session = {};
  req.originalUrl = 'ThisIsATest';
  req.ip = '::1';

  return req;
};

/**
 * @description Helper function for setting mock response status and header.
 *
 * @param {object} res - Response Object.
 */
module.exports.createResponse = function(res) {
  // Verifies the response code: 200 OK
  res.status = function status(code) {
    res.statusCode = code;
    return this;
  };
  // Provides headers to response object
  res.header = function header(a, b) {
    return this;
  };
};

/**
 * @description Helper function for setting the request headers.
 *
 * @param {string} contentType - The content type. Defaults to application/json.
 * @param {object} user - The requesting user. Must contains a username and password.
 *
 * @returns {object} Returns an object containing header key-value pairs.
 */
module.exports.getHeaders = function(contentType = 'application/json', user = testData.adminUser) {
  const formattedCreds = `${user.username || user._id}:${user.password}`;
  const basicAuthHeader = `Basic ${Buffer.from(`${formattedCreds}`).toString('base64')}`;
  return {
    'content-type': contentType,
    authorization: basicAuthHeader
  };
};

/**
 * @description Helper function for setting the certificate authorities for each request.
 *
 * @returns {object} Returns the result of reading the certificate authority file.
 */
module.exports.readCaFile = function() {
  if (M.config.test.hasOwnProperty('ca')) {
    return fs.readFileSync(`${M.root}/${M.config.test.ca}`);
  }
};

/**
 * @description Tests response logging. This is designed for the 500 tests and
 * expects the res and req objects to be the mock objects created in those tests.
 *
 * @param {number} responseLength - The length of the response in bytes.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {Function} done - The callback function to mark the end of the test.
 */
module.exports.testResponseLogging = async function(responseLength, req, res, done) {
  // Get the log file path
  const filePath = path.join(M.root, 'logs', M.config.log.file);

  // Read the file
  const fileContents = fs.readFileSync(filePath).toString();
  // Split the file, and remove an non-response entries, and get the final response
  const response = fileContents.split('\n').filter(e => e.includes('RESPONSE: ')).pop();
  // split on spaces
  const content = response.split('RESPONSE: ')[1].split(' ');

  // Ensure parts of response log are correct
  chai.expect(content[0]).to.equal((req.ip === '::1') ? '127.0.0.1' : req.ip);
  chai.expect(content[1]).to.equal((req.user) ? req.user._id : 'anonymous');
  chai.expect(content[3]).to.equal(`"${req.method}`);
  chai.expect(content[4]).to.equal(`${req.originalUrl}"`);
  chai.expect(content[5]).to.equal(res.statusCode.toString());
  chai.expect(content[6]).to.equal(responseLength.toString());

  done();
};

/**
 * @description A helper function to parse the api endpoint string into a http method.
 *
 * @param {string} endpoint - The api endpoint string.
 * @returns {string} Returns a REST method string such as GET or POST.
 */
module.exports.parseMethod = function(endpoint) {
  const regex = /[A-Z]/g;
  // Find the uppercase letter
  const uppercase = endpoint.match(regex);
  if (uppercase || endpoint.includes('search')) {
    // Split the input based on where the uppercase letter is found
    const segments = endpoint.split(uppercase);
    // Return the first word of the input in all caps
    return segments[0].toUpperCase();
  }
  else {
    // The endpoint is for whoami or searchUsers; they use GET requests
    return 'GET';
  }
};

/**
 * @description A function that generates a new custom_test_data.json file based on custom
 * id validators if they exist in the config.
 *
 * @returns {object} A new set of data customized towards the custom validators.
 */
function generateCustomTestData() {
  const testDataRaw = fs.readFileSync(path.join(M.root, 'test', 'test_data.json'));
  const customTestData = JSON.parse(testDataRaw.toString());
  const v = M.config.validators;

  if (v.hasOwnProperty('element_id') || v.hasOwnProperty('element_id_length')
    || v.hasOwnProperty('id') || v.hasOwnProperty('id_length')) {
    // Set new custom element ids
    customTestData.elements.forEach((elem) => {
      // Generate new custom id
      const customID = generateID(v.element_id || validators.id,
        v.element_id_length || validators.idLength);
      // Get all the elements that reference it
      customTestData.elements.forEach((e) => {
        if (e.parent && e.parent === elem.id) e.parent = customID;
        if (e.source && e.source === elem.id) e.source = customID;
        if (e.target && e.target === elem.id) e.target = customID;
      });
      elem.id = customID;
    });
  }
  if (v.hasOwnProperty('branch_id') || v.hasOwnProperty('branch_id_length')
    || v.hasOwnProperty('id') || v.hasOwnProperty('id_length')) {
    // Set new custom branch ids
    customTestData.branches.forEach((branch) => {
      // Don't modify the master id
      if (branch.id === 'master') return;
      // Generate new custom id
      const customID = generateID(v.branch_id || validators.id,
        v.branch_id_length || validators.idLength);
      // Get all the branches that reference it
      customTestData.branches.forEach((b) => {
        if (b.source === branch.id) b.source = customID;
      });
      branch.id = customID;
    });
    customTestData.invalidBranchID = generateID(`${v.branch_id}`, v.branch_id_length || validators.idLength, 2);
  }
  if (v.hasOwnProperty('project_id') || v.hasOwnProperty('project_id_length')
    || v.hasOwnProperty('id') || v.hasOwnProperty('id_length')) {
    // Set new custom project ids
    customTestData.projects.forEach((project) => {
      // Generate new custom id
      project.id = generateID(v.project_id || validators.id,
        v.project_id_length || validators.idLength);
    });
  }
  if (v.hasOwnProperty('org_id') || v.hasOwnProperty('org_id_length')
    || v.hasOwnProperty('id') || v.hasOwnProperty('id_length')) {
    // Set new custom org ids
    customTestData.orgs.forEach((org) => {
      // Generate new custom id
      org.id = generateID(v.org_id || validators.id,
        v.org_id_length || validators.org.idLength);
    });
  }
  if (v.hasOwnProperty('user_username') || v.hasOwnProperty('user_username_length')
    || v.hasOwnProperty('id') || v.hasOwnProperty('id_length')) {
    // Set new custom usernames
    customTestData.users.forEach((user) => {
      // Generate new custom id
      // Only validators is necessary here since usernames are not concatenated ids
      user.username = generateID(validators.user.username, validators.user.usernameLength, 3);
    });
  }

  /**
   * @description A helper function for generating a custom id that accounts for minimum id length
   * and custom id length validators.
   *
   * @param {string} pattern - The regex patter to match for the custom id.
   * @param {number} length - The custom validator for specific id length.
   * @param {number} min - The minimum length for an id. The default is 2, but usernames must be
   * at least 3 characters long.
   *
   * @returns {string} A custom id.
   */
  function generateID(pattern, length, min = 2) {
    // Initialize the generator with the regex pattern
    const generator = new Randexp(pattern);
    generator.max = length - 1; // The generator can create strings of length max + 1

    // Generate a new random id
    let id = generator.gen();

    // Ensure that the id is always at least the minimum length
    while (id.length < min) {
      id = generator.gen();
    }

    return id;
  }

  // Reset the global testData variable
  testData = customTestData;

  return customTestData;
}
