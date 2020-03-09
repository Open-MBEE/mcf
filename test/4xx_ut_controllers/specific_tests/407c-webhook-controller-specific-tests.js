/**
 * @classification UNCLASSIFIED
 *
 * @module test.407c-webhook-controller-specific-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description These tests test for specific use cases within the webhook
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const WebhookController = M.require('controllers.webhook-controller');
const Webhook = M.require('models.webhook');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser;
let org;
let project;
let projID;
const branchID = 'master';
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
   * Before: runs before all tests. Creates test admin, test org, and test project.
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
   * After: runs after all tests. Removes any remaining test webhooks, and removes the test org and
   * test admin.
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

  /* Execute the tests */
  // ------------- Create -------------
  it('should create a webhook on an org', createOnOrg);
  it('should create a webhook on a project', createOnProject);
  it('should create a webhook on a branch', createOnBranch);
  it('should populate allowed fields when creating a webhook', optionPopulateCreate);
  it('should return a webhook with only the specific fields specified from create()', optionFieldsCreate);
  // -------------- Find --------------
  it('should find an org webhook', findOnOrg);
  it('should find a project webhook', findOnProject);
  it('should find a branch webhook', findOnBranch);
  it('should find any webhook', optionAllFind);
  it('should populate allowed fields when finding a webhook', optionPopulateFind);
  it('should find an archived webhook when the option archived is provided', optionArchivedFind);
  it('should find an archived webhook when the option includeArchived is provided', optionIncludeArchivedFind);
  it('should return a webhook with only the specific fields specified from find()', optionFieldsFind);
  it('should return a limited number of webhooks from find()', optionLimitFind);
  it('should return a second batch of webhooks with the limit and skip option from find()', optionSkipFind);
  it('should sort find results', optionSortFind);
  // ------------- Update -------------
  it('should archive a webhook', archiveWebhook);
  it('should populate allowed fields when updating a webhook', optionPopulateUpdate);
  it('should return a webhook with only the specific fields specified from update()', optionFieldsUpdate);
  // ------------- Remove -------------
  it('should delete a webhook from an org', deleteOnOrg);
  it('should delete a webhook from a project', deleteOnProject);
  it('should delete a webhook from a branch', deleteOnBranch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the Webhook Controller can create a webhook on an org.
 */
async function createOnOrg() {
  try {
    const webhookData = testData.webhooks[0];
    webhookData.reference = {
      org: org._id
    };

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(createdWebhooks.length).to.equal(1);
    const createdWebhook = createdWebhooks[0];

    // Verify webhook created properly
    chai.expect(createdWebhook.name).to.equal(testData.webhooks[0].name);
    chai.expect(createdWebhook.type).to.equal(testData.webhooks[0].type);
    chai.expect(createdWebhook.description).to.equal(testData.webhooks[0].description);
    chai.expect(createdWebhook.triggers).to.deep.equal(testData.webhooks[0].triggers);
    chai.expect(createdWebhook.url).to.equal(testData.webhooks[0].url);
    chai.expect(createdWebhook.reference).to.equal(org._id);
    chai.expect(createdWebhook.custom).to.deep.equal(testData.webhooks[0].custom || {});

    // Verify additional properties
    chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.archivedBy).to.equal(null);
    chai.expect(createdWebhook.createdOn).to.not.equal(null);
    chai.expect(createdWebhook.updatedOn).to.not.equal(null);
    chai.expect(createdWebhook.archivedOn).to.equal(null);

    // Save the generated UUID to be used later in find() tests
    webhookIDs.push(createdWebhook._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can create a webhook on a project.
 */
async function createOnProject() {
  try {
    const webhookData = testData.webhooks[0];
    webhookData.reference = {
      org: org._id,
      project: projID
    };

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(createdWebhooks.length).to.equal(1);
    const createdWebhook = createdWebhooks[0];

    // Verify webhook created properly
    chai.expect(createdWebhook.name).to.equal(testData.webhooks[0].name);
    chai.expect(createdWebhook.type).to.equal(testData.webhooks[0].type);
    chai.expect(createdWebhook.description).to.equal(testData.webhooks[0].description);
    chai.expect(createdWebhook.triggers).to.deep.equal(testData.webhooks[0].triggers);
    chai.expect(createdWebhook.url).to.equal(testData.webhooks[0].url);
    chai.expect(createdWebhook.reference).to.equal(utils.createID(org._id, projID));
    chai.expect(createdWebhook.custom).to.deep.equal(testData.webhooks[0].custom || {});

    // Verify additional properties
    chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.archivedBy).to.equal(null);
    chai.expect(createdWebhook.createdOn).to.not.equal(null);
    chai.expect(createdWebhook.updatedOn).to.not.equal(null);
    chai.expect(createdWebhook.archivedOn).to.equal(null);

    // Save the generated UUID to be used later in find() tests
    webhookIDs.push(createdWebhook._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can create a webhook on a branch.
 */
async function createOnBranch() {
  try {
    const webhookData = testData.webhooks[0];
    webhookData.reference = {
      org: org._id,
      project: projID,
      branch: branchID
    };

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(createdWebhooks.length).to.equal(1);
    const createdWebhook = createdWebhooks[0];

    // Verify webhook created properly
    chai.expect(createdWebhook.name).to.equal(testData.webhooks[0].name);
    chai.expect(createdWebhook.type).to.equal(testData.webhooks[0].type);
    chai.expect(createdWebhook.description).to.equal(testData.webhooks[0].description);
    chai.expect(createdWebhook.triggers).to.deep.equal(testData.webhooks[0].triggers);
    chai.expect(createdWebhook.url).to.equal(testData.webhooks[0].url);
    chai.expect(createdWebhook.reference).to.equal(utils.createID(org._id, projID, branchID));
    chai.expect(createdWebhook.custom).to.deep.equal(testData.webhooks[0].custom || {});

    // Verify additional properties
    chai.expect(createdWebhook.createdBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdWebhook.archivedBy).to.equal(null);
    chai.expect(createdWebhook.createdOn).to.not.equal(null);
    chai.expect(createdWebhook.updatedOn).to.not.equal(null);
    chai.expect(createdWebhook.archivedOn).to.equal(null);

    // Save the generated UUID to be used later in find() tests
    webhookIDs.push(createdWebhook._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return populated fields after
 * creating a webhook.
 */
async function optionPopulateCreate() {
  try {
    // Set object to create and populate option
    const webhookData = testData.webhooks[0];
    delete webhookData.reference;
    const pop = Webhook.getValidPopulateFields();
    const options = { populate: pop };

    // Create webhook via controller
    const createdWebhooks = await WebhookController.create(adminUser, webhookData, options);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(createdWebhooks.length).to.equal(1);
    const webhook = createdWebhooks[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in webhook).to.equal(true);
      if (Array.isArray(webhook[field])) {
        webhook[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (webhook[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof webhook[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in webhook[field]).to.equal(true);
      }
    });

    // Keep track of _id to delete it at the end
    webhookIDs.push(webhook._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return specific fields after
 * creating a webhook.
 */
async function optionFieldsCreate() {
  try {
    // Set object to create and populate option
    const webhookData = testData.webhooks[0];
    // Create the options object with the list of fields specifically to return
    const findOptions = { fields: ['name', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT to return
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create webhook via controller
    const fieldsWebhooks = await WebhookController.create(adminUser, webhookData, findOptions);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(fieldsWebhooks.length).to.equal(1);
    const webhook = fieldsWebhooks[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible webhook fields
    const visibleFields = Object.keys(webhook);

    // Check that the only keys in the webhook are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Keep track of _id to delete it at the end
    webhookIDs.push(webhook._id);

    // Create webhook via controller
    const notFieldsWebhooks = await WebhookController.create(adminUser, webhookData,
      notFindOptions);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(notFieldsWebhooks.length).to.equal(1);
    const webhook2 = notFieldsWebhooks[0];

    // Create a list of visible webhook fields
    const visibleFields2 = Object.keys(webhook2);

    // Check that the keys in the notFindOptions are not in webhook
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);

    // Keep track of _id to delete it at the end
    webhookIDs.push(webhook2._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find a webhook on an org.
 */
async function findOnOrg() {
  try {
    // Set org reference
    const options = { org: org._id };

    // Find webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser, options);
    const foundWebhook = foundWebhooks[0];

    // Verify webhook found on org
    chai.expect(foundWebhook.reference).to.equal(org._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find a webhook on a project.
 */
async function findOnProject() {
  try {
    // Set project reference
    const options = { org: org._id, project: projID };

    // Find webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser, options);
    const foundWebhook = foundWebhooks[0];

    // Verify webhook found on project
    chai.expect(foundWebhook.reference).to.equal(utils.createID(org._id, projID));
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find a webhook on a branch.
 */
async function findOnBranch() {
  try {
    // Set branch reference
    const options = { org: org._id, project: projID, branch: branchID };

    // Find webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser, options);
    const foundWebhook = foundWebhooks[0];

    // Verify webhook found on branch
    chai.expect(foundWebhook.reference).to.equal(utils.createID(org._id, projID, branchID));
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
async function optionAllFind() {
  try {
    // Find webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser);

    // Expect to find server webhooks
    const serverWebhooks = foundWebhooks.filter((w) => w.reference === '');
    chai.expect(serverWebhooks.length).to.be.at.least(2);

    // Expect to find org webhooks
    const orgWebhooks = foundWebhooks.filter((w) => w.reference === org._id);
    chai.expect(orgWebhooks.length).to.be.at.least(1);

    // Expect to find project webhooks
    const projectWebhooks = foundWebhooks.filter((w) => w.reference === utils.createID(
      org._id, projID
    ));
    chai.expect(projectWebhooks.length).to.be.at.least(1);

    // Expect to find branch webhooks
    const branchWebhooks = foundWebhooks.filter((w) => w.reference === utils.createID(
      org._id, projID, branchID
    ));
    chai.expect(branchWebhooks.length).to.be.at.least(1);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return populated fields when
 * finding a webhook.
 */
async function optionPopulateFind() {
  try {
    // Set object to create and populate option
    const webhookData = webhookIDs[0];
    const pop = Webhook.getValidPopulateFields();
    const options = { populate: pop };

    // Create webhook via controller
    const foundWebhooks = await WebhookController.find(adminUser, webhookData, options);

    // Expect foundWebhooks array to contain 1 webhook
    chai.expect(foundWebhooks.length).to.equal(1);
    const webhook = foundWebhooks[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in webhook).to.equal(true);
      if (Array.isArray(webhook[field])) {
        webhook[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (webhook[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof webhook[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in webhook[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can find an archived webhook with the
 * archived option.
 */
async function optionArchivedFind() {
  try {
    const webhookData = webhookIDs[0];
    const options = { archived: true };

    // First archive the webhook
    await Webhook.updateOne({ _id: webhookData }, options);

    // Now attempt to find it
    const foundWebhooks = await WebhookController.find(adminUser, webhookData, options);

    // Expect foundWebhooks array to contain 1 webhook
    chai.expect(foundWebhooks.length).to.equal(1);
    const webhook = foundWebhooks[0];

    // Verify webhook
    chai.expect(webhook._id).to.equal(webhookData);
    chai.expect(webhook.archived).to.equal(true);

    // un-archive the webhook
    await Webhook.updateOne({ _id: webhookData }, { archived: false });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}


/**
 * @description Validates that the Webhook Controller can find an archived webhook with the
 * includeArchived option.
 */
async function optionIncludeArchivedFind() {
  try {
    const webhookData = webhookIDs[0];
    const options = { includeArchived: true };

    // First archive the webhook
    await Webhook.updateOne({ _id: webhookData }, { archived: true });

    // Now attempt to find it
    const foundWebhooks = await WebhookController.find(adminUser, webhookData, options);

    // Expect foundWebhooks array to contain 1 webhook
    chai.expect(foundWebhooks.length).to.equal(1);
    const webhook = foundWebhooks[0];

    // Verify webhook
    chai.expect(webhook._id).to.equal(webhookData);
    chai.expect(webhook.archived).to.equal(true);

    // un-archive the webhook
    await Webhook.updateOne({ _id: webhookData }, { archived: false });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return only specified
 * fields when finding webhooks with the fields option.
 */
async function optionFieldsFind() {
  try {
    // Set object to create and populate option
    const webhookData = webhookIDs[0];
    // Create the options object with the list of fields specifically to return
    const findOptions = { fields: ['name', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT to return
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create webhook via controller
    const fieldsWebhooks = await WebhookController.find(adminUser, webhookData, findOptions);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(fieldsWebhooks.length).to.equal(1);
    const webhook = fieldsWebhooks[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible webhook fields
    const visibleFields = Object.keys(webhook);

    // Check that the only keys in the webhook are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Keep track of _id to delete it at the end
    webhookIDs.push(webhook._id);

    // Create webhook via controller
    const notFieldsWebhooks = await WebhookController.find(adminUser, webhookData,
      notFindOptions);

    // Expect createdWebhooks array to contain 1 webhook
    chai.expect(notFieldsWebhooks.length).to.equal(1);
    const webhook2 = notFieldsWebhooks[0];

    // Create a list of visible webhook fields
    const visibleFields2 = Object.keys(webhook2);

    // Check that the keys in the notFindOptions are not in webhook
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);

    // Keep track of _id to delete it at the end
    webhookIDs.push(webhook2._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return a limited number of documents
 * when finding webhooks with the limit option.
 */
async function optionLimitFind() {
  try {
    // Create the options object with a limit of 2
    const options = { limit: 2 };

    // Find all webhooks
    const foundWebhooks = await WebhookController.find(adminUser, options);
    // Verify that no more than 2 webhooks were found
    chai.expect(foundWebhooks).to.have.lengthOf.at.most(2);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the Webhook Controller can return a second batch of documents when
 * finding documents using the 'limit' and 'skip' option.
 */
async function optionSkipFind() {
  try {
    // Create the first options object with just a limit
    const firstOptions = { limit: 2 };
    // Create the second options object with a limit and skip
    const secondOptions = { limit: 2, skip: 2 };

    // Find first 2 webhooks
    const foundWebhooks = await WebhookController.find(adminUser, firstOptions);
    // Verify that no more than 2 webhooks were found
    chai.expect(foundWebhooks).to.have.lengthOf.at.most(2);
    // Add webhook ids to the firstBatchIDs array
    const firstBatchIDs = foundWebhooks.map(w => w._id);

    // Find the next batch of webhooks
    const secondWebhooks = await WebhookController.find(adminUser, secondOptions);
    // Verify that no more than 2 webhooks were found
    chai.expect(secondWebhooks).to.have.lengthOf.at.most(2);
    // Verify the second batch of webhooks are not the same as the first
    const secondBatchIDs = secondWebhooks.map(w => w._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return find() results sorted.
 */
async function optionSortFind() {
  try {
    // Get data to create 3 webhooks
    const webhookData = [{
      name: 'a',
      type: testData.webhooks[0].type,
      triggers: testData.webhooks[0].triggers,
      url: testData.webhooks[0].url
    },
    {
      name: 'b',
      type: testData.webhooks[0].type,
      triggers: testData.webhooks[0].triggers,
      url: testData.webhooks[0].url
    },
    {
      name: 'c',
      type: testData.webhooks[0].type,
      triggers: testData.webhooks[0].triggers,
      url: testData.webhooks[0].url
    }];

    // Create sort options
    const sortOption = { sort: 'name' };
    const sortOptionReverse = { sort: '-name' };

    // Create the test webhooks
    const createdWebhooks = await WebhookController.create(adminUser, webhookData);
    // Store the ids to be deleted at the end of the tests
    webhookIDs.push(...createdWebhooks.map((w) => w._id));

    // Find the webhooks and return them sorted
    const foundWebhooks = await WebhookController.find(adminUser,
      createdWebhooks.map((w) => w._id), sortOption);
    // Expect to find all three webhooks
    chai.expect(foundWebhooks.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundWebhooks[0].name).to.equal('a');
    chai.expect(foundWebhooks[1].name).to.equal('b');
    chai.expect(foundWebhooks[2].name).to.equal('c');

    // Find the webhooks and return them sorted in reverse
    const reverseWebhooks = await WebhookController.find(adminUser,
      createdWebhooks.map((w) => w._id), sortOptionReverse);
    // Expect to find all three webhooks
    chai.expect(reverseWebhooks.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseWebhooks[0].name).to.equal('c');
    chai.expect(reverseWebhooks[1].name).to.equal('b');
    chai.expect(reverseWebhooks[2].name).to.equal('a');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the Webhook Controller can archive a webhook via update().
 */
async function archiveWebhook() {
  try {
    // Create the update object
    const webhookData = {
      id: webhookIDs[0],
      archived: true
    };

    // Update the webhook
    const updatedWebooks = await WebhookController.update(adminUser, webhookData);

    // Verify the array length is exactly 1
    chai.expect(updatedWebooks.length).to.equal(1);
    const webhook = updatedWebooks[0];

    // Expect archived to be true, and archivedOn and archivedBy to not be null
    chai.expect(webhook.archived).to.equal(true);
    chai.expect(webhook.archivedBy).to.equal(adminUser._id);
    chai.expect(webhook.archivedOn).to.not.equal(null);

    // un-archive the webhook for future use
    Webhook.updateOne({ _id: webhookData.id }, { archived: false });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can return populated fields in the return
 * object upon updating a webhook.
 */
async function optionPopulateUpdate() {
  try {
    // Get the valid populate fields
    const pop = Webhook.getValidPopulateFields();
    // Create the options object
    const options = { populate: pop };
    // Create the update object
    const webhookData = {
      id: webhookIDs[1],
      name: 'Update'
    };

    // Update the webhook
    const updatedWebhooks = await WebhookController.update(adminUser, webhookData, options);
    // Verify the array length is exactly 1
    chai.expect(updatedWebhooks.length).to.equal(1);
    const webhook = updatedWebhooks[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in webhook).to.equal(true);
      if (Array.isArray(webhook[field])) {
        webhook[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (webhook[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof webhook[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in webhook[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that option 'fields' returns a webhook with only
 * specific fields in update().
 */
async function optionFieldsUpdate() {
  try {
    // Create the update objects
    const webhookData = {
      id: webhookIDs[1],
      name: 'Fields Update'
    };
    // Create the options object with the list of fields specifically to find
    const findOptions = { fields: ['name', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT to find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Update the webhook only with specific fields returned
    const updatedWebhooks = await WebhookController.update(adminUser, webhookData, findOptions);
    // Expect there to be exactly 1 webhook updated
    chai.expect(updatedWebhooks.length).to.equal(1);
    const webhook = updatedWebhooks[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible webhook fields
    const visibleFields = Object.keys(webhook);

    // Check that the only keys in the webhook are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Update the webhook without the notFind fields
    const notFindWebhooks = await WebhookController.update(adminUser, webhookData, notFindOptions);
    // Expect there to be exactly 1 webhook updated
    chai.expect(notFindWebhooks.length).to.equal(1);
    const webhook2 = notFindWebhooks[0];

    // Create a list of visible webhook fields
    const visibleFields2 = Object.keys(webhook2);

    // Check that the keys in the notFindOptions are not in the webhook
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the Webhook Controller can delete a webhook on an org.
 */
async function deleteOnOrg() {
  try {
    const webhookID = webhookIDs[0];

    // Delete webhook via controller
    const deletedWebhooks = await WebhookController.remove(adminUser, webhookID);

    // Expect deletedWebhooks array to contain 1 webhook
    chai.expect(deletedWebhooks.length).to.equal(1);
    chai.expect(deletedWebhooks[0]).to.equal(webhookID);

    // Try to find the webhook
    const foundWebhooks = await WebhookController.find(adminUser, webhookID);

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
 * @description Validates that the Webhook Controller can delete a webhook on a project.
 */
async function deleteOnProject() {
  try {
    const webhookID = webhookIDs[1];

    // Delete webhook via controller
    const deletedWebhooks = await WebhookController.remove(adminUser, webhookID);

    // Expect deletedWebhooks array to contain 1 webhook
    chai.expect(deletedWebhooks.length).to.equal(1);
    chai.expect(deletedWebhooks[0]).to.equal(webhookID);

    // Try to find the webhook
    const foundWebhooks = await WebhookController.find(adminUser, webhookID);

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
 * @description Validates that the Webhook Controller can delete a webhook on a branch.
 */
async function deleteOnBranch() {
  try {
    const webhookID = webhookIDs[2];

    // Delete webhook via controller
    const deletedWebhooks = await WebhookController.remove(adminUser, webhookID);

    // Expect deletedWebhooks array to contain 1 webhook
    chai.expect(deletedWebhooks.length).to.equal(1);
    chai.expect(deletedWebhooks[0]).to.equal(webhookID);

    // Try to find the webhook
    const foundWebhooks = await WebhookController.find(adminUser, webhookID);

    // Expect nothing to be returned
    chai.expect(foundWebhooks.length).to.equal(0);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
