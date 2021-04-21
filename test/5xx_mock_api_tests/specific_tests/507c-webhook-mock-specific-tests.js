/**
 * @classification UNCLASSIFIED
 *
 * @module test.507c-webhook-mock-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests mock requests of the API controller functionality:
 * GET, POST, PATCH, and DELETE webhooks.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const APIController = M.require('controllers.api-controller');
const Webhook = M.require('models.webhook');
const jmi = M.require('lib.jmi-conversions');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const next = testUtils.next;
let adminUser;
let org;
let project;
let projID;
const branchID = 'master';
const webhookIDs = [];
const orgWebhooks = [];
const projWebhooks = [];
const branchWebhooks = [];

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates an admin user, an org, and a project.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      org = await testUtils.createTestOrg(adminUser);
      project = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(project._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes any remaining webhooks and removes the test org and
   * admin user.
   */
  after(async () => {
    try {
      await Webhook.deleteMany({ _id: { $in: webhookIDs } });
      await testUtils.removeTestOrg();
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute tests */
  // ------------- POST -------------
  it('should POST a webhook to an org', post('org'));
  it('should POST a webhook to a project', post('project'));
  it('should POST a webhook to a branch', post('branch'));
  it('should POST multiple webhooks to an org', postMany('org'));
  it('should POST multiple webhooks to a project', postMany('project'));
  it('should POST multiple webhooks to a branch', postMany('branch'));
  // ------------- GET -------------
  it('should GET all webhooks on an org', getAll('org'));
  it('should GET all webhooks on a project', getAll('project'));
  it('should GET all webhooks on a branch', getAll('branch'));
  it('should GET all webhooks', getAll('all'));
  // ------------ PATCH ------------
  it('should PATCH a webhook on an org', patch('org'));
  it('should PATCH a webhook on a project', patch('project'));
  it('should PATCH a webhook on a branch', patch('branch'));
  it('should PATCH multiple webhooks on an org', patchMany('org'));
  it('should PATCH multiple webhooks on a project', patchMany('project'));
  it('should PATCH multiple webhooks on a branch', patchMany('branch'));
  // ------------ DELETE ------------
  it('should DELETE a webhook on an org', remove('org'));
  it('should DELETE a webhook on a project', remove('project'));
  it('should DELETE a webhook on a branch', remove('branch'));
  it('should DELETE multiple webhooks on an org', removeMany('org'));
  it('should DELETE multiple webhooks on a project', removeMany('project'));
  it('should DELETE multiple webhooks on a branch', removeMany('branch'));
});

/* --------------------( Tests )-------------------- */
/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock POST requests to create a webhook on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function post(reference) {
  return function(done) {
    const webhookData = testData.webhooks[0];

    let levelData;
    let ref;
    switch (reference) {
      case 'org':
        levelData = orgWebhooks;
        ref = {
          org: org._id
        };
        webhookData.reference = ref;
        break;
      case 'project':
        levelData = projWebhooks;
        ref = {
          org: org._id,
          project: projID
        };
        webhookData.reference = ref;
        break;
      case 'branch':
        levelData = branchWebhooks;
        ref = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        webhookData.reference = ref;
        break;
      default:
        throw new Error('Invalid input to post() test function');
    }

    // Create request object
    const body = webhookData;
    const method = 'POST';
    const req = testUtils.createRequest(adminUser, {}, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const createdWebhooks = JSON.parse(_data);
      const createdWebhook = createdWebhooks[0];
      const token = `${adminUser._id}:${webhookData.token}`;

      chai.expect(createdWebhook.name).to.equal(webhookData.name);
      chai.expect(createdWebhook.triggers).to.deep.equal(webhookData.triggers);
      if (createdWebhook.type === 'Outgoing') {
        chai.expect(createdWebhook.url).to.equal(webhookData.url);
      }
      else {
        chai.expect(createdWebhook.token).to.equal(token);
        chai.expect(createdWebhook.tokenLocation).to.equal(webhookData.tokenLocation);
      }
      chai.expect(createdWebhook.reference).to.deep.equal(ref);
      chai.expect(createdWebhook.custom).to.deep.equal(webhookData.custom || {});

      // Verify additional properties
      chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
      chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdWebhook.createdOn).to.not.equal(null);
      chai.expect(createdWebhook.updatedOn).to.not.equal(null);
      chai.expect(createdWebhook.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(createdWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      // Save the webhook for later use
      createdWebhook._id = createdWebhook.id;
      levelData.push(createdWebhook);
      webhookIDs.push(createdWebhook.id);

      done();
    };

    // POST a webhook
    APIController.postWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock POST requests to create multiple webhooks on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function postMany(reference) {
  return function(done) {
    const webhookData = testData.webhooks.slice(1, 3);

    let levelData;
    let ref;
    switch (reference) {
      case 'org':
        levelData = orgWebhooks;
        ref = {
          org: org._id
        };
        webhookData.forEach((webhook) => {
          webhook.reference = ref;
        });
        break;
      case 'project':
        levelData = projWebhooks;
        ref = {
          org: org._id,
          project: projID
        };
        webhookData.forEach((webhook) => {
          webhook.reference = ref;
        });
        break;
      case 'branch':
        levelData = branchWebhooks;
        ref = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        webhookData.forEach((webhook) => {
          webhook.reference = ref;
        });
        break;
      default:
        throw new Error('Invalid input to postMany() test function');
    }

    // Create request object
    const body = webhookData;
    const method = 'POST';
    const req = testUtils.createRequest(adminUser, {}, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const createdWebhooks = JSON.parse(_data);
      // Convert createdWebhooks to JMI type 2 for easier lookup
      // Note: using the name field because the test data object will not have the id field
      const jmi2 = jmi.convertJMI(1, 2, createdWebhooks, 'name');

      webhookData.forEach((webhookDataObj) => {
        const createdWebhook = jmi2[webhookDataObj.name];
        const token = Buffer.from(`${adminUser._id}:${webhookDataObj.token}`).toString('base64');

        chai.expect(createdWebhook.name).to.equal(webhookDataObj.name);
        chai.expect(createdWebhook.type).to.equal(webhookDataObj.type);
        chai.expect(createdWebhook.description).to.equal(webhookDataObj.description);
        chai.expect(createdWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
        if (createdWebhook.type === 'Outgoing') {
          chai.expect(createdWebhook.url).to.equal(webhookDataObj.url);
        }
        else {
          chai.expect(createdWebhook.token).to.equal(token);
          chai.expect(createdWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
        }
        chai.expect(createdWebhook.reference).to.deep.equal(ref);
        chai.expect(createdWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

        // Verify additional properties
        chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
        chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(createdWebhook.createdOn).to.not.equal(null);
        chai.expect(createdWebhook.updatedOn).to.not.equal(null);
        chai.expect(createdWebhook.archived).to.equal(false);

        // Verify specific fields not returned
        chai.expect(createdWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
          '__v', '_id');

        // Save the webhook for later use
        createdWebhook._id = createdWebhook.id;
        levelData.push(createdWebhook);
        webhookIDs.push(createdWebhook.id);
      });

      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // POST a webhook
    APIController.postWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock GET requests to find all webhooks on an org, project, branch, or across
 * the entire system.
 *
 * @param {string} reference - A string specifying org, project, branch, or all.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function getAll(reference) {
  return function(done) {
    let webhookData;

    let ref;
    switch (reference) {
      case 'org':
        webhookData = orgWebhooks;
        ref = {
          org: org._id
        };
        break;
      case 'project':
        webhookData = projWebhooks;
        ref = {
          org: org._id,
          project: projID
        };
        break;
      case 'branch':
        webhookData = branchWebhooks;
        ref = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        break;
      case 'all':
        webhookData = [...orgWebhooks, ...projWebhooks, ...branchWebhooks];
        break;
      default:
        throw new Error('Invalid input to getAll() function');
    }

    // Create request object
    const body = null;
    const params = {};
    const method = 'GET';
    const req = testUtils.createRequest(adminUser, params, body, method);
    req.query = ref;

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const foundWebhooks = JSON.parse(_data);

      // Convert foundWebhooks to JMI type 2 for easier lookup
      const jmi2 = jmi.convertJMI(1, 2, foundWebhooks, 'id');

      webhookData.forEach((webhookDataObj) => {
        const foundWebhook = jmi2[webhookDataObj._id];

        // Verify webhook
        chai.expect(foundWebhook.name).to.equal(webhookDataObj.name);
        chai.expect(foundWebhook.type).to.equal(webhookDataObj.type);
        chai.expect(foundWebhook.description).to.equal(webhookDataObj.description);
        chai.expect(foundWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
        if (foundWebhook.type === 'Outgoing') {
          chai.expect(foundWebhook.url).to.equal(webhookDataObj.url);
        }
        else {
          chai.expect(foundWebhook.token).to.equal(webhookDataObj.token);
          chai.expect(foundWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
        }
        if (reference !== 'all') chai.expect(foundWebhook.reference).to.deep.equal(ref);
        chai.expect(foundWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

        // Verify additional properties
        chai.expect(foundWebhook.createdBy).to.equal(adminUser._id);
        chai.expect(foundWebhook.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(foundWebhook.createdOn).to.not.equal(null);
        chai.expect(foundWebhook.updatedOn).to.not.equal(null);

        // Verify specific fields not returned
        chai.expect(foundWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
          '__v', '_id');
      });

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // GET all webhooks at a reference level
    APIController.getWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock PATCH requests to update a webhook on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function patch(reference) {
  return function(done) {
    let webhookData;
    let ref;
    switch (reference) {
      case 'org':
        webhookData = orgWebhooks[0];
        ref = {
          org: org._id
        };
        break;
      case 'project':
        webhookData = projWebhooks[0];
        ref = {
          org: org._id,
          project: projID
        };
        break;
      case 'branch':
        webhookData = branchWebhooks[0];
        ref = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        break;
      default:
        throw new Error('Invalid input to patch() test function');
    }

    // Create request object
    const body = {
      id: webhookData._id,
      name: 'Patch test'
    };
    const params = { webhookid: webhookData._id };
    const method = 'PATCH';
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const updatedWebhook = JSON.parse(_data)[0];
      chai.expect(updatedWebhook.name).to.equal('Patch test');
      chai.expect(updatedWebhook.triggers).to.deep.equal(webhookData.triggers);
      chai.expect(updatedWebhook.url).to.equal(webhookData.url);
      chai.expect(updatedWebhook.reference).to.deep.equal(ref);
      chai.expect(updatedWebhook.custom).to.deep.equal(webhookData.custom || {});

      // Verify additional properties
      chai.expect(updatedWebhook.createdBy).to.equal(adminUser._id);
      chai.expect(updatedWebhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedWebhook.createdOn).to.not.equal(null);
      chai.expect(updatedWebhook.updatedOn).to.not.equal(null);
      chai.expect(updatedWebhook.archived).to.equal(false);

      // Verify specific fields not returned
      chai.expect(updatedWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
        '__v', '_id');

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // PATCH a webhook
    APIController.patchWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock PATCH requests to update multiple webhooks on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function patchMany(reference) {
  return function(done) {
    let webhookData;
    let ref;
    switch (reference) {
      case 'org':
        webhookData = orgWebhooks.slice(1, 3);
        ref = {
          org: org._id
        };
        break;
      case 'project':
        webhookData = projWebhooks.slice(1, 3);
        ref = {
          org: org._id,
          project: projID
        };
        break;
      case 'branch':
        webhookData = branchWebhooks.slice(1, 3);
        ref = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        break;
      default:
        throw new Error('Invalid input to patchMany() function');
    }

    // Create request object
    const body = [{
      id: webhookData[0]._id,
      name: 'Patch test'
    }, {
      id: webhookData[1]._id,
      name: 'Patch test'
    }];
    const params = {};
    const method = 'PATCH';
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const updatedWebhooks = JSON.parse(_data);
      // Convert createdWebhooks to JMI type 2 for easier lookup
      const jmi2 = jmi.convertJMI(1, 2, updatedWebhooks, 'id');

      webhookData.forEach((webhookDataObj) => {
        const updatedWebhook = jmi2[webhookDataObj.id];

        chai.expect(updatedWebhook.name).to.equal('Patch test');
        chai.expect(updatedWebhook.type).to.equal(webhookDataObj.type);
        chai.expect(updatedWebhook.description).to.equal(webhookDataObj.description);
        chai.expect(updatedWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
        if (updatedWebhook.response) {
          chai.expect(updatedWebhook.response.url).to.equal(webhookDataObj.response.url);
          chai.expect(updatedWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
        }
        else {
          chai.expect(updatedWebhook.token).to.equal(webhookDataObj.token);
          chai.expect(updatedWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
        }
        chai.expect(updatedWebhook.reference).to.deep.equal(ref);
        chai.expect(updatedWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

        // Verify additional properties
        chai.expect(updatedWebhook.createdBy).to.equal(adminUser._id);
        chai.expect(updatedWebhook.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(updatedWebhook.createdOn).to.not.equal(null);
        chai.expect(updatedWebhook.updatedOn).to.not.equal(null);
        chai.expect(updatedWebhook.archived).to.equal(false);

        // Verify specific fields not returned
        chai.expect(updatedWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
          '__v', '_id');
      });

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // PATCH multiple webhooks
    APIController.patchWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock DELETE requests to delete a webhook on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function remove(reference) {
  return function(done) {
    let webhookID;
    if (reference === 'org') {
      webhookID = orgWebhooks[0]._id;
    }
    if (reference === 'project') {
      webhookID = projWebhooks[0]._id;
    }
    if (reference === 'branch') {
      webhookID = branchWebhooks[0]._id;
    }

    // Create request object
    const body = null;
    const params = { webhookid: webhookID };
    const method = 'DELETE';
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const deletedWebhooks = JSON.parse(_data);
      chai.expect(deletedWebhooks.length).to.equal(1);
      chai.expect(deletedWebhooks[0]).to.equal(webhookID);

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // DELETE a webhook
    APIController.deleteWebhooks(req, res, next(req, res));
  };
}

/**
 * @description A constructor for a dynamic mocha-compatible function that verifies
 * mock DELETE requests to delete multiple webhooks on an org, project, or branch.
 *
 * @param {string} reference - A string specifying org, project, or branch.
 *
 * @returns {Function} A function for mocha to use to test a specific api endpoint.
 */
function removeMany(reference) {
  return function(done) {
    let deleteIDs;
    if (reference === 'org') {
      deleteIDs = orgWebhooks.slice(1, 3).map((w) => w._id);
    }
    if (reference === 'project') {
      deleteIDs = projWebhooks.slice(1, 3).map((w) => w._id);
    }
    if (reference === 'branch') {
      deleteIDs = branchWebhooks.slice(1, 3).map((w) => w._id);
    }

    // Create request object
    const body = deleteIDs;
    const params = {};
    const method = 'DELETE';
    const req = testUtils.createRequest(adminUser, params, body, method);

    // Set response as empty object
    const res = {};

    // Verifies status code and headers
    testUtils.createResponse(res);

    // Verifies the response data
    res.send = function send(_data) {
      // Verify response body
      const deletedWebhooks = JSON.parse(_data);
      chai.expect(deletedWebhooks.length).to.equal(2);
      chai.expect(deletedWebhooks).to.have.members(deleteIDs);

      // Expect the statusCode to be 200
      chai.expect(res.statusCode).to.equal(200);

      done();
    };

    // DELETE a webhook
    APIController.deleteWebhooks(req, res, next(req, res));
  };
}
