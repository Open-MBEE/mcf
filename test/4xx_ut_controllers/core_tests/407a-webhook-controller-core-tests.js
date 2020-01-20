/**
 * @classification UNCLASSIFIED
 *
 * @module test.407a-webhook-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Tests the webhook controller functionality: create,
 * find, update, and delete webhooks.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const WebhookController = M.require('controllers.webhook-controller');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: runs before all tests. Creates a test admin.
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
   * After: runs after all tests. Removes test admin.
   */
  after(async () => {
    try {
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // ------------- Create -------------
  it('should create a webhook', createWebhook);
  it('should create multiple webhooks', createWebhooks);
  // -------------- Find --------------
  it('should find a webhook', findWebhook);
  it('should find multiple webhooks', findWebhooks);
  it('should find all webhooks', findAllWebhooks);
  // ------------- Update -------------
  it('should update a webhook', updateWebhook);
  it('should update multiple webhooks', updateWebhooks);
  // ------------- Remove -------------
  it('should delete a webhook', deleteWebhook);
  it('should delete multiple webhooks', deleteWebhooks);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the Webhook Controller can create a webhook.
 */
async function createWebhook() {
  try {
    const webhookData = testData.webhooks[0];

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(createdWebhooks.length).to.equal(1);
    const createdWebhook = createdWebhooks[0];

    // Verify webhook created properly
    chai.expect(createdWebhook.name).to.equal(webhookData.name);
    chai.expect(createdWebhook.type).to.equal(webhookData.type);
    chai.expect(createdWebhook.description).to.equal(webhookData.description);
    chai.expect(createdWebhook.triggers).to.deep.equal(webhookData.triggers);
    chai.expect(createdWebhook.response.url).to.equal(webhookData.response.url);
    chai.expect(createdWebhook.response.method).to.equal(webhookData.response.method || 'POST');
    chai.expect(createdWebhook.custom).to.deep.equal(webhookData.custom || {});

    // Verify additional properties
    chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.archivedBy).to.equal(null);
    chai.expect(createdWebhook.createdOn).to.not.equal(null);
    chai.expect(createdWebhook.updatedOn).to.not.equal(null);
    chai.expect(createdWebhook.archivedOn).to.equal(null);

    // Save the generated UUID to be used later in find() tests
    webhookData._id = createdWebhook._id;
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can create multiple webhooks.
 */
async function createWebhooks() {
  try {
    const webhookData = [testData.webhooks[1], testData.webhooks[2]];

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);

    // Expect createdWebhooks array to contain 2 webhooks
    chai.expect(createdWebhooks.length).to.equal(2);

    // Convert createdWebhooks to JMI type 2 for easier lookup
    // Note: using the name field because the test data object will not have the _id field
    const jmi2 = jmi.convertJMI(1, 2, createdWebhooks, 'name');

    webhookData.forEach((webhookDataObj) => {
      const createdWebhook = jmi2[webhookDataObj.name];

      // Verify webhook created properly
      chai.expect(createdWebhook.name).to.equal(webhookDataObj.name);
      chai.expect(createdWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(createdWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(createdWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      if (createdWebhook.response) {
        chai.expect(createdWebhook.response.url).to.equal(webhookDataObj.response.url);
        chai.expect(createdWebhook.response.method).to.equal(webhookDataObj.response.method || 'POST');
      }
      else {
        chai.expect(createdWebhook.token).to.equal(webhookDataObj.token);
        chai.expect(createdWebhook.tokenLocation).to.equal(webhookDataObj.tokenLocation);
      }
      chai.expect(createdWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

      // Verify additional properties
      chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
      chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdWebhook.archivedBy).to.equal(null);
      chai.expect(createdWebhook.createdOn).to.not.equal(null);
      chai.expect(createdWebhook.updatedOn).to.not.equal(null);
      chai.expect(createdWebhook.archivedOn).to.equal(null);

      // Save the _id for later use
      webhookDataObj._id = createdWebhook._id;
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find a webhook.
 */
async function findWebhook() {
  try {
    const webhookData = testData.webhooks[0];
    const webhookID = webhookData._id;

    // Find webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser, webhookID);

    // Expect foundWebhooks array to contain 1 webhook
    chai.expect(foundWebhooks.length).to.equal(1);
    const foundWebhook = foundWebhooks[0];

    // Verify webhook
    chai.expect(foundWebhook._id).to.equal(webhookData._id);
    chai.expect(foundWebhook.name).to.equal(webhookData.name);
    chai.expect(foundWebhook.type).to.equal(webhookData.type);
    chai.expect(foundWebhook.description).to.equal(webhookData.description);
    chai.expect(foundWebhook.triggers).to.deep.equal(webhookData.triggers);
    chai.expect(foundWebhook.response.url).to.equal(webhookData.response.url);
    chai.expect(foundWebhook.response.method).to.equal(webhookData.response.method || 'POST');
    chai.expect(foundWebhook.reference).to.equal('');
    chai.expect(foundWebhook.custom).to.deep.equal(webhookData.custom || {});

    // Verify additional properties
    chai.expect(foundWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(foundWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundWebhook.archivedBy).to.equal(null);
    chai.expect(foundWebhook.createdOn).to.not.equal(null);
    chai.expect(foundWebhook.updatedOn).to.not.equal(null);
    chai.expect(foundWebhook.archivedOn).to.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find multiple webhooks.
 */
async function findWebhooks() {
  try {
    const webhookData = testData.webhooks.slice(0, 2);
    const webhookIDs = [webhookData[0]._id, webhookData[1]._id];

    // Find webhooks via controller
    const foundWebhooks = await WebhookController.find(adminUser, webhookIDs);

    // Expect foundWebhooks array to contain 2 webhooks
    chai.expect(foundWebhooks.length).to.equal(2);

    // Convert createdWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, foundWebhooks);

    webhookData.forEach((webhookDataObj) => {
      const foundWebhook = jmi2[webhookDataObj._id];

      // Verify webhook
      chai.expect(foundWebhook._id).to.equal(webhookDataObj._id);
      chai.expect(foundWebhook.name).to.equal(webhookDataObj.name);
      chai.expect(foundWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(foundWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(foundWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      chai.expect(foundWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

      // Verify additional properties
      chai.expect(foundWebhook.createdBy).to.equal(adminUser._id);
      chai.expect(foundWebhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundWebhook.archivedBy).to.equal(null);
      chai.expect(foundWebhook.createdOn).to.not.equal(null);
      chai.expect(foundWebhook.updatedOn).to.not.equal(null);
      chai.expect(foundWebhook.archivedOn).to.equal(null);
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find all webhooks.
 */
async function findAllWebhooks() {
  try {
    const webhookData = testData.webhooks;

    // Find webhooks via controller without passing in ids
    const foundWebhooks = await WebhookController.find(adminUser);

    // Expect foundWebhooks array to contain at least the 3 test webhooks
    chai.expect(foundWebhooks.length).to.be.at.least(3);

    // Convert createdWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, foundWebhooks);

    webhookData.forEach((webhookDataObj) => {
      const foundWebhook = jmi2[webhookDataObj._id];

      // Verify webhook
      chai.expect(foundWebhook._id).to.equal(webhookDataObj._id);
      chai.expect(foundWebhook.name).to.equal(webhookDataObj.name);
      chai.expect(foundWebhook.type).to.equal(webhookDataObj.type);
      chai.expect(foundWebhook.description).to.equal(webhookDataObj.description);
      chai.expect(foundWebhook.triggers).to.deep.equal(webhookDataObj.triggers);
      chai.expect(foundWebhook.custom).to.deep.equal(webhookDataObj.custom || {});

      // Verify additional properties
      chai.expect(foundWebhook.createdBy).to.equal(adminUser._id);
      chai.expect(foundWebhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundWebhook.archivedBy).to.equal(null);
      chai.expect(foundWebhook.createdOn).to.not.equal(null);
      chai.expect(foundWebhook.updatedOn).to.not.equal(null);
      chai.expect(foundWebhook.archivedOn).to.equal(null);
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can update a webhook.
 */
async function updateWebhook() {
  try {
    const webhookData = testData.webhooks[0];
    const webhookUpdate = {
      id: webhookData._id,
      name: 'test update'
    };

    // Update webhook via controller
    const updatedWebhooks = await WebhookController.update(adminUser, webhookUpdate);

    // Expect updatedWebhooks array to contain 1 webhook
    chai.expect(updatedWebhooks.length).to.equal(1);
    const updatedWebhook = updatedWebhooks[0];

    // Verify webhook
    chai.expect(updatedWebhook.name).to.equal(webhookUpdate.name);
    chai.expect(updatedWebhook.type).to.equal(webhookData.type);
    chai.expect(updatedWebhook.description).to.equal(webhookData.description);
    chai.expect(updatedWebhook.triggers).to.deep.equal(webhookData.triggers);
    chai.expect(updatedWebhook.response.url).to.equal(webhookData.response.url);
    chai.expect(updatedWebhook.response.method).to.equal(webhookData.response.method || 'POST');
    chai.expect(updatedWebhook.custom).to.deep.equal(webhookData.custom || {});

    // Verify additional properties
    chai.expect(updatedWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(updatedWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedWebhook.archivedBy).to.equal(null);
    chai.expect(updatedWebhook.createdOn).to.not.equal(null);
    chai.expect(updatedWebhook.updatedOn).to.not.equal(null);
    chai.expect(updatedWebhook.archivedOn).to.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can update multiple webhooks.
 */
async function updateWebhooks() {
  try {
    const webhookData = testData.webhooks.slice(1, 3);
    const webhookUpdate = [{
      id: webhookData[0]._id,
      name: 'test update'
    },
    {
      id: webhookData[1]._id,
      name: 'test update'
    }];

    // Update webhooks via controller
    const updatedWebhooks = await WebhookController.update(adminUser, webhookUpdate);

    // Expect updatedWebhooks array to contain 2 webhooks
    chai.expect(updatedWebhooks.length).to.equal(2);

    // Convert createdWebhooks to JMI type 2 for easier lookup
    const jmi2 = jmi.convertJMI(1, 2, updatedWebhooks);

    webhookData.forEach((webhookDataObj) => {
      const webhook = jmi2[webhookDataObj._id];

      // Verify webhook
      chai.expect(webhook._id).to.equal(webhookDataObj._id);
      chai.expect(webhook.name).to.equal('test update');
      chai.expect(webhook.type).to.equal(webhookDataObj.type);
      chai.expect(webhook.description).to.equal(webhookDataObj.description);
      chai.expect(webhook.triggers).to.deep.equal(webhookDataObj.triggers);
      chai.expect(webhook.custom).to.deep.equal(webhookDataObj.custom || {});

      // Verify additional properties
      chai.expect(webhook.createdBy).to.equal(adminUser._id);
      chai.expect(webhook.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(webhook.archivedBy).to.equal(null);
      chai.expect(webhook.createdOn).to.not.equal(null);
      chai.expect(webhook.updatedOn).to.not.equal(null);
      chai.expect(webhook.archivedOn).to.equal(null);
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can delete a webhook.
 */
async function deleteWebhook() {
  try {
    const webhookData = testData.webhooks[0];
    const webhookID = webhookData._id;

    // Delete webhook via controller
    const deletedWebhooks = await WebhookController.remove(adminUser, webhookID);

    // Expect deletedWebhooks array to contain 1 webhook
    chai.expect(deletedWebhooks.length).to.equal(1);
    chai.expect(deletedWebhooks[0]).to.equal(webhookData._id);

    // Try to find the webhook
    const foundWebhooks = await WebhookController.find(adminUser, webhookData._id);

    // Expect nothing to be returned
    chai.expect(foundWebhooks.length).to.equal(0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can delete multiple webhooks.
 */
async function deleteWebhooks() {
  try {
    const webhookData = testData.webhooks.slice(1, 3);
    const webhookIDs = [webhookData[0]._id, webhookData[1]._id];

    // Delete webhook via controller
    const deletedWebhooks = await WebhookController.remove(adminUser, webhookIDs);

    // Expect deletedWebhooks array to contain 2 webhooks
    chai.expect(deletedWebhooks.length).to.equal(2);
    chai.expect(deletedWebhooks).to.have.members(webhookIDs);

    // Try to find the webhooks
    const foundWebhooks = await WebhookController.find(adminUser, webhookIDs);

    // Expect nothing to be returned
    chai.expect(foundWebhooks.length).to.equal(0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
