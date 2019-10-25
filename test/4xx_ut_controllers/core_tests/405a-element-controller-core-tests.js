/**
 * @classification UNCLASSIFIED
 *
 * @module test.405a-element-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Connor Doyle
 *
 * @description This tests the Element Controller functionality.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;
let branchID = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: Connect to database. Create an admin user, organization, and project.
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
      done();
    })
    .catch((error) => {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
      done();
    });
  });

  /**
   * After: Remove Organization and project.
   * Close database connection.
   */
  after((done) => {
    // Remove organization
    // Note: Projects under organization will also be removed
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
  // ------------- Create -------------
  it('should create an element', createElement);
  it('should create multiple elements', createElements);
  // -------------- Find --------------
  it('should find an element', findElement);
  it('should find multiple elements', findElements);
  it('should find all elements', findAllElements);
  // ------------- Update -------------
  it('should update an element', updateElement);
  it('should update multiple elements', updateElements);
  // ------------- Replace ------------
  it('should create or replace an element', createOrReplaceElement);
  it('should create or replace multiple elements', createOrReplaceElements);
  // ------------- Search -------------
  it('should find an element through text search', searchElement);
  // ------------- Remove -------------
  it('should delete an element', deleteElement);
  it('should delete multiple elements', deleteElements);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the Element Controller can create an element.
 *
 * @param {Function} done - The Mocha callback.
 */
function createElement(done) {
  const elemData = testData.elements[0];

  // Create element via controller
  ElementController.create(adminUser, org.id, projID, branchID, elemData)
  .then((createdElements) => {
    // Expect createdElements array to contain 1 element
    chai.expect(createdElements.length).to.equal(1);
    const createdElem = createdElements[0];

    // Verify element created properly
    chai.expect(createdElem.id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(createdElem._id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(createdElem.name).to.equal(elemData.name);
    chai.expect(createdElem.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(createdElem.project).to.equal(utils.createID(org.id, projID));
    chai.expect(createdElem.branch).to.equal(utils.createID(org.id, projID, branchID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(createdElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      const sourceID = utils.createID(org.id, projID, branchID, elemData.source);
      chai.expect(createdElem.source).to.equal(sourceID);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      const targetID = utils.createID(org.id, projID, branchID, elemData.target);
      chai.expect(createdElem.target).to.equal(targetID);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      const parentID = utils.createID(org.id, projID, branchID, elemData.parent);
      chai.expect(createdElem.parent).to.equal(parentID);
    }

    // Verify additional properties
    chai.expect(createdElem.createdBy).to.equal(adminUser._id);
    chai.expect(createdElem.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdElem.archivedBy).to.equal(null);
    chai.expect(createdElem.createdOn).to.not.equal(null);
    chai.expect(createdElem.updatedOn).to.not.equal(null);
    chai.expect(createdElem.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can create multiple elements.
 *
 * @param {Function} done - The Mocha callback.
 */
function createElements(done) {
  const elemDataObjects = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create elements via controller
  ElementController.create(adminUser, org.id, projID, branchID, elemDataObjects)
  .then((createdElements) => {
    // Expect createdElements not to be empty
    chai.expect(createdElements.length).to.equal(elemDataObjects.length);

    // Convert createdElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, createdElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, branchID, elemObj.id);
      const createdElem = jmi2Elements[elementID];

      // Verify elements created properly
      chai.expect(createdElem.id).to.equal(elementID);
      chai.expect(createdElem._id).to.equal(elementID);
      chai.expect(createdElem.name).to.equal(elemObj.name);
      chai.expect(createdElem.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(createdElem.project).to.equal(utils.createID(org.id, projID));
      chai.expect(createdElem.branch).to.equal(utils.createID(org.id, projID, branchID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(createdElem.documentation).to.equal(elemObj.documentation);
      }
      // If type was provided, verify it
      if (elemObj.hasOwnProperty('type')) {
        chai.expect(createdElem.type).to.equal(elemObj.type);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        const sourceID = utils.createID(org.id, projID, branchID, elemObj.source);
        chai.expect(createdElem.source).to.equal(sourceID);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        const targetID = utils.createID(org.id, projID, branchID, elemObj.target);
        chai.expect(createdElem.target).to.equal(targetID);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        const parentID = utils.createID(org.id, projID, branchID, elemObj.parent);
        chai.expect(createdElem.parent).to.equal(parentID);
      }

      // Verify additional properties
      chai.expect(createdElem.createdBy).to.equal(adminUser._id);
      chai.expect(createdElem.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdElem.archivedBy).to.equal(null);
      chai.expect(createdElem.createdOn).to.not.equal(null);
      chai.expect(createdElem.updatedOn).to.not.equal(null);
      chai.expect(createdElem.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can create or replace an element.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceElement(done) {
  const elemData = testData.elements[0];

  // Create or replace element via controller
  ElementController.createOrReplace(adminUser, org.id, projID, branchID, elemData)
  .then((replacedElements) => {
    // Expect replacedElements array to contain 1 element
    chai.expect(replacedElements.length).to.equal(1);
    const replacedElem = replacedElements[0];

    // Verify element created/replaced properly
    chai.expect(replacedElem.id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(replacedElem._id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(replacedElem.name).to.equal(elemData.name);
    chai.expect(replacedElem.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(replacedElem.project).to.equal(utils.createID(org.id, projID));
    chai.expect(replacedElem.branch).to.equal(utils.createID(org.id, projID, branchID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(replacedElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      const sourceID = utils.createID(org.id, projID, branchID, elemData.source);
      chai.expect(replacedElem.source).to.equal(sourceID);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      const targetID = utils.createID(org.id, projID, branchID, elemData.target);
      chai.expect(replacedElem.target).to.equal(targetID);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      const parentID = utils.createID(org.id, projID, branchID, elemData.parent);
      chai.expect(replacedElem.parent).to.equal(parentID);
    }

    // Verify additional properties
    chai.expect(replacedElem.createdBy).to.equal(adminUser._id);
    chai.expect(replacedElem.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedElem.archivedBy).to.equal(null);
    chai.expect(replacedElem.createdOn).to.not.equal(null);
    chai.expect(replacedElem.updatedOn).to.not.equal(null);
    chai.expect(replacedElem.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can create or replace multiple elements.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceElements(done) {
  const elemDataObjects = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create or replace elements via controller
  ElementController.createOrReplace(adminUser, org.id, projID, branchID, elemDataObjects)
  .then((replacedElements) => {
    // Expect replacedElements not to be empty
    chai.expect(replacedElements.length).to.equal(elemDataObjects.length);

    // Convert replacedElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, replacedElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, branchID, elemObj.id);
      const replacedElem = jmi2Elements[elementID];

      // Verify elements created/replaced properly
      chai.expect(replacedElem.id).to.equal(elementID);
      chai.expect(replacedElem._id).to.equal(elementID);
      chai.expect(replacedElem.name).to.equal(elemObj.name);
      chai.expect(replacedElem.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(replacedElem.project).to.equal(utils.createID(org.id, projID));
      chai.expect(replacedElem.branch).to.equal(utils.createID(org.id, projID, branchID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(replacedElem.documentation).to.equal(elemObj.documentation);
      }
      // If type was provided, verify it
      if (elemObj.hasOwnProperty('type')) {
        chai.expect(replacedElem.type).to.equal(elemObj.type);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        const sourceID = utils.createID(org.id, projID, branchID, elemObj.source);
        chai.expect(replacedElem.source).to.equal(sourceID);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        const targetID = utils.createID(org.id, projID, branchID, elemObj.target);
        chai.expect(replacedElem.target).to.equal(targetID);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        const parentID = utils.createID(org.id, projID, branchID, elemObj.parent);
        chai.expect(replacedElem.parent).to.equal(parentID);
      }

      // Verify additional properties
      chai.expect(replacedElem.createdBy).to.equal(adminUser._id);
      chai.expect(replacedElem.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedElem.archivedBy).to.equal(null);
      chai.expect(replacedElem.createdOn).to.not.equal(null);
      chai.expect(replacedElem.updatedOn).to.not.equal(null);
      chai.expect(replacedElem.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can find an element.
 *
 * @param {Function} done - The Mocha callback.
 */
function findElement(done) {
  const elemData = testData.elements[0];

  // Find element via controller
  ElementController.find(adminUser, org.id, projID, branchID, elemData.id)
  .then((foundElements) => {
    // Expect foundElements array to contains 1 element
    chai.expect(foundElements.length).to.equal(1);
    const foundElement = foundElements[0];

    // Verify correct element found
    chai.expect(foundElement.id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(foundElement._id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(foundElement.name).to.equal(elemData.name);
    chai.expect(foundElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(foundElement.project).to.equal(utils.createID(org.id, projID));
    chai.expect(foundElement.branch).to.equal(utils.createID(org.id, projID, branchID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(foundElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      const sourceID = utils.createID(org.id, projID, branchID, elemData.source);
      chai.expect(foundElement.source).to.equal(sourceID);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      const targetID = utils.createID(org.id, projID, branchID, elemData.target);
      chai.expect(foundElement.target).to.equal(targetID);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      const parentID = utils.createID(org.id, projID, branchID, elemData.parent);
      chai.expect(foundElement.parent).to.equal(parentID);
    }

    // Verify additional properties
    chai.expect(foundElement.createdBy).to.equal(adminUser._id);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundElement.archivedBy).to.equal(null);
    chai.expect(foundElement.createdOn).to.not.equal(null);
    chai.expect(foundElement.updatedOn).to.not.equal(null);
    chai.expect(foundElement.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can find multiple elements.
 *
 * @param {Function} done - The Mocha callback.
 */
function findElements(done) {
  const elemDataObjects = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create list of element ids to find
  const elemIDs = elemDataObjects.map(e => e.id);

  // Find elements via controller
  ElementController.find(adminUser, org.id, projID, branchID, elemIDs)
  .then((foundElements) => {
    // Expect foundElements not to be empty
    chai.expect(foundElements.length).to.equal(elemDataObjects.length);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, foundElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, branchID, elemObj.id);
      const foundElem = jmi2Elements[elementID];

      // Verify correct elements found
      chai.expect(foundElem.id).to.equal(elementID);
      chai.expect(foundElem._id).to.equal(elementID);
      chai.expect(foundElem.name).to.equal(elemObj.name);
      chai.expect(foundElem.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(foundElem.project).to.equal(utils.createID(org.id, projID));
      chai.expect(foundElem.branch).to.equal(utils.createID(org.id, projID, branchID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(foundElem.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        const sourceID = utils.createID(org.id, projID, branchID, elemObj.source);
        chai.expect(foundElem.source).to.equal(sourceID);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        const targetID = utils.createID(org.id, projID, branchID, elemObj.target);
        chai.expect(foundElem.target).to.equal(targetID);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        const parentID = utils.createID(org.id, projID, branchID, elemObj.parent);
        chai.expect(foundElem.parent).to.equal(parentID);
      }

      // Verify additional properties
      chai.expect(foundElem.createdBy).to.equal(adminUser._id);
      chai.expect(foundElem.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundElem.archivedBy).to.equal(null);
      chai.expect(foundElem.createdOn).to.not.equal(null);
      chai.expect(foundElem.updatedOn).to.not.equal(null);
      chai.expect(foundElem.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can find all elements on a project.
 *
 * @param {Function} done - The Mocha callback.
 */
function findAllElements(done) {
  const elemDataObjects = [
    testData.elements[0],
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Find elements via controller
  ElementController.find(adminUser, org.id, projID, branchID)
  .then((foundElements) => {
    // Expect foundElements to not be empty. Cannot know exact number in db
    chai.expect(foundElements.length).to.not.equal(0);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, foundElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, branchID, elemObj.id);
      const foundElem = jmi2Elements[elementID];

      // Verify correct elements found
      chai.expect(foundElem._id).to.equal(elementID);
      chai.expect(foundElem.name).to.equal(elemObj.name);
      chai.expect(foundElem.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(foundElem.project).to.equal(utils.createID(org.id, projID));
      chai.expect(foundElem.branch).to.equal(utils.createID(org.id, projID, branchID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(foundElem.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        const sourceID = utils.createID(org.id, projID, branchID, elemObj.source);
        chai.expect(foundElem.source).to.equal(sourceID);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        const targetID = utils.createID(org.id, projID, branchID, elemObj.target);
        chai.expect(foundElem.target).to.equal(targetID);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        const parentID = utils.createID(org.id, projID, branchID, elemObj.parent);
        chai.expect(foundElem.parent).to.equal(parentID);
      }

      // Verify additional properties
      chai.expect(foundElem.createdBy).to.equal(adminUser._id);
      chai.expect(foundElem.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundElem.archivedBy).to.equal(null);
      chai.expect(foundElem.createdOn).to.not.equal(null);
      chai.expect(foundElem.updatedOn).to.not.equal(null);
      chai.expect(foundElem.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can find an element through text based search.
 *
 * @param {Function} done - The Mocha callback.
 */
function searchElement(done) {
  const elemData = testData.elements[0];

  // Find element via controller
  ElementController.search(adminUser, org.id, projID, branchID, `"${elemData.name}"`)
  .then((foundElements) => {
    // Expect foundElements array to contains 1 element
    chai.expect(foundElements.length).to.equal(1);
    const foundElement = foundElements[0];

    // Verify correct element found
    chai.expect(foundElement.id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(foundElement._id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(foundElement.name).to.equal(elemData.name);
    chai.expect(foundElement.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(foundElement.project).to.equal(utils.createID(org.id, projID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(foundElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      const sourceID = utils.createID(org.id, projID, branchID, elemData.source);
      chai.expect(foundElement.source).to.equal(sourceID);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      const targetID = utils.createID(org.id, projID, branchID, elemData.target);
      chai.expect(foundElement.target).to.equal(targetID);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      const parentID = utils.createID(org.id, projID, branchID, elemData.parent);
      chai.expect(foundElement.parent).to.equal(parentID);
    }

    // Verify additional properties
    chai.expect(foundElement.createdBy).to.equal(adminUser._id);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundElement.archivedBy).to.equal(null);
    chai.expect(foundElement.createdOn).to.not.equal(null);
    chai.expect(foundElement.updatedOn).to.not.equal(null);
    chai.expect(foundElement.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can update an element.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateElement(done) {
  const elemData = testData.elements[0];

  // Create the object to update element
  const updateObj = {
    name: `${elemData.name}_edit`,
    id: elemData.id
  };

  // Update element via controller
  ElementController.update(adminUser, org.id, projID, branchID, updateObj)
  .then((updatedElements) => {
    // Expect updatedElements array to contain 1 element
    chai.expect(updatedElements.length).to.equal(1);
    const updatedElem = updatedElements[0];

    // Verify element updated properly
    chai.expect(updatedElem.id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(updatedElem._id).to.equal(utils.createID(org.id, projID, branchID, elemData.id));
    chai.expect(updatedElem.name).to.equal(updateObj.name);
    chai.expect(updatedElem.custom || {}).to.deep.equal(elemData.custom);
    chai.expect(updatedElem.project).to.equal(utils.createID(org.id, projID));
    chai.expect(updatedElem.branch).to.equal(utils.createID(org.id, projID, branchID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(updatedElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      const sourceID = utils.createID(org.id, projID, branchID, elemData.source);
      chai.expect(updatedElem.source).to.equal(sourceID);
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      const targetID = utils.createID(org.id, projID, branchID, elemData.target);
      chai.expect(updatedElem.target).to.equal(targetID);
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      const parentID = utils.createID(org.id, projID, branchID, elemData.parent);
      chai.expect(updatedElem.parent).to.equal(parentID);
    }

    // Verify additional properties
    chai.expect(updatedElem.createdBy).to.equal(adminUser._id);
    chai.expect(updatedElem.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedElem.archivedBy).to.equal(null);
    chai.expect(updatedElem.createdOn).to.not.equal(null);
    chai.expect(updatedElem.updatedOn).to.not.equal(null);
    chai.expect(updatedElem.archivedOn).to.equal(null);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can update multiple elements.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateElements(done) {
  const elemDataObjects = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create objects to update elements
  const updateObjects = elemDataObjects.map(e => ({
    name: `${e.name}_edit`,
    id: e.id
  }));

  // Update elements via controller
  ElementController.update(adminUser, org.id, projID, branchID, updateObjects)
  .then((updatedElements) => {
    // Expect updatedElements not to be empty
    chai.expect(updatedElements.length).to.equal(elemDataObjects.length);

    // Convert updatedElements to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, updatedElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, branchID, elemObj.id);
      const updatedElement = jmi2Elements[elementID];

      // Verify element updated properly
      chai.expect(updatedElement.id).to.equal(elementID);
      chai.expect(updatedElement._id).to.equal(elementID);
      chai.expect(updatedElement.name).to.equal(`${elemObj.name}_edit`);
      chai.expect(updatedElement.custom || {}).to.deep.equal(elemObj.custom);
      chai.expect(updatedElement.project).to.equal(utils.createID(org.id, projID));
      chai.expect(updatedElement.branch).to.equal(utils.createID(org.id, projID, branchID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(updatedElement.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        const sourceID = utils.createID(org.id, projID, branchID, elemObj.source);
        chai.expect(updatedElement.source).to.equal(sourceID);
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        const targetID = utils.createID(org.id, projID, branchID, elemObj.target);
        chai.expect(updatedElement.target).to.equal(targetID);
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        const parentID = utils.createID(org.id, projID, branchID, elemObj.parent);
        chai.expect(updatedElement.parent).to.equal(parentID);
      }

      // Verify additional properties
      chai.expect(updatedElement.createdBy).to.equal(adminUser._id);
      chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedElement.archivedBy).to.equal(null);
      chai.expect(updatedElement.createdOn).to.not.equal(null);
      chai.expect(updatedElement.updatedOn).to.not.equal(null);
      chai.expect(updatedElement.archivedOn).to.equal(null);
    });
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can delete an element.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteElement(done) {
  const elemData = testData.elements[0];

  // Delete element via controller
  ElementController.remove(adminUser, org.id, projID, branchID, elemData.id)
  .then((deletedElements) => {
    // Expect deletedElements array to contain 1 element
    chai.expect(deletedElements.length).to.equal(1);
    // Verify correct element deleted
    chai.expect(deletedElements).to.include(utils.createID(org.id, projID, branchID, elemData.id));

    // Attempt to find the deleted element
    return ElementController.find(adminUser, org.id, projID, branchID,
      elemData.id, { archived: true });
  })
  .then((foundElements) => {
    // Expect foundElements array to be empty
    chai.expect(foundElements.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}

/**
 * @description Validates that the Element Controller can delete multiple elements.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteElements(done) {
  const elemDataObjects = [
    testData.elements[1],
    testData.elements[2],
    testData.elements[3],
    testData.elements[4],
    testData.elements[5],
    testData.elements[6]
  ];

  // Create list of element ids to delete
  const elemIDs = elemDataObjects.map(e => e.id);

  // Delete elements via controller
  ElementController.remove(adminUser, org.id, projID, branchID, elemIDs)
  .then((deletedElements) => {
    // Expect deletedElements not to be empty
    chai.expect(deletedElements.length).to.equal(elemDataObjects.length);

    // Loop through each element data object
    elemDataObjects.forEach((elemDataObject) => {
      const elementID = utils.createID(org.id, projID, branchID, elemDataObject.id);
      // Verify correct element deleted
      chai.expect(deletedElements).to.include(elementID);
    });

    // Attempt to find the deleted elements
    return ElementController.find(adminUser, org.id, projID, branchID, elemIDs, { archived: true });
  })
  .then((foundElements) => {
    // Expect foundElements array to be empty
    chai.expect(foundElements.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
