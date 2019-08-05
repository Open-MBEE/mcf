/**
* Classification: UNCLASSIFIED
*
* @module test.405b-element-controller-error-tests
*
* @copyright Copyright (C) 2019, Lockheed Martin Corporation
*
* @license MIT
*
* @description This tests for expected errors within the element controller.
*/

// NPM modules
const chai = require('chai');

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const db = M.require('lib.db');
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
      return testUtils.createTestProject(adminUser, org.id);
    })
    .then((retProj) => {
      // Set global project
      proj = retProj;
      projID = utils.parseID(proj.id).pop();
      branchID = testData.branches[0].id;

      return testUtils.createTag(adminUser, org.id, projID);
    })
    .then((tag) => {
      tagID = utils.parseID(tag.id).pop();

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
      return ElementController.create(adminUser, org.id, projID, branchID, elemDataObjects);
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
    testUtils.removeTestOrg(adminUser)
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
  it('should reject an update saying a source cannot be set to self', updateSourceToSelf);
  it('should reject an update saying a target cannot be set to self', updateTargetToSelf);
  it('should reject an update saying a source cannot be found', updateNonExistentSource);
  it('should reject an update saying a target cannot be found', updateNonExistentTarget);
  it('should reject an update saying a target is required when'
    + ' updating a source', updateSourceWithNoTarget);
  it('should reject an update saying a source is required when'
    + ' updating a target', updateTargetWithNoSource);
  it('should reject creating elements to a tag '
    + 'saying elements cannot be created.', createInTag);
  it('should reject updating elements to a tag '
    + 'saying elements cannot be update.', updateInTag);
  it('should reject deleting elements in a tag '
    + 'saying elements cannot be deleted.', deleteInTag);
  it('should reject put elements with invalid id', putInvalidId);
  it('should reject put elements without id', putWithoutId);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that an elements source cannot be updated to its own
 * id.
 */
function updateSourceToSelf(done) {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: elemDataObject.id
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('Element\'s source cannot be self'
      + ` [${elemDataObject.id}].`);
    done();
  });
}

/**
 * @description Verifies that an elements target cannot be updated to its own
 * id.
 */
function updateTargetToSelf(done) {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: elemDataObject.id
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('Element\'s target cannot be self'
      + ` [${elemDataObject.id}].`);
    done();
  });
}

/**
 * @description Verifies that an elements source cannot be updated to when the
 * desired source does not exist.
 */
function updateNonExistentSource(done) {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: 'NonExistentElement'
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('The source element '
      + '[NonExistentElement] was not found in the project [project00].');
    done();
  });
}

/**
 * @description Verifies that an elements target cannot be updated to when the
 * desired target does not exist.
 */
function updateNonExistentTarget(done) {
  const elemDataObject = testData.elements[6];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: 'NonExistentElement'
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('The target element '
      + '[NonExistentElement] was not found in the project [project00].');
    done();
  });
}

/**
 * @description Verifies that an elements source cannot be updated to when the
 * target is not currently set, and is also not being set.
 */
function updateSourceWithNoTarget(done) {
  const elemDataObject = testData.elements[4];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    source: testData.elements[6].id
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('If source element is provided, target'
      + ' element is required.');
    done();
  });
}

/**
 * @description Verifies that an elements target cannot be updated to when the
 * source is not currently set, and is also not being set.
 */
function updateTargetWithNoSource(done) {
  const elemDataObject = testData.elements[4];

  // Set source to self
  const update = {
    id: elemDataObject.id,
    target: testData.elements[6].id
  };

  // Attempt to update the element
  ElementController.update(adminUser, org.id, projID, branchID, update)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element updated successfully.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal('If target element is provided, source'
      + ' element is required.');
    done();
  });
}

/**
 * @description Verifies that the tag can not create
 * elements.
 */
function createInTag(done) {
  const elementObj = testData.elements[0];

  // Attempt to create an element
  ElementController.create(adminUser, org.id, projID, tagID, elementObj)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element was successfully created.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal(`[${tagID}] is a tag and does`
      + ' not allow elements to be created.');
    done();
  });
}

/**
 * @description Verifies that the tag can not update
 * elements.
 */
function updateInTag(done) {
  // Create the object to update element
  const updateObj = {
    name: 'model_edit',
    id: 'model'
  };


  // Update element via controller
  ElementController.update(adminUser, org.id, projID, tagID, updateObj)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element was successfully updated.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal(`[${tagID}] is a tag and `
      + 'does not allow elements to be updated.');
    done();
  });
}

/**
 * @description Verifies that the tag can not delete
 * elements.
 */
function deleteInTag(done) {
  // Attempt deleting an element via controller
  ElementController.remove(adminUser, org.id, projID, tagID, testData.elements[1].id)
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element was successfully deleted.'));
  })
  .catch((error) => {
    // Ensure error message is correct
    chai.expect(error.message).to.equal(`[${tagID}] is a tag and`
      + ' does not allow elements to be deleted.');
    done();
  });
}

/**
 * @description Verifies invalid Id PUT call does not delete existing elements.
 */
function putInvalidId(done) {
  // Create the test element objects
  const testElemObj0 = testData.elements[7];
  const testElemObj1 = testData.elements[8];
  const invalidProjObj = { id: 'INVALID_ID', name: 'element name' };

  ElementController.createOrReplace(adminUser, org.id, projID, branchID,
    [testElemObj0, testElemObj1, invalidProjObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element put successfully.'));
  })
  .catch((error) => {
    // Verify the error message
    chai.expect(error.message).to.equal('Element validation failed: _id: '
      + 'Path `_id` is invalid (testorg00:project00:master:INVALID_ID).');

    // Expected error, find valid elements
    return ElementController.find(adminUser, org.id, projID, branchID,
      [testElemObj0.id, testElemObj1.id]);
  })
  .then((foundElements) => {
    // Expect to find 2 elements
    chai.expect(foundElements.length).to.equal(2);
    done();
  })
  .catch((error) => {
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Verifies PUT call without Id does not delete existing elements.
 * Note: This test should fail prior to deletion of existing elements.
 */
function putWithoutId(done) {
  // Create the test elements
  const testElemObj0 = testData.elements[7];
  const testElemObj1 = testData.elements[8];
  const invalidElemObj = { name: 'missing id' };

  ElementController.createOrReplace(adminUser, org.id, projID, branchID,
    [testElemObj0, testElemObj1, invalidElemObj])
  .then(() => {
    // Should not succeed, force to fail
    done(new Error('Element put successfully.'));
  })
  .catch((error) => {
    // Expected error, find valid elements
    ElementController.find(adminUser, org.id, projID, branchID, [testElemObj0.id, testElemObj1.id])
    .then((foundElems) => {
      // Verify the error message
      chai.expect(error.message).to.equal('Element #3 does not have an id.');

      // Expect to find 2 elements
      chai.expect(foundElems.length).to.equal(2);
      done();
    })
    .catch((err) => {
      chai.expect(err.message).to.equal(null);
      done();
    });
  });
}
