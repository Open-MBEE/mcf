/**
 * @classification UNCLASSIFIED
 *
 * @module test.307a-webhook-model-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This tests the Webhook Model functionality. The webhook
 * model tests create incoming and outgoing webhooks. These tests
 * find, update and delete the webhooks.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const uuidv4 = require('uuid/v4');
const request = require('request');

// Use async chai
chai.use(chaiAsPromised);
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const Webhook = M.require('models.webhook');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
const webhookID = uuidv4();
const webhookIDs = [webhookID];

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: runs after all tests. Removes any remaining webhooks.
   */
  after(async () => {
    try {
      // Remove the webhook
      await Webhook.deleteMany({ _id: { $in: webhookIDs } });
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      should.not.exist(error);
    }
  });

  /* Execute the tests */
  it('should create an outgoing webhook', createOutgoingWebhook);
  it('should create an incoming webhook', createIncomingWebhook);
  it('should find a webhook', findWebhook);
  it('should update a webhook', updateWebhook);
  it('should delete a webhook', deleteWebhook);
  it('should verify a token', verifyToken);
  it('should get the valid update fields', validUpdateFields);
  it('should get the valid populate fields', validPopulateFields);
  it('should send an HTTP request', sendRequest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates an outgoing webhook using the Webhook model.
 */
async function createOutgoingWebhook() {
  try {
    const webhookData = testData.webhooks[0];
    // Give the webhook the previously generated global _id
    webhookData._id = webhookID;

    // Save the Webhook model object to the database
    await Webhook.insertMany(webhookData);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Creates an incoming webhook using the Webhook model.
 */
async function createIncomingWebhook() {
  try {
    const webhookData = testData.webhooks[1];
    // Create a new uuid
    webhookData._id = uuidv4();

    // Save the id to delete later
    webhookIDs.push(webhookData._id);

    // Save the webhook model object to the database
    await Webhook.insertMany(webhookData);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Finds a webhook using the Webhook model.
 */
async function findWebhook() {
  try {
    // Find the created webhook from the previous test
    const webhook = await Webhook.findOne({ _id: webhookID });

    // Verify correct webhook is returned
    webhook._id.should.equal(webhookID);
    webhook.name.should.equal(testData.webhooks[0].name);
    webhook.type.should.equal(testData.webhooks[0].type);
    webhook.description.should.equal(testData.webhooks[0].description);
    webhook.triggers.should.deep.equal(testData.webhooks[0].triggers);
    webhook.url.should.equal(testData.webhooks[0].url);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Updates a webhook using the Webhook model.
 */
async function updateWebhook() {
  try {
    // Update the name of the webhook created in the first test
    await Webhook.updateOne({ _id: webhookID }, { name: 'Updated Name' });

    // Find the updated webhook
    const foundWebhook = await Webhook.findOne({ _id: webhookID });

    // Verify webhook is updated correctly
    foundWebhook._id.should.equal(webhookID);
    foundWebhook.name.should.equal('Updated Name');
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Deletes a webhook using the Webhook model.
 */
async function deleteWebhook() {
  try {
    // Remove the webhook
    await Webhook.deleteMany({ _id: { $in: [webhookID] } });

    // Attempt to find the webhook
    const foundWebhook = await Webhook.findOne({ _id: webhookID });

    // foundWebhook should be null
    should.not.exist(foundWebhook);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Verifies a token via the Webhook model.
 */
async function verifyToken() {
  try {
    // Get data for an incoming webhook
    const webhookData = testData.webhooks[1];
    // Give the webhook the previously generated global _id
    webhookData._id = webhookID;

    // Get the token
    const token = webhookData.token;

    // Save the Webhook model object to the database
    const webhooks = await Webhook.insertMany(webhookData);

    // Run the webhook test for tokens; it will throw an error if they don't match
    Webhook.verifyAuthority(webhooks[0], token);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 *
 * @description Verifies that the webhook model function getValidUpdateFields returns the
 * correct fields.
 */
async function validUpdateFields() {
  try {
    // Set the array of correct update fields;
    const updateFields = ['name', 'description', 'triggers', 'url', 'token',
      'tokenLocation', 'archived', 'custom'];

    // Get the update fields from the webhook model
    const modelUpdateFields = Webhook.getValidUpdateFields();

    // Expect the array returned from the model function to have the values listed above
    (modelUpdateFields).should.have.members(updateFields);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 *
 * @description Verifies that the webhook model function
 * getValidPopulateFields() returns the correct fields.
 */
async function validPopulateFields() {
  try {
    // Set the array of correct update fields;
    const populateFields = ['archivedBy', 'lastModifiedBy', 'createdBy'];

    // Get the update fields from the webhook model
    const modelPopulateFields = Webhook.getValidPopulateFields();

    // Expect the array returned from the model function to have the values listed above
    chai.expect(modelPopulateFields).to.have.members(populateFields);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}

/**
 * @description Verifies that the webhook model function sendRequest can successfully send
 * an HTTP request.
 */
async function sendRequest() {
  // First check that the api is up
  const options = {
    url: `${M.config.test.url}/api/test`,
    method: 'GET'
  };
  const apiUp = await new Promise((resolve) => {
    request(options, (err, response) => {
      if (err) resolve(false);
      if (response && response.statusCode === 200) resolve(true);
      else resolve(false);
    });
  });
  // Skip the test if the api isn't up
  if (!apiUp) this.skip();

  try {
    // Create a mock outgoing webhook object
    const webhook = {
      type: 'Outgoing',
      response: {
        url: `${M.config.test.url}/api/test`,
        method: 'GET'
      }
    };

    // Test the sendRequest function with no data
    Webhook.sendRequest(webhook, null);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
}
