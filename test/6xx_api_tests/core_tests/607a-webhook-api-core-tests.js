/**
 * @classification UNCLASSIFIED
 *
 * @module test.607a-webhook-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests the webhook API controller functionality:
 * GET, POST, PATCH, and DELETE webhooks.
 */

// NPM modules
const chai = require('chai');
const request = require('request');

// MBEE modules
const WebhookController = M.require('controllers.webhook-controller');
const Webhook = M.require('models.webhook');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const test = M.config.test;
let adminUser = null;
const webhookIDs = [];

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Runs before all tests. Creates an admin user.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Runs after all tests. Removes any remaining test webhooks and removes the test
   * admin user.
   */
  after(async () => {
    try {
      await Webhook.deleteMany({ _id: { $in: webhookIDs } });
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
  it('should POST multiple webhooks', postWebhooks);
  // ------------- GET -------------
  it('should GET a webhook', getWebhook);
  it('should GET multiple webhooks', getWebhooks);
  it('should GET all webhooks', getAllWebhooks);
  // ------------ PATCH ------------
  it('should PATCH a webhook', patchWebhook);
  it('should PATCH multiple webhooks', patchWebhooks);
  // ------------ DELETE ------------
  it('should DELETE a webhook', deleteWebhook);
  it('should DELETE multiple webhooks', deleteWebhooks);
  // --------- POST (trigger) ---------
  it('should trigger an incoming webhook', triggerWebhook);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies POST /api/webhooks creates multiple webhooks.
 *
 * @param {Function} done - The mocha callback.
 */
function postWebhooks(done) {
  const webhookData = testData.webhooks;
  request({
    url: `${test.url}/api/webhooks`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'POST',
    body: JSON.stringify(webhookData)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);

    // Verify response body
    const createdWebhooks = JSON.parse(body);

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
      if (createdWebhook.response) {
        chai.expect(createdWebhook.response.url).to.equal(webhookDataObj.response.url);
        chai.expect(createdWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
      }
      else {
        chai.expect(createdWebhook.token).to.equal(token);
        chai.expect(createdWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
      }
      chai.expect(createdWebhook.reference).to.equal('');
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

      // Save webhook id for later use
      webhookDataObj.id = createdWebhook.id;
    });

    done();
  });
}

/**
 * @description Verifies GET /api/webhooks/:webhookid can find a single webhook.
 *
 * @param {Function} done - The mocha callback.
 */
function getWebhook(done) {
  const webhookData = testData.webhooks[0];
  request({
    url: `${test.url}/api/webhooks/${webhookData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET',
    body: null
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundWebhook = JSON.parse(body);
    chai.expect(foundWebhook.name).to.equal(webhookData.name);
    chai.expect(foundWebhook.triggers).to.deep.equal(webhookData.triggers);
    chai.expect(foundWebhook.response.url).to.equal(webhookData.response.url);
    chai.expect(foundWebhook.response.method).to.equal(webhookData.response.method || 'POST');
    chai.expect(foundWebhook.reference).to.equal('');
    chai.expect(foundWebhook.custom).to.deep.equal(webhookData.custom || {});

    // Verify additional properties
    chai.expect(foundWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(foundWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundWebhook.createdOn).to.not.equal(null);
    chai.expect(foundWebhook.updatedOn).to.not.equal(null);
    chai.expect(foundWebhook.archived).to.equal(false);

    // Verify specific fields not returned
    chai.expect(foundWebhook).to.not.have.any.keys('archivedOn', 'archivedBy',
      '__v', '_id');

    done();
  });
}

/**
 * @description Verifies GET /api/webhooks can find multiple webhooks.
 *
 * @param {Function} done - The mocha callback.
 */
function getWebhooks(done) {
  const webhookData = testData.webhooks.slice(0, 2);
  request({
    url: `${test.url}/api/webhooks`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET',
    body: JSON.stringify(webhookData.map(w => w.id))
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundWebhooks = JSON.parse(body);

    // Convert foundWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, foundWebhooks, 'id');

    webhookData.forEach((webhookDataObj) => {
      const foundWebhook = jmi2[webhookDataObj.id];
      const token = Buffer.from(`${adminUser._id}:${webhookDataObj.token}`).toString('base64');

      // Verify webhook
      chai.expect(foundWebhook.id).to.equal(webhookDataObj.id);
      chai.expect(foundWebhook.name).to.equal(webhookDataObj.name);
      chai.expect(foundWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(foundWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(foundWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      if (foundWebhook.response) {
        chai.expect(foundWebhook.response.url).to.equal(webhookDataObj.response.url);
        chai.expect(foundWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
      }
      else {
        chai.expect(foundWebhook.token).to.equal(token);
        chai.expect(foundWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
      }
      chai.expect(foundWebhook.reference).to.equal('');
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

    done();
  });
}

/**
 * @description Verifies GET /api/webhooks can find all webhooks.
 *
 * @param {Function} done - The mocha callback.
 */
function getAllWebhooks(done) {
  const webhookData = testData.webhooks;
  request({
    url: `${test.url}/api/webhooks`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'GET',
    body: null
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const foundWebhooks = JSON.parse(body);

    // Convert foundWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, foundWebhooks, 'id');

    webhookData.forEach((webhookDataObj) => {
      const foundWebhook = jmi2[webhookDataObj.id];
      const token = Buffer.from(`${adminUser._id}:${webhookDataObj.token}`).toString('base64');

      // Verify webhook
      chai.expect(foundWebhook.id).to.equal(webhookDataObj.id);
      chai.expect(foundWebhook.name).to.equal(webhookDataObj.name);
      chai.expect(foundWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(foundWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(foundWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      if (foundWebhook.response) {
        chai.expect(foundWebhook.response.url).to.equal(webhookDataObj.response.url);
        chai.expect(foundWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
      }
      else {
        chai.expect(foundWebhook.token).to.equal(token);
        chai.expect(foundWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
      }
      chai.expect(foundWebhook.reference).to.equal('');
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

    done();
  });
}

/**
 * @description Verifies PATCH /api/webhooks/:webhookid can update a single webhook.
 *
 * @param {Function} done - The mocha callback.
 */
function patchWebhook(done) {
  const webhookData = testData.webhooks[0];
  const webhookUpdate = {
    id: webhookData.id,
    name: 'test update'
  };
  request({
    url: `${test.url}/api/webhooks/${webhookData.id}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(webhookUpdate)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedWebhook = JSON.parse(body);
    chai.expect(updatedWebhook.name).to.equal('test update');
    chai.expect(updatedWebhook.triggers).to.deep.equal(webhookData.triggers);
    chai.expect(updatedWebhook.response.url).to.equal(webhookData.response.url);
    chai.expect(updatedWebhook.response.method).to.equal(webhookData.response.method || 'POST');
    chai.expect(updatedWebhook.reference).to.equal('');
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

    done();
  });
}

/**
 * @description Verifies PATCH /api/webhooks/:webhookid can update multiple webhooks.
 *
 * @param {Function} done - The mocha callback.
 */
function patchWebhooks(done) {
  const webhookData = testData.webhooks.slice(1, 3);
  const webhookUpdate = [{
    id: webhookData[0].id,
    name: 'test update'
  }, {
    id: webhookData[1].id,
    name: 'test update'
  }];
  request({
    url: `${test.url}/api/webhooks`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'PATCH',
    body: JSON.stringify(webhookUpdate)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const updatedWebhooks = JSON.parse(body);

    // Convert updatedWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, updatedWebhooks, 'id');

    webhookData.forEach((webhookDataObj) => {
      const updatedWebhook = jmi2[webhookDataObj.id];
      const token = Buffer.from(`${adminUser._id}:${webhookDataObj.token}`).toString('base64');

      chai.expect(updatedWebhook.name).to.equal('test update');
      chai.expect(updatedWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(updatedWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(updatedWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      if (updatedWebhook.response) {
        chai.expect(updatedWebhook.response.url).to.equal(webhookDataObj.response.url);
        chai.expect(updatedWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
      }
      else {
        chai.expect(updatedWebhook.token).to.equal(token);
        chai.expect(updatedWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
      }
      chai.expect(updatedWebhook.reference).to.equal('');
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

    done();
  });
}

/**
 * @description Verifies DELETE /api/webhooks/:webhookid can delete a single webhook.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteWebhook(done) {
  const deleteID = testData.webhooks[0].id;
  request({
    url: `${test.url}/api/webhooks/${deleteID}`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE',
    body: null
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedWebhooks = JSON.parse(body);
    chai.expect(deletedWebhooks.length).to.equal(1);
    chai.expect(deletedWebhooks[0]).to.equal(deleteID);

    done();
  });
}

/**
 * @description Verifies DELETE /api/webhooks/ can delete multiple webhooks.
 *
 * @param {Function} done - The mocha callback.
 */
function deleteWebhooks(done) {
  const deleteIDs = testData.webhooks.slice(1, 3).map((w) => w.id);
  request({
    url: `${test.url}/api/webhooks`,
    headers: testUtils.getHeaders(),
    ca: testUtils.readCaFile(),
    method: 'DELETE',
    body: JSON.stringify(deleteIDs)
  },
  (err, response, body) => {
    // Expect no error
    chai.expect(err).to.equal(null);

    // Expect response status: 200 OK
    chai.expect(response.statusCode).to.equal(200);
    // Verify response body
    const deletedWebhooks = JSON.parse(body);
    chai.expect(deletedWebhooks.length).to.equal(2);
    chai.expect(deletedWebhooks).to.have.members(deleteIDs);

    done();
  });
}

/**
 * @description Verifies POST /api/webhooks/trigger/:base64id can trigger a webhook.
 *
 * @param {Function} done - The mocha callback.
 */
function triggerWebhook(done) {
  // Get data for an incoming webhook
  const webhookData = testData.webhooks[1];
  delete webhookData.id;

  const body = {
    test: {
      token: Buffer.from(`${adminUser._id}:test token`).toString('base64')
    }
  };

  // Note: registering a listener here would not work because the event occurs on a
  // separately running server. All we can test here is that we get a 200 response.

  WebhookController.create(adminUser, webhookData)
  .then((webhooks) => {
    const webhook = webhooks[0];
    // Get the base64 encoding of the webhook id
    const triggerID = webhook._id;
    const encodedID = Buffer.from(triggerID).toString('base64');

    // Save the id to be deleted later
    webhookIDs.push(triggerID);

    request({
      url: `${test.url}/api/webhooks/trigger/${encodedID}`,
      headers: testUtils.getHeaders(),
      ca: testUtils.readCaFile(),
      method: 'POST',
      body: JSON.stringify(body)
    },
    (err, response) => {
      // Expect no error
      chai.expect(err).to.equal(null);

      // Expect response status: 200 OK
      chai.expect(response.statusCode).to.equal(200);

      done();
    });
  })
  .catch((error) => {
    M.log.error(error);
    chai.expect(error).to.equal(null);
  });
}
