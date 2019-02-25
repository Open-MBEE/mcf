/**
 * Classification: UNCLASSIFIED
 *
 * @module test.test-utils.js
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Helper function for MBEE test.
 * - Used to create users, organizations, projects, elements in the database.
 * - Assumes database connection already established
 *
 * This function takes the complexity out of MBEE tests,
 * making MBEE tests easier to read and run.
 *
 */
// Node modules
const path = require('path');
const chai = require('chai');
const fs = require('fs');

// MBEE modules
const Element = M.require('models.element');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const User = M.require('models.user');
const utils = M.require('lib.utils');
const testData = require(path.join(M.root, 'test', 'test_data.json'));
delete require.cache[require.resolve(path.join(M.root, 'test', 'test_data.json'))];
/**
 * @description Helper function to create test non-admin user in
 * MBEE tests.
 */
module.exports.createNonAdminUser = function() {
  return new Promise((resolve, reject) => {
    // Define new user
    let newUser = null;

    // Check any admin exist
    User.findOne({ _id: testData.users[1].username })
    .then((foundUser) => {
      // Check user found
      if (foundUser !== null) {
        // User found, return it
        return resolve(foundUser);
      }

      // Create user
      const user = new User({
        _id: testData.users[1].username,
        password: testData.users[1].password,
        fname: testData.users[1].fname,
        lname: testData.users[1].lname,
        admin: false
      });

      // Save user object to the database
      return user.save();
    })
    .then((user) => {
      // Set new user
      newUser = user;

      // Find the default organization
      return Organization.find({ _id: M.config.server.defaultOrganizationId });
    })
    .then((orgs) => {
      // Add user to default org read/write permissions
      orgs[0].permissions[newUser._id] = ['read', 'write'];

      orgs[0].markModified('permissions');

      // Save the updated org
      return orgs[0].save();
    })
    .then(() => resolve(newUser))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to create test admin user in
 * MBEE tests.
 */
module.exports.createTestAdmin = function() {
  return new Promise((resolve, reject) => {
    // Define new user
    let newAdminUser = null;

    // Check any admin exist
    User.findOne({ _id: testData.adminUser.username })
    .then((foundUser) => {
      // Check user found
      if (foundUser !== null) {
        // User found, return it
        return resolve(foundUser);
      }

      // Create user
      const user = new User({
        _id: testData.adminUser.username,
        password: testData.adminUser.password,
        provider: 'local',
        admin: true
      });

      // Save user object to the database
      return user.save();
    })
    .then((user) => {
      // Set new admin user
      newAdminUser = user;

      // Find the default organization
      return Organization.find({ _id: M.config.server.defaultOrganizationId });
    })
    .then((orgs) => {
      // Add user to default org read/write permissions
      orgs[0].permissions[newAdminUser._id] = ['read', 'write'];

      orgs[0].markModified('permissions');

      // Save the updated org
      return orgs[0].save();
    })
    .then(() => resolve(newAdminUser))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to delete test user in
 * MBEE tests.
 */
module.exports.removeNonAdminUser = function() {
  return new Promise((resolve, reject) => {
    // Define user id
    let userToDelete = null;

    // Find admin user
    User.findOne({ _id: testData.users[1].username })
    .then((foundUser) => {
      // Save user and remove user
      userToDelete = foundUser;
      return foundUser.remove();
    })
    .then(() => Organization.find({ _id: M.config.server.defaultOrganizationId }))
    .then((orgs) => {
      // Remove user from permissions list in each project
      delete orgs[0].permissions[userToDelete._id];
      orgs[0].markModified('permissions');
      return orgs[0].save();
    })
    .then(() => resolve(userToDelete.username))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to delete test admin user in
 * MBEE tests.
 */
module.exports.removeTestAdmin = function() {
  return new Promise((resolve, reject) => {
    // Define user id
    let userToDelete = null;

    // Find admin user
    User.findOne({ _id: testData.adminUser.username })
    .then((foundUser) => {
      // Save user and remove user
      userToDelete = foundUser;
      return foundUser.remove();
    })
    .then(() => Organization.find({ _id: M.config.server.defaultOrganizationId }))
    .then((orgs) => {
      // Remove user from permissions list in each project
      delete orgs[0].permissions[userToDelete._id];
      orgs[0].markModified('permissions');
      return orgs[0].save();
    })
    .then(() => resolve(userToDelete.username))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to create organization in
 * MBEE tests.
 */
module.exports.createTestOrg = function(adminUser) {
  return new Promise((resolve, reject) => {
    // Create the new organization
    const newOrg = new Organization({
      _id: testData.orgs[0].id,
      name: testData.orgs[0].name,
      custom: null
    });
    newOrg.permissions[adminUser._id] = ['read', 'write', 'admin'];

    newOrg.save()
    .then((_newOrg) => resolve(_newOrg))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to remove organization in
 * MBEE tests.
 */
module.exports.removeTestOrg = function() {
  return new Promise((resolve, reject) => {
    // Create query for deleting items in the orgs
    const ownedQuery = { _id: { $regex: `^${testData.orgs[0].id}:` } };

    // Delete elements
    Element.deleteMany(ownedQuery)
    // Delete any projects in the org
    .then(() => Project.deleteMany({ org: testData.orgs[0].id }))
    // Delete the orgs
    .then(() => Organization.deleteMany({ _id: testData.orgs[0].id }))
    .then((org) => resolve(org))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to create project in MBEE tests
 */
module.exports.createTestProject = function(adminUser, orgID) {
  return new Promise((resolve, reject) => {
    let createdProject = {};
    // Create the new project
    const newProject = new Project({
      _id: utils.createID(orgID, testData.projects[0].id),
      org: orgID,
      name: testData.projects[0].name,
      custom: null
    });
    newProject.permissions[adminUser._id] = ['read', 'write', 'admin'];

    newProject.save()
    .then((_newProj) => {
      createdProject = _newProj;

      const newElement = new Element({
        _id: utils.createID(orgID, testData.projects[0].id, 'model'),
        project: _newProj._id,
        name: 'Model'
      });

      return newElement.save();
    })
    .then(() => resolve(createdProject))
    .catch((error) => reject(error));
  });
};

/**
 * @description Helper function to import a copy of test data
 */
module.exports.importTestData = function(filename) {
  // Clear require cache so a new copy is imported
  delete require.cache[require.resolve(path.join(M.root, 'test', filename))];
  // Import a copy of the data.json
  // eslint-disable-next-line global-require
  const testDataFresh = require(path.join(M.root, 'test', filename));
  // Return a newly assigned copy of the fresh data
  if (Array.isArray(testDataFresh)) {
    return Object.assign([], testDataFresh);
  }
  return Object.assign({}, testDataFresh);
};

/**
 * @description Helper function for setting mock request parameters.
 *
 * @param {Object} user - The user making the request
 * @param {Object} params - Parameters for API req
 * @param {Object} body - Body for API req
 * @param {string} method - API method of req
 * @param {Object} [query] - query options for API req
 *
 * @returns {Object} req - Request Object
 */
module.exports.createRequest = function(user, params, body, method, query = {}) {
  // Error-Check
  if (typeof params !== 'object') {
    throw M.CustomError('params is not of type object.');
  }
  if (typeof params !== 'object') {
    throw M.CustomError('body is not of type object.');
  }

  return {
    headers: this.getHeaders(),
    method: method,
    params: params,
    body: body,
    query: query,
    user: user,
    session: {}
  };
};

/**
 * @description Helper function for setting mock response status and header.
 *
 * @param {Object} res - Response Object
 */
module.exports.createResponse = function(res) {
  // Verifies the response code: 200 OK
  res.status = function status(code) {
    chai.expect(code).to.equal(200);
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
 */
module.exports.getHeaders = function(contentType = 'application/json', user = testData.adminUser) {
  const formattedCreds = `${user.username}:${user.password}`;
  const basicAuthHeader = `Basic ${Buffer.from(`${formattedCreds}`).toString('base64')}`;
  return {
    'Content-Type': contentType,
    authorization: basicAuthHeader
  };
};

/**
 * @description Helper function for setting the certificate authorities for each request.
 */
module.exports.readCaFile = function() {
  if (M.config.test.hasOwnProperty('ca')) {
    return fs.readFileSync(`${M.root}/${M.config.test.ca}`);
  }
};
