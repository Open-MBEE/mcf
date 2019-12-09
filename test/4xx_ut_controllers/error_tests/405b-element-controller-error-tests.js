/**
 * @classification UNCLASSIFIED
 *
 * @module test.405b-element-controller-error-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Phillip Lee
 *
 * @description This tests for expected errors within the element controller.
 */

// NPM modules
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

// Use async chai
chai.use(chaiAsPromised);
// Initialize chai should function, used for expecting promise rejections
const should = chai.should(); // eslint-disable-line no-unused-vars

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const db = M.require('db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;
let branchID = null;
let tagID = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: Connect to database. Create an admin user, organization, project,
   * and elements.
   */
  before((done) => {
    // Open the database connection
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;

      // Create organization
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      // Set global organization
      org = retOrg;

      // Create project
      return testUtils.createTestProject(adminUser, org._id);
    })
    .then((retProj) => {
      // Set global project
      proj = retProj;
      projID = utils.parseID(proj._id).pop();
      branchID = testData.branches[0].id;

      return testUtils.createTag(adminUser, org._id, projID);
    })
    .then((tag) => {
      tagID = utils.parseID(tag._id).pop();

      const elemDataObjects = [
        testData.elements[1],
        testData.elements[2],
        testData.elements[3],
        testData.elements[4],
        testData.elements[5],
        testData.elements[6],
        testData.elements[7],
        testData.elements[8]
      ];
      return ElementController.create(adminUser, org._id, projID, branchID, elemDataObjects);
    })
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Remove organization, project and elements.
   * Close database connection.
   */
  after((done) => {
    // Remove organization
    // Note: Projects and elements under organization will also be removed
    testUtils.removeTestOrg()
    .then(() => testUtils.removeTestAdmin())
    .then(() => db.disconnect())
    .then(() => done())
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /* Execute the tests */
  // -------------- Find --------------
  // ------------- Create -------------
  it('should reject creating elements to a tag '
    + 'saying elements cannot be created.', createInTag);
  // ------------- Update -------------
  it('should reject an update saying a source cannot be set to self', updateSourceToSelf);
  it('should reject an update saying a target cannot be set to self', updateTargetToSelf);
  it('should reject an update saying a source cannot be found', updateNonExistentSource);
  it('should reject an update saying a target cannot be found', updateNonExistentTarget);
  it('should reject an update saying a target is required when'
    + ' updating a source', updateSourceWithNoTarget);
  it('should reject an update saying a source is required when'
    + ' updating a target', updateTargetWithNoSource);
  it('should reject updating elements to a tag '
    + 'saying elements cannot be update.', updateInTag);
  // ------------- Replace ------------
  it('should reject put elements with invalid id', putInvalidId);
  it('should reject put elements without id', putWithoutId);
  // ------------- Remove -------------
  it('should reject deleting elements in a tag '
    + 'saying elements cannot be deleted.', deleteInTag);
  // ------------- Search -------------
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that an elements source cannot be updated to its own
 * id.
 */
async function updateSourceToSelf() {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: elemDataObject.id
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('Element\'s source cannot be self'
    + ` [${elemDataObject.id}].`);
}

/**
 * @description Verifies that an element's target cannot be updated to its own
 * id.
 */
async function updateTargetToSelf() {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: elemDataObject.id
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('Element\'s target cannot be self'
    + ` [${elemDataObject.id}].`);
}

/**
 * @description Verifies that an element's source cannot be updated when the
 * desired source does not exist.
 */
async function updateNonExistentSource() {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: 'NonExistentElement'
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('The source element '
    + `[NonExistentElement] was not found in the project [${projID}].`);
}

/**
 * @description Verifies that an element's target cannot be updated when the
 * desired target does not exist.
 */
async function updateNonExistentTarget() {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: 'NonExistentElement'
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('The target element '
    + `[NonExistentElement] was not found in the project [${projID}].`);
}

/**
 * @description Verifies that an element's source cannot be updated when the
 * target is not currently set, and is also not being set.
 */
async function updateSourceWithNoTarget() {
  const elemDataObject = testData.elements[4];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: testData.elements[6].id
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('If source element is provided, target'
    + ' element is required.');
}

/**
 * @description Verifies that an element's target cannot be updated when the
 * source is not currently set, and is also not being set.
 */
async function updateTargetWithNoSource() {
  const elemDataObject = testData.elements[4];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: testData.elements[6].id
  };

  // Attempt to update the element; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, branchID, update)
  .should.eventually.be.rejectedWith('If target element is provided, source'
      + ' element is required.');
}

/**
 * @description Verifies that the tag can not create elements.
 */
async function createInTag() {
  const elementObj = testData.elements[0];

  // Attempt to create an element; should be rejected with specific error message
  await ElementController.create(adminUser, org._id, projID, tagID, elementObj)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and does`
    + ' not allow elements to be created, updated, or deleted.');
}

/**
 * @description Verifies that the tag can not update elements.
 */
async function updateInTag() {
  // Create the object to update element
  const updateObj = {
    name: 'model_edit',
    id: 'model'
  };


  // Update element via controller; should be rejected with specific error message
  await ElementController.update(adminUser, org._id, projID, tagID, updateObj)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and `
    + 'does not allow elements to be created, updated, or deleted.');
}

/**
 * @description Verifies that the tag can not delete elements.
 */
async function deleteInTag() {
  // Attempt deleting an element via controller; should be rejected with specific error message
  await ElementController.remove(adminUser, org._id, projID, tagID, testData.elements[1].id)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and`
    + ' does not allow elements to be created, updated, or deleted.');
}

/**
 * @description Verifies invalid Id PUT call does not delete existing elements.
 */
async function putInvalidId() {
  if (M.config.validators && M.config.validators.hasOwnProperty('element_id')) {
    M.log.verbose('Skipping valid element project test due to an existing custom'
      + ' validator.');
    this.skip();
  }
  // Create the test element objects
  const testElemObj0 = testData.elements[7];
  const testElemObj1 = testData.elements[8];
  const invalidElemObj = { id: '!!', name: 'element name' };

  await ElementController.createOrReplace(adminUser, org._id, projID, branchID,
    [testElemObj0, testElemObj1, invalidElemObj])
  .should.eventually.be.rejectedWith('Element validation failed: _id: '
    + `Invalid element ID [${invalidElemObj.id}].`);

  let foundElements;
  try {
    // Expected error, find valid elements
    foundElements = await ElementController.find(adminUser, org._id, projID, branchID,
      [testElemObj0.id, testElemObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 elements
  foundElements.length.should.equal(2);
}

/**
 * @description Verifies PUT call without Id does not delete existing elements.
 * Note: This test should fail prior to deletion of existing elements.
 */
async function putWithoutId() {
  // Create the test elements
  const testElemObj0 = testData.elements[7];
  const testElemObj1 = testData.elements[8];
  const invalidElemObj = { name: 'missing id' };

  // Try to put elements; should be rejected with specific error message
  await ElementController.createOrReplace(adminUser, org._id, projID, branchID,
    [testElemObj0, testElemObj1, invalidElemObj])
  .should.eventually.be.rejectedWith('Element #3 does not have an id.');

  let foundElems;
  try {
    // Expected error, find valid elements
    foundElems = await ElementController.find(adminUser,
      org._id, projID, branchID, [testElemObj0.id, testElemObj1.id]);
  }
  catch (error) {
    M.log.error(error);
    // There should be no error
    should.not.exist(error);
  }
  // Expect to find 2 elements
  foundElems.length.should.equal(2);
}
