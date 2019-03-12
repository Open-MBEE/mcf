/**
 * Classification: UNCLASSIFIED
 *
 * @module test.404a-element-controller-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This tests the Element Controller functionality.
 */

// NPM modules
const chai = require('chai');
const path = require('path');

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = require(path.join(M.root, 'test', 'test-utils'));
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * After: Connect to database. Create an admin user, organization, and project
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
  it('should create an element', createElement);
  it('should create multiple elements', createElements);
  it('should find an element', findElement);
  it('should find multiple elements', findElements);
  it('should find all elements', findAllElements);
  it('should update an element', updateElement);
  it('should update multiple elements', updateElements);
  it('should delete an element', deleteElement);
  it('should delete multiple elements', deleteElements);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates an element using the element controller
 */
function createElement(done) {
  const elemData = testData.elements[0];

  // Create element via controller
  ElementController.create(adminUser, org.id, projID, 'master', elemData)
  .then((createdElements) => {
    // Expect createdElements array to contain 1 element
    chai.expect(createdElements.length).to.equal(1);
    const createdElem = createdElements[0];

    // Verify element created properly
    chai.expect(createdElem.id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(createdElem._id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(createdElem.name).to.equal(elemData.name);
    chai.expect(createdElem.custom).to.deep.equal(elemData.custom);
    chai.expect(createdElem.project).to.equal(utils.createID(org.id, projID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(createdElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(createdElem.source).to.equal(utils.createID(org.id, projID, elemData.source));
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(createdElem.target).to.equal(utils.createID(org.id, projID, elemData.target));
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(createdElem.parent).to.equal(utils.createID(org.id, projID, elemData.parent));
    }

    // Verify additional properties
    chai.expect(createdElem.createdBy).to.equal(adminUser.username);
    chai.expect(createdElem.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Creates multiple elements using the element controller
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
  ElementController.create(adminUser, org.id, projID, 'master', elemDataObjects)
  .then((createdElements) => {
    // Expect createdElements not to be empty
    chai.expect(createdElements.length).to.equal(elemDataObjects.length);

    // Convert createdElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, createdElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, elemObj.id);
      const createdElem = jmi2Elements[elementID];

      // Verify elements created properly
      chai.expect(createdElem.id).to.equal(elementID);
      chai.expect(createdElem._id).to.equal(elementID);
      chai.expect(createdElem.name).to.equal(elemObj.name);
      chai.expect(createdElem.custom).to.deep.equal(elemObj.custom);
      chai.expect(createdElem.project).to.equal(utils.createID(org.id, projID));

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
        chai.expect(createdElem.source).to.equal(utils.createID(org.id, projID, elemObj.source));
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(createdElem.target).to.equal(utils.createID(org.id, projID, elemObj.target));
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(createdElem.parent).to.equal(utils.createID(org.id, projID, elemObj.parent));
      }

      // Verify additional properties
      chai.expect(createdElem.createdBy).to.equal(adminUser.username);
      chai.expect(createdElem.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds an element via the elements controller
 */
function findElement(done) {
  const elemData = testData.elements[0];

  // Find element via controller
  ElementController.find(adminUser, org.id, projID, 'master', elemData.id)
  .then((foundElements) => {
    // Expect foundElements array to contains 1 element
    chai.expect(foundElements.length).to.equal(1);
    const foundElement = foundElements[0];

    // Verify correct element found
    chai.expect(foundElement.id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(foundElement._id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(foundElement.name).to.equal(elemData.name);
    chai.expect(foundElement.custom).to.deep.equal(elemData.custom);
    chai.expect(foundElement.project).to.equal(utils.createID(org.id, projID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(foundElement.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(foundElement.source).to.equal(utils.createID(org.id, projID, elemData.source));
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(foundElement.target).to.equal(utils.createID(org.id, projID, elemData.target));
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(foundElement.parent).to.equal(utils.createID(org.id, projID, elemData.parent));
    }

    // Verify additional properties
    chai.expect(foundElement.createdBy).to.equal(adminUser.username);
    chai.expect(foundElement.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds multiple elements via the element controller
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
  ElementController.find(adminUser, org.id, projID, 'master', elemIDs)
  .then((foundElements) => {
    // Expect foundElements not to be empty
    chai.expect(foundElements.length).to.equal(elemDataObjects.length);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, foundElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, elemObj.id);
      const foundElem = jmi2Elements[elementID];

      // Verify correct elements found
      chai.expect(foundElem.id).to.equal(elementID);
      chai.expect(foundElem._id).to.equal(elementID);
      chai.expect(foundElem.name).to.equal(elemObj.name);
      chai.expect(foundElem.custom).to.deep.equal(elemObj.custom);
      chai.expect(foundElem.project).to.equal(utils.createID(org.id, projID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(foundElem.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(foundElem.source).to.equal(utils.createID(org.id, projID, elemObj.source));
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(foundElem.target).to.equal(utils.createID(org.id, projID, elemObj.target));
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(foundElem.parent).to.equal(utils.createID(org.id, projID, elemObj.parent));
      }

      // Verify additional properties
      chai.expect(foundElem.createdBy).to.equal(adminUser.username);
      chai.expect(foundElem.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Finds all elements on a given project using the element controller
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
  ElementController.find(adminUser, org.id, projID, 'master')
  .then((foundElements) => {
    // Expect foundElements to not be empty. Cannot know exact number in db
    chai.expect(foundElements.length).to.not.equal(0);

    // Convert foundElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, foundElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, elemObj.id);
      const foundElem = jmi2Elements[elementID];

      // Verify correct elements found
      chai.expect(foundElem.id).to.equal(elementID);
      chai.expect(foundElem._id).to.equal(elementID);
      chai.expect(foundElem.name).to.equal(elemObj.name);
      chai.expect(foundElem.custom).to.deep.equal(elemObj.custom);
      chai.expect(foundElem.project).to.equal(utils.createID(org.id, projID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(foundElem.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(foundElem.source).to.equal(utils.createID(org.id, projID, elemObj.source));
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(foundElem.target).to.equal(utils.createID(org.id, projID, elemObj.target));
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(foundElem.parent).to.equal(utils.createID(org.id, projID, elemObj.parent));
      }

      // Verify additional properties
      chai.expect(foundElem.createdBy).to.equal(adminUser.username);
      chai.expect(foundElem.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Updates an element using the element controller
 */
function updateElement(done) {
  const elemData = testData.elements[0];

  // Create the object to update element
  const updateObj = {
    name: `${elemData.name}_edit`,
    id: elemData.id
  };

  // Update element via controller
  ElementController.update(adminUser, org.id, projID, 'master', updateObj)
  .then((updatedElements) => {
    // Expect updatedElements array to contain 1 element
    chai.expect(updatedElements.length).to.equal(1);
    const updatedElem = updatedElements[0];

    // Verify element updated properly
    chai.expect(updatedElem.id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(updatedElem._id).to.equal(utils.createID(org.id, projID, elemData.id));
    chai.expect(updatedElem.name).to.equal(updateObj.name);
    chai.expect(updatedElem.custom).to.deep.equal(elemData.custom);
    chai.expect(updatedElem.project).to.equal(utils.createID(org.id, projID));

    // If documentation was provided, verify it
    if (elemData.hasOwnProperty('documentation')) {
      chai.expect(updatedElem.documentation).to.equal(elemData.documentation);
    }
    // If source was provided, verify it
    if (elemData.hasOwnProperty('source')) {
      chai.expect(updatedElem.source).to.equal(utils.createID(org.id, projID, elemData.source));
    }
    // If target was provided, verify it
    if (elemData.hasOwnProperty('target')) {
      chai.expect(updatedElem.target).to.equal(utils.createID(org.id, projID, elemData.target));
    }
    // If parent was provided, verify it
    if (elemData.hasOwnProperty('parent')) {
      chai.expect(updatedElem.parent).to.equal(utils.createID(org.id, projID, elemData.parent));
    }

    // Verify additional properties
    chai.expect(updatedElem.createdBy).to.equal(adminUser.username);
    chai.expect(updatedElem.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Updates multiple elements using the element controller
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
  ElementController.update(adminUser, org.id, projID, 'master', updateObjects)
  .then((updatedElements) => {
    // Expect updatedElements not to be empty
    chai.expect(updatedElements.length).to.equal(elemDataObjects.length);

    // Convert updatedElements to JMI type 2 for easier lookup
    const jmi2Elements = utils.convertJMI(1, 2, updatedElements);
    // Loop through each element data object
    elemDataObjects.forEach((elemObj) => {
      const elementID = utils.createID(org.id, projID, elemObj.id);
      const updatedElement = jmi2Elements[elementID];

      // Verify element updated properly
      chai.expect(updatedElement.id).to.equal(elementID);
      chai.expect(updatedElement._id).to.equal(elementID);
      chai.expect(updatedElement.name).to.equal(`${elemObj.name}_edit`);
      chai.expect(updatedElement.custom).to.deep.equal(elemObj.custom);
      chai.expect(updatedElement.project).to.equal(utils.createID(org.id, projID));

      // If documentation was provided, verify it
      if (elemObj.hasOwnProperty('documentation')) {
        chai.expect(updatedElement.documentation).to.equal(elemObj.documentation);
      }
      // If source was provided, verify it
      if (elemObj.hasOwnProperty('source')) {
        chai.expect(updatedElement.source).to.equal(utils.createID(org.id, projID, elemObj.source));
      }
      // If target was provided, verify it
      if (elemObj.hasOwnProperty('target')) {
        chai.expect(updatedElement.target).to.equal(utils.createID(org.id, projID, elemObj.target));
      }
      // If parent was provided, verify it
      if (elemObj.hasOwnProperty('parent')) {
        chai.expect(updatedElement.parent).to.equal(utils.createID(org.id, projID, elemObj.parent));
      }

      // Verify additional properties
      chai.expect(updatedElement.createdBy).to.equal(adminUser.username);
      chai.expect(updatedElement.lastModifiedBy).to.equal(adminUser.username);
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
 * @description Deletes an element using the element controller
 */
function deleteElement(done) {
  const elemData = testData.elements[0];

  // Delete element via controller
  ElementController.remove(adminUser, org.id, projID, 'master', elemData.id)
  .then((deletedElements) => {
    // Expect deletedElements array to contain 1 element
    chai.expect(deletedElements.length).to.equal(1);
    // Verify correct element deleted
    chai.expect(deletedElements).to.include(utils.createID(org.id, projID, elemData.id));

    // Attempt to find the deleted element
    return ElementController.find(adminUser, org.id, projID, 'master',
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
 * @description Deletes multiple elements using the element controller
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
  ElementController.remove(adminUser, org.id, projID, 'master', elemIDs)
  .then((deletedElements) => {
    // Expect deletedElements not to be empty
    chai.expect(deletedElements.length).to.equal(elemDataObjects.length);

    // Loop through each element data object
    elemDataObjects.forEach((elemDataObject) => {
      const elementID = utils.createID(org.id, projID, elemDataObject.id);
      // Verify correct element deleted
      chai.expect(deletedElements).to.include(elementID);
    });

    // Attempt to find the deleted elements
    return ElementController.find(adminUser, org.id, projID, 'master', elemIDs, { archived: true });
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
