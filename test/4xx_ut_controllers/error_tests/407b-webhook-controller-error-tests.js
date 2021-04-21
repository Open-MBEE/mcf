/**
 * @classification UNCLASSIFIED
 *
 * @module test.407b-webhook-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
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
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const WebhookController = M.require('controllers.webhook-controller');
const Webhook = M.require('models.webhook');
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const Branch = M.require('models.branch');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser;
let nonAdminUser;
let org;
let project;
let projID;
const branchID = 'master';
let webhookID;
let incomingWebhookID;
let webhookIDs;
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
   * Before: runs before all tests. Creates an admin user, a non admin
   * user, an org, a project, and several test webhooks.
   */
  before(async () => {
    try {
      adminUser = await testUtils.createTestAdmin();
      nonAdminUser = await testUtils.createNonAdminUser();
      org = await testUtils.createTestOrg(adminUser);
      project = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(project._id).pop();

      const webhookData = testData.webhooks;

      // Server webhooks
      const outgoingWebhooks = await WebhookController.create(adminUser, webhookData[0]);
      webhookID = outgoingWebhooks[0]._id;
      const incomingWebhooks = await WebhookController.create(adminUser, webhookData[1]);
      incomingWebhookID = incomingWebhooks[0]._id;
      webhookIDs = [webhookID, incomingWebhookID];

      // Org webhooks
      webhookData[0].reference = { org: org._id };
      let webhooks = await WebhookController.create(adminUser, webhookData[0]);
      orgWebhooks.push(webhooks[0]);
      webhookData[1].reference = { org: org._id };
      webhooks = await WebhookController.create(adminUser, webhookData[1]);
      orgWebhooks.push(webhooks[0]);

      // Project webhooks
      webhookData[0].reference.project = projID;
      webhooks = await WebhookController.create(adminUser, webhookData[0]);
      projWebhooks.push(webhooks[0]);
      webhookData[1].reference.project = projID;
      webhooks = await WebhookController.create(adminUser, webhookData[1]);
      projWebhooks.push(webhooks[0]);

      // Branch webhooks
      webhookData[0].reference.branch = branchID;
      webhooks = await WebhookController.create(adminUser, webhookData[0]);
      branchWebhooks.push(webhooks[0]);
      webhookData[0].reference.branch = branchID;
      webhooks = await WebhookController.create(adminUser, webhookData[1]);
      branchWebhooks.push(webhooks[0]);

      // Enumerate all the webhook ids into a single array
      webhookIDs.push(...orgWebhooks.map((w) => w._id),
        ...projWebhooks.map((w) => w._id), ...branchWebhooks.map((w) => w._id));
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: runs after all tests. Removes any remaining test webhooks, abd removes the test org
   * and users.
   */
  after(async () => {
    try {
      await Webhook.deleteMany({ _id: { $in: webhookIDs } });
      await testUtils.removeTestOrg();
      await testUtils.removeNonAdminUser();
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should reject an attempt to find a webhook by an unauthorized user at the server level', unauthorizedTest('server', 'find'));
  it('should reject an attempt to find a webhook by an unauthorized user at the org level', unauthorizedTest('org', 'find'));
  it('should reject an attempt to find a webhook by an unauthorized user at the project level', unauthorizedTest('project', 'find'));
  it('should reject an attempt to find a webhook by an unauthorized user at the branch level', unauthorizedTest('branch', 'find'));
  // ------------- Create -------------
  it('should reject creating a webhook on an archived org', archivedTest(Organization, 'create'));
  it('should reject creating a webhook on an archived project', archivedTest(Project, 'create'));
  it('should reject creating a webhook on an archived branch', archivedTest(Branch, 'create'));
  it('should reject an attempt to create a webhook by an unauthorized user at the server level', unauthorizedTest('server', 'create'));
  it('should reject an attempt to create a webhook by an unauthorized user at the org level', unauthorizedTest('org', 'create'));
  it('should reject an attempt to create a webhook by an unauthorized user at the project level', unauthorizedTest('project', 'create'));
  it('should reject an attempt to create a webhook by an unauthorized user at the branch level', unauthorizedTest('branch', 'create'));
  it('should reject an attempt to create a webhook with an invalid key', createInvalidKey);
  it('should reject an attempt to create a webhook with a null value', createNull);
  it('should reject an attempt to create a webhook with a boolean value', createBoolean);
  it('should reject an attempt to create a webhook with a string value', createString);
  it('should reject an attempt to create a webhook with an array that does not contain objects', createInvalidArray);
  it('should reject an attempt to create a webhook with an undefined value', createUndefined);
  // ------------- Update -------------
  it('should reject an update to a webhook on an archived org', archivedTest(Organization, 'update'));
  it('should reject an update to a webhook on an archived project', archivedTest(Project, 'update'));
  it('should reject an update to a webhook on an archived branch', archivedTest(Branch, 'update'));
  it('should reject an update to an archived webhook', archivedTest(Webhook, 'update'));
  it('should reject an update from an unauthorized user at the server level', unauthorizedTest('server', 'update'));
  it('should reject an update from an unauthorized user at the org level', unauthorizedTest('org', 'update'));
  it('should reject an update from an unauthorized user at the project level', unauthorizedTest('project', 'update'));
  it('should reject an update from an unauthorized user at the branch level', unauthorizedTest('branch', 'update'));
  it('should reject an update missing an id', updateMissingID);
  it('should reject an attempt to change a webhook\'s type', updateType);
  it('should reject an attempt to change a webhook\'s reference id', updateReference);
  it('should reject an update array with duplicate _ids', updateDuplicate);
  it('should reject an attempt to update a webhook that doesn\'t exist', updateNotFound);
  it('should reject an attempt to remove the token from the incoming field', updateInvalidToken);
  it('should reject an attempt to remove the tokenLocation from the incoming field', updateInvalidTokenLocation);
  it('should reject an attempt to add a tokenLocation to an outgoing webhook', updateAddTokenLocation);
  // ------------- Remove -------------
  it('should reject an attempt to delete a webhook that doesn\'t exist', deleteNotFound);
  it('should reject an attempt to delete a webhook on an archived org', archivedTest(Organization, 'remove'));
  it('should reject an attempt to delete a webhook on an archived project', archivedTest(Project, 'remove'));
  it('should reject an attempt to delete a webhook on an archived branch', archivedTest(Branch, 'remove'));
  it('should reject an attempt to delete a webhook by an unauthorized user at the server level', unauthorizedTest('server', 'remove'));
  it('should reject an attempt to delete a webhook by an unauthorized user at the org level', unauthorizedTest('org', 'remove'));
  it('should reject an attempt to delete a webhook by an unauthorized user at the project level', unauthorizedTest('project', 'remove'));
  it('should reject an attempt to delete a webhook by an unauthorized user at the branch level', unauthorizedTest('branch', 'remove'));
});

/* --------------------( Tests )-------------------- */
/**
 * @description A function that dynamically generates a test function for different unauthorized
 * cases.
 *
 * @param {string} level - The level at which to test the authorization of the user: server, org,
 * project, or branch.
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function unauthorizedTest(level, operation) {
  return async function() {
    let webhookData = testData.webhooks[0];
    webhookData.id = webhookID;
    webhookData.reference = {};
    let id;
    let op = operation;

    // Set up org, project, and branch id variables
    switch (level) {
      case 'org':
        // Set id to org id
        id = org._id;
        webhookData.id = orgWebhooks[0]._id;
        // Set the reference namespace
        if (typeof webhookData === 'object') {
          webhookData.reference = {
            org: org._id
          };
        }
        break;
      case 'project':
        // Set id to project id
        id = projID;
        webhookData.id = projWebhooks[0]._id;
        // Set the reference namespace
        if (typeof webhookData === 'object') {
          webhookData.reference = {
            org: org._id,
            project: projID
          };
        }
        break;
      case 'branch':
        // The error message for branch will be also refer to the project
        // Set id to project id
        id = projID;
        webhookData.id = branchWebhooks[0]._id;
        // Set the reference namespace
        if (typeof webhookData === 'object') {
          webhookData.reference = {
            org: org._id,
            project: projID,
            branch: branchID
          };
        }
        // eslint-disable-next-line no-param-reassign
        level = 'project';
        break;
      case 'server':
        break;
      default:
        throw new Error('Invalid input to unauthorizedTest function');
    }

    switch (operation) {
      case 'find':
        webhookData = webhookData.id;
        op = 'read';  // Changing this because permissions errors say "read" instead of "find"
        break;
      case 'create':
        delete webhookData.id;
        break;
      case 'update':
        webhookData = {
          id: webhookData.id,
          description: 'update'
        };
        break;
      case 'remove':
        webhookData = webhookData.id;
        op = 'delete'; // Changing this because permissions errors say "delete" instead of "remove"
        break;
      default:
        throw new Error('Invalid input to unauthorizedTest function');
    }

    try {
      // There will be a different error message for the server level
      if (level === 'server') {
        // Attempt to perform unauthorized operation
        await WebhookController[operation](nonAdminUser, webhookData)
        .should.eventually.be.rejectedWith(`User does not have permission to ${op} server level `
        + 'webhooks.');
      }
      else {
        // Attempt to perform the unauthorized operation
        await WebhookController[operation](nonAdminUser, webhookData)
        .should.eventually.be.rejectedWith(`User does not have permission to ${op} webhooks on the `
        + `${level} [${id}].`);
      }
    }
    catch (error) {
      M.log.error(error);
      should.not.exist(error);
    }
  };
}

/**
 * @description A function that dynamically generates a test function for different archived cases.
 *
 * @param {object} model - The model to use for the test.
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function archivedTest(model, operation) {
  return async function() {
    let webhookData = testData.webhooks[0];
    let id;
    let name;

    switch (model) {
      case Organization:
        // Set id to org id
        id = org._id;
        webhookData.id = orgWebhooks[0]._id;
        // Set the reference namespace
        webhookData.reference = {
          org: org._id
        };
        name = 'Organization';
        break;
      case Project:
        // Set id to project id
        id = utils.createID(org._id, projID);
        webhookData.id = projWebhooks[0]._id;
        // Set the reference namespace
        webhookData.reference = {
          org: org._id,
          project: projID
        };
        name = 'Project';
        break;
      case Branch:
        // Set id to branch id
        id = utils.createID(org._id, projID, branchID);
        webhookData.id = branchWebhooks[0]._id;
        // Set the reference namespace
        webhookData.reference = {
          org: org._id,
          project: projID,
          branch: branchID
        };
        name = 'Branch';
        break;
      case Webhook:
        // Set id to webhook id
        id = webhookID;
        webhookData.id = webhookID;
        name = 'Webhook';
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    switch (operation) {
      case 'find':
        webhookData = webhookData.id;
        break;
      case 'create':
        delete webhookData.id;
        break;
      case 'update':
        webhookData = {
          id: webhookData.id,
          description: 'update'
        };
        break;
      case 'remove':
        webhookData = webhookData.id;
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    // Archive the object of interest
    await model.updateOne({ _id: id }, { archived: true });

    await WebhookController[operation](adminUser, webhookData)
    .should.eventually.be.rejectedWith(`The ${name} [${utils.parseID(id).pop()}] is archived. `
      + 'It must first be unarchived before performing this operation.');

    // un-archive the object of interest
    await model.updateOne({ _id: id }, { archived: false });
  };
}


/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * an invalid key.
 */
async function createInvalidKey() {
  try {
    // Get data for an outgoing webhook
    const webhookData = testData.webhooks[0];
    delete webhookData.reference;

    webhookData.wrong_key = 'invalid';

    await WebhookController.create(adminUser, webhookData)
    .should.eventually.be.rejectedWith('Invalid key: [wrong_key]');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * invalid webhook data.
 */
async function createNull() {
  try {
    // Create invalid webhook data
    const webhookData = null;

    await WebhookController.create(nonAdminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhooks parameter cannot be null.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * invalid webhook data.
 */
async function createBoolean() {
  try {
    // Create invalid webhook data
    const webhookData = true;

    await WebhookController.create(nonAdminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhooks parameter cannot be of type boolean.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * invalid webhook data.
 */
async function createString() {
  try {
    // Create invalid webhook data
    const webhookData = 'webhook';

    await WebhookController.create(nonAdminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhooks parameter cannot be of type string.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * invalid webhook data.
 */
async function createInvalidArray() {
  try {
    // Create invalid webhook data
    const webhookData = [true, true];

    await WebhookController.create(nonAdminUser, webhookData)
    .should.eventually.be.rejectedWith('Not every item in Webhooks is an object.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the Webhook Controller will deny a request to create a webhook with
 * invalid webhook data.
 */
async function createUndefined() {
  try {
    // Create invalid webhook data
    const webhookData = undefined;

    await WebhookController.create(nonAdminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhooks parameter cannot be of type undefined.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update that is missing
 * an id.
 */
async function updateMissingID() {
  try {
    // Create update missing an id
    const webhookData = {
      description: 'update'
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith('One or more webhook updates does not have an id.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to a webhook's type.
 */
async function updateType() {
  try {
    // Create update for an outgoing webhook
    const webhookData = {
      id: webhookID,
      type: 'update'
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhook property [type] cannot be changed.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to a webhook's
 * reference.
 */
async function updateReference() {
  try {
    // Create update for an outgoing webhook
    const webhookData = {
      id: webhookID,
      reference: 'wrong'
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith('Webhook property [reference] cannot be changed.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an array of updates containing
 * duplicate ids.
 */
async function updateDuplicate() {
  try {
    // Create updates for an outgoing webhook
    const webhookData = [{
      id: webhookID,
      description: 'update'
    }, {
      id: webhookID,
      description: 'update'
    }];

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith('Duplicate ids found in update array: '
      + `${webhookID}`);
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to a webhook that was
 * not found.
 */
async function updateNotFound() {
  try {
    // Create update for an outgoing webhook
    const webhookData = {
      id: 'webhookID',
      description: 'update'
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith(`The following webhooks were not found: [${webhookData.id}]`);
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to an incoming
 * webhook attempting to set the token to null.
 */
async function updateInvalidToken() {
  try {
    // Create update for an incoming webhook
    const webhookData = {
      id: incomingWebhookID,
      description: 'null',
      token: null
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith(`Webhook ${incomingWebhookID} validation failed: `
        + 'Invalid token: [null]');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to an incoming
 * webhook attempting to set the tokenLocation to null.
 */
async function updateInvalidTokenLocation() {
  try {
    // Create update for an incoming webhook
    const webhookData = {
      id: incomingWebhookID,
      tokenLocation: null
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith(`Webhook ${incomingWebhookID} validation failed: `
      + 'Invalid tokenLocation: [null]');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject an update to an outgoing
 * webhook attempting to add a token.
 */
async function updateAddTokenLocation() {
  try {
    // Create update for an outgoing webhook
    const webhookData = {
      id: webhookID,
      tokenLocation: 'test'
    };

    await WebhookController.update(adminUser, webhookData)
    .should.eventually.be.rejectedWith(`Webhook ${webhookID} validation failed: `
      + 'An outgoing webhook cannot have a tokenLocation.');
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}

/**
 * @description Validates that the webhook controller will reject a request to delete a webhook
 * that doesn't exist.
 */
async function deleteNotFound() {
  try {
    // Create a fake id for a webhook
    const webhookData = 'not a webhook id';

    await WebhookController.remove(adminUser, webhookData)
    .should.eventually.be.rejectedWith(`The following webhooks were not found: [${webhookData}]`);
  }
  catch (error) {
    M.log.error(error);
    should.not.exist(error);
  }
}
