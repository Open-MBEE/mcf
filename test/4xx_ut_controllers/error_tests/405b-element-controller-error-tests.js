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
 * @author Connor Doyle
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
const Organization = M.require('models.organization');
const Project = M.require('models.project');
const Branch = M.require('models.branch');
const Element = M.require('models.element');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let nonAdminUser = null;
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
   * After: Create an admin user, organization, project, and elements.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();

      // Create test user
      nonAdminUser = await testUtils.createNonAdminUser();

      // Create organization
      org = await testUtils.createTestOrg(adminUser);

      // Create project
      proj = await testUtils.createTestProject(adminUser, org._id);

      projID = utils.parseID(proj._id).pop();
      branchID = testData.branches[0].id;

      const tag = await testUtils.createTag(adminUser, org._id, projID);
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
      await ElementController.create(adminUser, org._id, projID, branchID, elemDataObjects);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove organization, project and elements.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects and elements under organization will also be removed
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
  it('should reject an unauthorized attempt to find an element', unauthorizedTest('find'));
  // ------------- Create -------------
  it('should reject an unauthorized attempt to create an element', unauthorizedTest('create'));
  it('should reject creating elements on a tag.', createOnTag);
  it('should reject creating an element on an archived org', archivedTest(Organization, 'create'));
  it('should reject creating an element on an archived project', archivedTest(Project, 'create'));
  it('should reject creating an element on an archived branch', archivedTest(Branch, 'create'));
  it('should reject creating an element that already exists', createExisting);
  it('should reject creating an element with a nonexistent parent', notFoundTest('create', 'Parent'));
  it('should reject creating an element with a nonexistent source', notFoundTest('create', 'Source'));
  it('should reject creating an element with a nonexistent target', notFoundTest('create', 'Target'));
  // ------------- Update -------------
  it('should reject an unauthorized attempt to update an element', unauthorizedTest('update'));
  it('should reject an attempt to update an element on an archived org', archivedTest(Organization, 'update'));
  it('should reject an attempt to update an element on an archived project', archivedTest(Project, 'update'));
  it('should reject an attempt to update an element on an archived branch', archivedTest(Branch, 'update'));
  it('should reject an attempt to update an archived element', archivedTest(Element, 'update'));
  it('should reject an update setting the source of an element to itself', updateSourceToSelf);
  it('should reject an update setting the target of an element to itself', updateTargetToSelf);
  it('should reject an update if the parent cannot be found', notFoundTest('update', 'Parent'));
  it('should reject an update if the source cannot be found', notFoundTest('update', 'Source'));
  it('should reject an update if the target cannot be found', notFoundTest('update', 'Target'));
  it('should reject an update setting a source without a target', updateSourceWithNoTarget);
  it('should reject an update setting a target without a source', updateTargetWithNoSource);
  it('should reject updating elements on a tag', updateOnTag);
  // ------------- Replace ------------
  it('should reject an unauthorized attempt to replace an element', unauthorizedTest('createOrReplace'));
  it('should reject an attempt to replace an element on an archived org', archivedTest(Organization, 'createOrReplace'));
  it('should reject an attempt to replace an element on an archived project', archivedTest(Project, 'createOrReplace'));
  it('should reject an attempt to replace an element on an archived branch', archivedTest(Branch, 'createOrReplace'));
  it('should reject an attempt to replace an element with an invalid id', putInvalidId);
  it('should reject an attempt to replace an element without an id', putWithoutId);
  // ------------- Remove -------------
  it('should reject an unauthorized attempt to delete an element', unauthorizedTest('remove'));
  it('should reject an attempt to delete an element on an archived org', archivedTest(Organization, 'remove'));
  it('should reject an attempt to delete an element on an archived project', archivedTest(Project, 'remove'));
  it('should reject an attempt to delete an element on an archived branch', archivedTest(Branch, 'remove'));
  it('should reject deleting elements on a tag', deleteOnTag);
  // ------------- Search -------------
  it('should reject an unauthorized attempt to search an element', unauthorizedTest('search'));
  it('should reject an attempt to search an element on an archived org', archivedTest(Organization, 'search'));
  it('should reject an attempt to search an element on an archived project', archivedTest(Project, 'search'));
  it('should reject an attempt to search an element on an archived branch', archivedTest(Branch, 'search'));
});

/* --------------------( Tests )-------------------- */
/**
 * @description A function that dynamically generates a test function for different unauthorized
 * cases.
 *
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function unauthorizedTest(operation) {
  return async function() {
    let elemData = testData.elements[0];
    let op = operation;
    const id = org._id;
    const level = 'org';

    switch (operation) {
      case 'find':
        elemData = elemData.id;
        break;
      case 'create':
        break;
      case 'update':
        elemData = {
          id: elemData.id,
          description: 'update'
        };
        break;
      case 'createOrReplace':
        op = 'update';
        break;
      case 'remove':
        elemData = elemData.id;
        op = 'delete'; // Changing this because permissions errors say "delete" instead of "remove"
        break;
      case 'search':
        op = 'find';
        break;
      default:
        throw new Error('Invalid input to unauthorizedTest function');
    }

    try {
      // Attempt to perform the unauthorized operation
      await ElementController[operation](nonAdminUser, org._id, projID, branchID, elemData)
      .should.eventually.be.rejectedWith(`User does not have permission to ${op} items in the ${level} [${id}]`);
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
 * @param {Model} model - The model to use for the test.
 * @param {string} operation - The type of operation for the test: create, update, etc.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function archivedTest(model, operation) {
  return async function() {
    let elemData = testData.elements[1];
    let id;
    let name;

    switch (model) {
      case Organization:
        // Set id to org id
        id = org._id;
        name = 'Organization';
        break;
      case Project:
        // Set id to project id
        id = utils.createID(org._id, projID);
        name = 'Project';
        break;
      case Branch:
        // Set id to branch id
        id = utils.createID(org._id, projID, branchID);
        name = 'Branch';
        break;
      case Element:
        // Set id to element id
        id = utils.createID(org._id, projID, branchID, elemData.id);
        name = 'Element';
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    switch (operation) {
      case 'update':
        elemData = {
          id: elemData.id,
          documentation: 'update'
        };
        break;
      case 'find':
      case 'remove':
        elemData = elemData.id;
        break;
      // No alteration needed for these endpoints
      case 'create':
        break;
      case 'createOrReplace':
        break;
      case 'search':
        break;
      default:
        throw new Error('Invalid input to archivedTest function');
    }

    try {
      // Archive the object of interest
      await model.updateOne({ _id: id }, { archived: true });

      await ElementController[operation](adminUser, org._id, projID, branchID, elemData)
      .should.eventually.be.rejectedWith(`The ${name} [${utils.parseID(id).pop()}] is archived. `
        + 'It must first be unarchived before performing this operation.');
    }
    catch (error) {
      M.log.error(error);
      should.not.exist(error);
    }
    finally {
      // un-archive the model
      await model.updateOne({ _id: id }, { archived: false });
    }
  };
}

/**
 * @description Verifies that an element cannot be created if an element already exists with the
 * same id.
 */
async function createExisting() {
  try {
    const elemData = testData.elements[1];

    // Attempt to create an element; this element was already created in the before() function
    await ElementController.create(adminUser, org._id, projID, branchID, elemData)
    .should.eventually.be.rejectedWith('Elements with the following IDs already exist '
      + `[${elemData.id}].`);
  }
  catch (error) {
    M.log.warn(error);
    should.not.exist(error);
  }
}

/**
 * @description A factory function that generates test functions for mocha to check different
 * points of failure for creating an element: parent element not found, source element not
 * found, and target element not found.
 *
 * @param {string} operation - The controller operation to test: create, update, etc.
 * @param {string} reference - Specifies whether to test element creation with a nonexistent
 * parent, source, or target.
 *
 * @returns {Function} Returns a function to be used as a test.
 */
function notFoundTest(operation, reference) {
  return async function() {
    const elemData = {
      id: (operation === 'create') ? testData.elements[0].id : testData.elements[1].id,
      source: testData.elements[5].source,
      target: testData.elements[5].target
    };
    const fakeID = 'thiselementshouldntexist';

    elemData[reference.toLowerCase()] = fakeID;

    try {
      if (operation === 'create' || reference === 'Parent') {
        await ElementController[operation](adminUser, org._id, projID, branchID, elemData)
        .should.eventually.be.rejectedWith(`${reference} element [${fakeID}] not found.`);
      }
      else {
        await ElementController[operation](adminUser, org._id, projID, branchID, elemData)
        .should.eventually.be.rejectedWith(`The ${reference.toLowerCase()} element [${fakeID}] was `
          + `not found in the project [${projID}].`);
      }
    }
    catch (error) {
      // Remove the element if it actually was created
      if (operation === 'create' && error.message.includes('fulfilled')) {
        ElementController.remove(adminUser, org._id, projID, branchID, elemData.id);
      }
      M.log.warn(error);
      should.not.exist(error);
    }
  };
}

/**
 * @description Verifies that an element's source cannot be updated to its own id.
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
 * @description Verifies that an element's target cannot be updated to its own id.
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
async function createOnTag() {
  const elementObj = testData.elements[0];

  // Attempt to create an element; should be rejected with specific error message
  await ElementController.create(adminUser, org._id, projID, tagID, elementObj)
  .should.eventually.be.rejectedWith(`[${tagID}] is a tag and does`
    + ' not allow elements to be created, updated, or deleted.');
}

/**
 * @description Verifies that the tag can not update elements.
 */
async function updateOnTag() {
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
async function deleteOnTag() {
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
