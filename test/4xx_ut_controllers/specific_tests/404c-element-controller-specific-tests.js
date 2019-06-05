/**
 * Classification: UNCLASSIFIED
 *
 * @module test.404c-element-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description These tests test for specific use cases within the element
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ElementController = M.require('controllers.element-controller');
const ProjectController = M.require('controllers.project-controller');
const Element = M.require('models.element');
const db = M.require('lib.db');
const jmi = M.require('lib.jmi-conversions');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
const projIDs = [];
let elements = [];

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
      // Add project to array of created projects
      projIDs.push(utils.parseID(retProj.id).pop());

      // Create an additional project with visibility of internal to be used
      // for testing the ability to reference elements on another project
      const internalProject = testData.projects[1];
      internalProject.visibility = 'internal';

      return ProjectController.create(adminUser, org.id, internalProject);
    })
    .then((retProj) => {
      // Add project to array of created projects
      projIDs.push(utils.parseID(retProj[0].id).pop());

      // Update the project references array in the main project
      return ProjectController.update(adminUser, org.id,
        { id: projIDs[0], projectReferences: [projIDs[1]] });
    })
    .then(() => {
      // Create test elements for the main project
      const elems = testData.elements;
      return ElementController.create(adminUser, org.id, projIDs[0], 'master', elems);
    })
    .then((createdElements) => {
      elements = createdElements;
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
  it('should create and archived element', createArchivedElement);
  it('should archive an element', archiveElement);
  it('should create an element whose source is on a different project', createExternalSource);
  it('should create an element whose target is on a different project', createExternalTarget);
  it('should update an element source to be on a different project', updateExternalSource);
  it('should update an element target to be on a different project', updateExternalTarget);
  it('should populate allowed fields when finding an element', optionPopulateFind);
  it('should find an archived element when the option archived is provided', optionArchivedFind);
  it('should find an element and it\'s subtree when the option subtree '
    + 'is provided', optionSubtreeFind);
  it('should return an element with only the specific fields specified from'
    + ' find()', optionFieldsFind);
  it('should return a limited number of elements from find()', optionLimitFind);
  it('should return a second batch of elements with the limit and skip option'
    + ' from find()', optionSkipFind);
  it('should return a raw JSON version of an element instead of a mongoose '
    + 'object from find()', optionLeanFind);
  it('should populate allowed fields when creating an element', optionPopulateCreate);
  it('should return an element with only the specific fields specified from'
    + ' create()', optionFieldsCreate);
  it('should return a raw JSON version of an element instead of a mongoose '
    + 'object from create()', optionLeanCreate);
  it('should populate allowed fields when updating an element', optionPopulateUpdate);
  it('should return an element with only the specific fields specified from'
    + ' update()', optionFieldsUpdate);
  it('should return a raw JSON version of an element instead of a mongoose '
    + 'object from update()', optionLeanUpdate);
  it('should populate allowed fields when replacing an element', optionPopulateReplace);
  it('should return an element with only the specific fields specified from'
    + ' createOrReplace()', optionFieldsReplace);
  it('should return a raw JSON version of an element instead of a mongoose '
    + 'object from createOrReplace()', optionLeanReplace);
  it('should populate allowed fields when searching an element', optionPopulateSearch);
  it('should search an archived element when the option archived is provided',
    optionArchivedSearch);
  it('should return a limited number of elements from search()', optionLimitSearch);
  it('should return a second batch of elements with the limit and skip option '
    + 'from search()', optionSkipSearch);
  it('should return a raw JSON version of an element instead of a mongoose '
    + 'object from search()', optionLeanSearch);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that an element can be archived upon creation
 */
function createArchivedElement(done) {
  // Create the element object
  const elemObj = {
    id: 'archived-element',
    name: 'Archived Element',
    archived: true
  };

  // Create the element
  ElementController.create(adminUser, org.id, projIDs[0], 'master', elemObj)
  .then((createdElements) => {
    // Verify that only one element was created
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // Expect archived to be true, and archivedOn and archivedBy to not be null
    chai.expect(elem.archived).to.equal(true);
    chai.expect(elem.archivedBy).to.equal(adminUser.username);
    chai.expect(elem.archivedOn).to.not.equal(null);
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
 * @description Verifies that an element can be archived.
 */
function archiveElement(done) {
  // Get the ID of the element to archive
  const elemID = utils.parseID(elements[6]._id).pop();
  // Create the update object
  const updateObj = {
    id: elemID,
    archived: true
  };

  // Update the element with archived: true
  ElementController.update(adminUser, org.id, projIDs[0], 'master', updateObj)
  .then((updatedElements) => {
    // Verify the array length is exactly 1
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // Expect archived to be true, and archivedOn and archivedBy to not be null
    chai.expect(elem.archived).to.equal(true);
    chai.expect(elem.archivedBy).to.equal(adminUser.username);
    chai.expect(elem.archivedOn).to.not.equal(null);
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
 * @description Verifies that an element can be created with a source that is
 * in a referenced project.
 */
function createExternalSource(done) {
  // Create element with sourceNamespace that points to referenced project
  const newElement = {
    id: 'external-source',
    source: 'model',
    sourceNamespace: {
      org: org.id,
      project: projIDs[1],
      branch: 'master'
    },
    target: 'model'
  };

  // Create the element using the element controller
  ElementController.create(adminUser, org.id, projIDs[0], 'master', newElement)
  .then((createdElements) => {
    const elem = createdElements[0];
    // Create the concatenated ID of the referenced element
    const referencedID = utils.createID(org.id, projIDs[1], 'model');
    // Verify the source is equal to the referencedID
    chai.expect(elem.source).to.equal(referencedID);
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
 * @description Verifies that an element can be created with a target that is
 * in a referenced project.
 */
function createExternalTarget(done) {
  // Create element with targetNamespace that points to referenced project
  const newElement = {
    id: 'external-target',
    source: 'model',
    target: 'model',
    targetNamespace: {
      org: org.id,
      project: projIDs[1],
      branch: 'master'
    }
  };

  // Create the element using the element controller
  ElementController.create(adminUser, org.id, projIDs[0], 'master', newElement)
  .then((createdElements) => {
    const elem = createdElements[0];
    // Create the concatenated ID of the referenced element
    const referencedID = utils.createID(org.id, projIDs[1], 'model');
    // Verify the target is equal to the referencedID
    chai.expect(elem.target).to.equal(referencedID);
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
 * @description Verifies that an element can be updated with a source that is in
 * a referenced project.
 */
function updateExternalSource(done) {
  // Create the update object which contains a sourceNamespace
  const updateObj = {
    id: 'external-source',
    source: 'undefined',
    sourceNamespace: {
      org: org.id,
      project: projIDs[1],
      branch: 'master'
    }
  };

  // Update the element using the element controller
  ElementController.update(adminUser, org.id, projIDs[0], 'master', updateObj)
  .then((updatedElements) => {
    const elem = updatedElements[0];
    // Create the concatenated ID of the referenced element
    const referencedID = utils.createID(org.id, projIDs[1], 'undefined');
    // Verify the source is equal to the referencedID
    chai.expect(elem.source).to.equal(referencedID);
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
 * @description Verifies that an element can be updated with a target that is in
 * a referenced project.
 */
function updateExternalTarget(done) {
  // Create the update object which contains a targetNamespace
  const updateObj = {
    id: 'external-target',
    target: 'undefined',
    targetNamespace: {
      org: org.id,
      project: projIDs[1],
      branch: 'master'
    }
  };

  // Update the element using the element controller
  ElementController.update(adminUser, org.id, projIDs[0], 'master', updateObj)
  .then((updatedElements) => {
    const elem = updatedElements[0];
    // Create the concatenated ID of the referenced element
    const referencedID = utils.createID(org.id, projIDs[1], 'undefined');
    // Verify the target is equal to the referencedID
    chai.expect(elem.target).to.equal(referencedID);
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
 * @description Verifies that the fields specified in the element model function
 * getValidPopulateFields() can all be populated in the find() function using
 * the option 'populate'.
 */
function optionPopulateFind(done) {
  // Get the valid populate fields
  const pop = Element.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Get the element ID of a relationship element
  const elemID = utils.parseID(elements[5]._id).pop();

  // Find a relationship element so source and target can be populated
  ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, options)
  .then((foundElements) => {
    // Verify the array length is exactly 1
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned element
      if (elem.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof elem.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(elem.field.hasOwnProperty('_id')).to.equal(true);
      }
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
 * @description Verifies that archived elements can be found in the find()
 * function using the option 'archived'.
 */
function optionArchivedFind(done) {
  // Create the options object
  const options = { archived: true };
  // Get the element ID of the archived element
  const elemID = utils.parseID(elements[6]._id).pop();

  // Attempt to find the element without providing options
  ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID)
  .then((foundElements) => {
    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(foundElements.length).to.equal(0);

    // Attempt the find the element WITH providing the archived option
    return ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, options);
  })
  .then((foundElements) => {
    // Expect the array to be of length 1
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify all of the archived fields are properly set
    chai.expect(elem.archived).to.equal(true);
    chai.expect(elem.archivedOn).to.not.equal(null);
    chai.expect(elem.archivedBy).to.equal(adminUser.username);
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
 * @description Verifies that an element and it's subtree are returned when
 * using the option 'subtree' in find().
 */
function optionSubtreeFind(done) {
  // Get the ID of the element to find
  const elemID = utils.parseID(elements[2]._id).pop();
  // Create the options object. Search for archived:true since one child element
  // was archived in a previous test
  const options = { subtree: true, archived: true };

  // Find the element and it's subtree
  ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, options)
  .then((foundElements) => {
    // Expect there to be 4 elements found, the searched element and 3 in subtree
    chai.expect(foundElements.length).to.equal(4);
    // Attempt to convert elements to JMI3, if successful then its a valid tree
    const jmi3Elements = jmi.convertJMI(1, 3, foundElements);
    // Verify that there is only one top level key in jmi3, which should be the
    // searched element
    chai.expect(Object.keys(jmi3Elements).length).to.equal(1);
    chai.expect(Object.keys(jmi3Elements)[0]).to.equal(elements[2]._id);
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
 * @description Verifies that option 'fields' returns an element with only
 * specific fields in find().
 */
function optionFieldsFind(done) {
  // Get the ID of the element to find
  const elemID = utils.parseID(elements[0]._id);
  // Create the options object with the list of fields specifically find
  const findOptions = { fields: ['name', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id', 'contains'];

  // Find the element only with specific fields.
  ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, findOptions)
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the only keys in the element are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Find the element without the notFind fields
    return ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, notFindOptions);
  })
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the keys in the notFindOptions are not in elem
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
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
 * @description Verifies a limited number of elements are returned when the
 * option 'limit' is supplied to the find() function.
 */
function optionLimitFind(done) {
  // Create the options object with a limit of 2
  const options = { limit: 2 };

  // Find all elements on a given project
  ElementController.find(adminUser, org.id, projIDs[0], 'master', options)
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
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
 * @description Verifies that a second batch of elements are returned when using
 * the 'skip' and 'limit' option together in the find() function
 */
function optionSkipFind(done) {
  // Create an array to store first batch of element ids
  let firstBatchIDs = [];
  // Create the first options object with just a limit
  const firstOptions = { limit: 2 };
  // Create the second options object with a limit and skip
  const secondOptions = { limit: 2, skip: 2 };

  // Find all elements on a given project
  ElementController.find(adminUser, org.id, projIDs[0], 'master', firstOptions)
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
    // Add element ids to the firstBatchIDs array
    firstBatchIDs = foundElements.map(e => e._id);

    // Find the next batch of elements
    return ElementController.find(adminUser, org.id, projIDs[0], 'master',
      secondOptions);
  })
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
    // Verify the second batch of elements are not the same as the first
    const secondBatchIDs = foundElements.map(e => e._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
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
 * @description Verifies that providing the option 'lean' returns raw JSON of an
 * element rather than a mongoose object in the find() function.
 */
function optionLeanFind(done) {
  // Get the ID of the element to find
  const elemID = utils.parseID(elements[0]._id).pop();
  // Create the options object with lean: true
  const options = { lean: true };

  // Find the element without the lean option
  ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID)
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify that the element is a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(true);

    // Find the element WITH the lean option
    return ElementController.find(adminUser, org.id, projIDs[0], 'master', elemID, options);
  })
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify that the element is NOT a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(false);
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
 * @description Verifies that the fields specified in the element model function
 * getValidPopulateFields() can all be populated in the create() function using
 * the option 'populate'.
 */
function optionPopulateCreate(done) {
  // Get the valid populate fields
  const pop = Element.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Create the element object
  const elemObj = {
    id: 'populate-element',
    source: utils.parseID(elements[0]._id).pop(),
    target: utils.parseID(elements[1]._id).pop()
  };

  // Create the element
  ElementController.create(adminUser, org.id, projIDs[0], 'master', elemObj, options)
  .then((createdElements) => {
    // Verify the array length is exactly 1
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned element
      if (elem.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof elem.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(elem.field.hasOwnProperty('_id')).to.equal(true);
      }
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
 * @description Verifies that option 'fields' returns an element with only
 * specific fields in create().
 */
function optionFieldsCreate(done) {
  // Create the element objects
  const elemObjFind = {
    id: 'fields-element',
    name: 'Fields Element'
  };
  const elemObjNotFind = {
    id: 'not-fields-element',
    name: 'Not Fields Element'
  };
  // Create the options object with the list of fields specifically find
  const findOptions = { fields: ['name', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id', 'contains'];

  // Create the element only with specific fields returned
  ElementController.create(adminUser, org.id, projIDs[0], 'master', elemObjFind, findOptions)
  .then((createdElements) => {
    // Expect there to be exactly 1 element created
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the only keys in the element are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Create the element without the notFind fields
    return ElementController.create(adminUser, org.id, projIDs[0], 'master',
      elemObjNotFind, notFindOptions);
  })
  .then((createdElements) => {
    // Expect there to be exactly 1 element created
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the keys in the notFindOptions are not in elem
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
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
 * @description Verifies that providing the option 'lean' returns raw JSON of an
 * element rather than a mongoose object in the create() function.
 */
function optionLeanCreate(done) {
  // Create the element object
  const leanElemObj = {
    id: 'lean-element',
    name: 'Lean Element'
  };
  const notLeanElemObj = {
    id: 'not-lean-element',
    name: 'Not Lean Element'
  };
  // Create the options object with lean: true
  const options = { lean: true };

  // Create the element without the lean option
  ElementController.create(adminUser, org.id, projIDs[0], 'master', notLeanElemObj)
  .then((createdElements) => {
    // Expect there to be exactly 1 element created
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // Verify that the element is a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(true);

    // Create the element WITH the lean option
    return ElementController.create(adminUser, org.id, projIDs[0], 'master', leanElemObj, options);
  })
  .then((createdElements) => {
    // Expect there to be exactly 1 element created
    chai.expect(createdElements.length).to.equal(1);
    const elem = createdElements[0];

    // Verify that the element is NOT a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(false);
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
 * @description Verifies that the fields specified in the element model function
 * getValidPopulateFields() can all be populated in the update() function using
 * the option 'populate'.
 */
function optionPopulateUpdate(done) {
  // Get the valid populate fields
  const pop = Element.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Create the update object
  const updateObj = {
    id: 'populate-element',
    name: 'Update Element'
  };

  // Update the element
  ElementController.update(adminUser, org.id, projIDs[0], 'master', updateObj, options)
  .then((updatedElements) => {
    // Verify the array length is exactly 1
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned element
      if (elem.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof elem.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(elem.field.hasOwnProperty('_id')).to.equal(true);
      }
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
 * @description Verifies that option 'fields' returns an element with only
 * specific fields in update().
 */
function optionFieldsUpdate(done) {
  // Create the update objects
  const updateObjFind = {
    id: 'fields-element',
    name: 'Fields Element Updated'
  };
  const updateObjNotFind = {
    id: 'not-fields-element',
    name: 'Not Fields Element Updated'
  };
  // Create the options object with the list of fields specifically find
  const findOptions = { fields: ['name', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id', 'contains'];

  // Update the element only with specific fields returned
  ElementController.update(adminUser, org.id, projIDs[0], 'master', updateObjFind, findOptions)
  .then((updatedElements) => {
    // Expect there to be exactly 1 element updated
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the only keys in the element are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Update the element without the notFind fields
    return ElementController.update(adminUser, org.id, projIDs[0], 'master',
      updateObjNotFind, notFindOptions);
  })
  .then((updatedElements) => {
    // Expect there to be exactly 1 element updated
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the keys in the notFindOptions are not in elem
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
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
 * @description Verifies that providing the option 'lean' returns raw JSON of an
 * element rather than a mongoose object in the update() function.
 */
function optionLeanUpdate(done) {
  // Create the update object
  const leanUpdateObj = {
    id: 'lean-element',
    name: 'Lean Element Updated'
  };
  const notLeanUpdateObj = {
    id: 'not-lean-element',
    name: 'Not Lean Element Updated'
  };
  // Create the options object with lean: true
  const options = { lean: true };

  // Update the element without the lean option
  ElementController.update(adminUser, org.id, projIDs[0], 'master', notLeanUpdateObj)
  .then((updatedElements) => {
    // Expect there to be exactly 1 element updated
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // Verify that the element is a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(true);

    // Update the element WITH the lean option
    return ElementController.update(adminUser, org.id, projIDs[0], 'master',
      leanUpdateObj, options);
  })
  .then((updatedElements) => {
    // Expect there to be exactly 1 element updated
    chai.expect(updatedElements.length).to.equal(1);
    const elem = updatedElements[0];

    // Verify that the element is NOT a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(false);
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
 * @description Verifies that the fields specified in the element model function
 * getValidPopulateFields() can all be populated in the createOrReplace()
 * function using the option 'populate'.
 */
function optionPopulateReplace(done) {
  // Get the valid populate fields
  const pop = Element.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Create the element object
  const elemObj = {
    id: 'populate-element',
    source: utils.parseID(elements[0]._id).pop(),
    target: utils.parseID(elements[1]._id).pop()
  };

  // Replace the element
  ElementController.createOrReplace(adminUser, org.id, projIDs[0], 'master', elemObj, options)
  .then((replacedElements) => {
    // Verify the array length is exactly 1
    chai.expect(replacedElements.length).to.equal(1);
    const elem = replacedElements[0];

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned element
      if (elem.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof elem.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(elem.field.hasOwnProperty('_id')).to.equal(true);
      }
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
 * @description Verifies that option 'fields' returns an element with only
 * specific fields in createOrReplace().
 */
function optionFieldsReplace(done) {
  // Create the element objects
  const elemObjFind = {
    id: 'fields-element',
    name: 'Fields Element'
  };
  const elemObjNotFind = {
    id: 'not-fields-element',
    name: 'Not Fields Element'
  };
  // Create the options object with the list of fields specifically find
  const findOptions = { fields: ['name', 'createdBy'] };
  // Create the options object with the list of fields to specifically NOT find
  const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
  // Create the list of fields which are always provided no matter what
  const fieldsAlwaysProvided = ['_id', 'contains'];

  // Replace the element only with specific fields returned
  ElementController.createOrReplace(adminUser, org.id, projIDs[0], 'master',
    elemObjFind, findOptions)
  .then((replacedElements) => {
    // Expect there to be exactly 1 element replaced
    chai.expect(replacedElements.length).to.equal(1);
    const elem = replacedElements[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the only keys in the element are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Replace the element without the notFind fields
    return ElementController.createOrReplace(adminUser, org.id, projIDs[0],
      'master', elemObjNotFind, notFindOptions);
  })
  .then((replacedElements) => {
    // Expect there to be exactly 1 element replaced
    chai.expect(replacedElements.length).to.equal(1);
    const elem = replacedElements[0];

    // Create a list of visible element fields. Object.keys(elem) returns hidden fields as well
    const visibleFields = Object.keys(elem._doc).concat(Object.keys(elem.$$populatedVirtuals));

    // Check that the keys in the notFindOptions are not in elem
    chai.expect(Object.keys(visibleFields)).to.not.have.members(['createdOn', 'updatedOn']);
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
 * @description Verifies that providing the option 'lean' returns raw JSON of an
 * element rather than a mongoose object in the createOrReplace() function.
 */
function optionLeanReplace(done) {
  // Create the element object
  const leanElemObj = {
    id: 'lean-element',
    name: 'Lean Element'
  };
  const notLeanElemObj = {
    id: 'not-lean-element',
    name: 'Not Lean Element'
  };
  // Create the options object with lean: true
  const options = { lean: true };

  // Replace the element without the lean option
  ElementController.createOrReplace(adminUser, org.id, projIDs[0], 'master', notLeanElemObj)
  .then((replacedElements) => {
    // Expect there to be exactly 1 element replaced
    chai.expect(replacedElements.length).to.equal(1);
    const elem = replacedElements[0];

    // Verify that the element is a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(true);

    // Replace the element WITH the lean option
    return ElementController.createOrReplace(adminUser, org.id, projIDs[0],
      'master', leanElemObj, options);
  })
  .then((replacedElements) => {
    // Expect there to be exactly 1 element replaced
    chai.expect(replacedElements.length).to.equal(1);
    const elem = replacedElements[0];

    // Verify that the element is NOT a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(false);
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
 * @description Verifies that the fields specified in the element model function
 * getValidPopulateFields() can all be populated in the search() function using
 * the option 'populate'.
 */
function optionPopulateSearch(done) {
  // Get the valid populate fields
  const pop = Element.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Create the text string to search for
  const query = '"Element #1"';

  // Search for elements
  ElementController.search(adminUser, org.id, projIDs[0], 'master', query, options)
  .then((foundElements) => {
    // Verify the array length is exactly 1
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // For each field in pop
    pop.forEach((field) => {
      // If the field is defined in the returned element
      if (elem.hasOwnProperty(field)) {
        // Expect each populated field to be an object
        chai.expect(typeof elem.field).to.equal('object');
        // Expect each populated field to at least have an _id
        chai.expect(elem.field.hasOwnProperty('_id')).to.equal(true);
      }
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
 * @description Verifies that archived elements can be found in the search()
 * function using the option 'archived'.
 */
function optionArchivedSearch(done) {
  // Create the options object
  const options = { archived: true };
  // Create the text string to search for
  const query = `"${elements[6].name}"`;

  // Search for the element, expecting no results back
  ElementController.search(adminUser, org.id, projIDs[0], 'master', query)
  .then((foundElements) => {
    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(foundElements.length).to.equal(0);

    // Attempt the find the element WITH providing the archived option
    return ElementController.search(adminUser, org.id, projIDs[0], 'master', query, options);
  })
  .then((foundElements) => {
    // Expect the array to be of length 1
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify all of the archived fields are properly set
    chai.expect(elem.archived).to.equal(true);
    chai.expect(elem.archivedOn).to.not.equal(null);
    chai.expect(elem.archivedBy).to.equal(adminUser.username);
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
 * @description Verifies a limited number of elements are returned when the
 * option 'limit' is supplied to the search() function.
 */
function optionLimitSearch(done) {
  // Create the options object with a limit of 2
  const options = { limit: 2 };
  // Create the text string to search for, should find more than 2 elements
  const query = 'model';

  // Search for elements
  ElementController.search(adminUser, org.id, projIDs[0], 'master', query, options)
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
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
 * @description Verifies that a second batch of elements are returned when using
 * the 'skip' and 'limit' option together in the search() function
 */
function optionSkipSearch(done) {
  // Create an array to store first batch of element ids
  let firstBatchIDs = [];
  // Create the first options object with just a limit
  const firstOptions = { limit: 2 };
  // Create the second options object with a limit and skip
  const secondOptions = { limit: 2, skip: 2 };
  // Create the query
  const query = 'model';

  // Search for elements
  ElementController.search(adminUser, org.id, projIDs[0], 'master', query, firstOptions)
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
    // Add element ids to the firstBatchIDs array
    firstBatchIDs = foundElements.map(e => e._id);

    // Search for next batch of elements
    return ElementController.search(adminUser, org.id, projIDs[0], 'master',
      query, secondOptions);
  })
  .then((foundElements) => {
    // Verify that no more than 2 elements were found
    chai.expect(foundElements).to.have.lengthOf.at.most(2);
    // Verify the second batch of elements are not the same as the first
    const secondBatchIDs = foundElements.map(e => e._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
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
 * @description Verifies that providing the option 'lean' returns raw JSON of an
 * element rather than a mongoose object in the search() function.
 */
function optionLeanSearch(done) {
  // Create the query to search with
  const query = `"${elements[0].name}"`;
  // Create the options object with lean: true
  const options = { lean: true };

  // Search for elements
  ElementController.search(adminUser, org.id, projIDs[0], 'master', query)
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify that the element is a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(true);

    // Search for elements WITH the lean option
    return ElementController.search(adminUser, org.id, projIDs[0], 'master', query, options);
  })
  .then((foundElements) => {
    // Expect there to be exactly 1 element found
    chai.expect(foundElements.length).to.equal(1);
    const elem = foundElements[0];

    // Verify that the element is NOT a mongoose object ('Element')
    chai.expect(elem instanceof Element).to.equal(false);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
