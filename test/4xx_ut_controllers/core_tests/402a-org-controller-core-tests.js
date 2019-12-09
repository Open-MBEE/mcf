/**
 * @classification UNCLASSIFIED
 *
 * @module test.402a-org-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 * @author Leah De Laurell
 * @author Connor Doyle
 *
 * @description Tests the organization controller functionality: create,
 * delete, update, and find organizations.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const OrgController = M.require('controllers.organization-controller');
const db = M.require('db');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin user.
   */
  before((done) => {
    // Connect to the database
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((user) => {
      // Set global admin user
      adminUser = user;
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
   * After: Delete admin user.
   */
  after((done) => {
    // Removing admin user
    testUtils.removeTestAdmin()
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
  it('should create an org', createOrg);
  it('should create multiple orgs', createOrgs);
  // -------------- Find --------------
  it('should find an org', findOrg);
  it('should find multiple orgs', findOrgs);
  it('should find all orgs', findAllOrgs);
  // ------------- Update -------------
  it('should update an org', updateOrg);
  it('should update multiple orgs', updateOrgs);
  // ------------- Replace ------------
  it('should create or replace an org', createOrReplaceOrg);
  it('should create and replace multiple orgs', createOrReplaceOrgs);
  // ------------- Remove -------------
  it('should delete an org', deleteOrg);
  it('should delete multiple orgs', deleteOrgs);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the Org Controller can create an org.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrg(done) {
  const orgData = testData.orgs[0];

  // Create org via controller
  OrgController.create(adminUser, orgData)
  .then((createdOrgs) => {
    // Expect createdOrgs array to contain 1 org
    chai.expect(createdOrgs.length).to.equal(1);
    const createdOrg = createdOrgs[0];

    // Verify org created properly
    chai.expect(createdOrg._id).to.equal(orgData.id);
    chai.expect(createdOrg.name).to.equal(orgData.name);
    chai.expect(createdOrg.custom).to.deep.equal(orgData.custom);
    chai.expect(createdOrg.permissions[adminUser._id]).to.include('read');
    chai.expect(createdOrg.permissions[adminUser._id]).to.include('write');
    chai.expect(createdOrg.permissions[adminUser._id]).to.include('admin');

    // Verify additional properties
    chai.expect(createdOrg.createdBy).to.equal(adminUser._id);
    chai.expect(createdOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdOrg.archivedBy).to.equal(null);
    chai.expect(createdOrg.createdOn).to.not.equal(null);
    chai.expect(createdOrg.updatedOn).to.not.equal(null);
    chai.expect(createdOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can create multiple orgs.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrgs(done) {
  const orgDataObjects = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create orgs via controller
  OrgController.create(adminUser, orgDataObjects)
  .then((createdOrgs) => {
    // Expect createdOrgs not to be empty
    chai.expect(createdOrgs.length).to.equal(orgDataObjects.length);

    // Convert createdOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, createdOrgs);
    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      const createdOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created properly
      chai.expect(createdOrg._id).to.equal(orgDataObject.id);
      chai.expect(createdOrg.name).to.equal(orgDataObject.name);
      chai.expect(createdOrg.custom).to.deep.equal(orgDataObject.custom);
      chai.expect(createdOrg.permissions[adminUser._id]).to.include('read');
      chai.expect(createdOrg.permissions[adminUser._id]).to.include('write');
      chai.expect(createdOrg.permissions[adminUser._id]).to.include('admin');

      // Verify additional properties
      chai.expect(createdOrg.createdBy).to.equal(adminUser._id);
      chai.expect(createdOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdOrg.archivedBy).to.equal(null);
      chai.expect(createdOrg.createdOn).to.not.equal(null);
      chai.expect(createdOrg.updatedOn).to.not.equal(null);
      chai.expect(createdOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can create or replace an org.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceOrg(done) {
  const orgData = testData.orgs[0];

  // Create or replace org via controller
  OrgController.createOrReplace(adminUser, orgData)
  .then((replacedOrgs) => {
    // Expect replacedOrgs array to contain 1 org
    chai.expect(replacedOrgs.length).to.equal(1);
    const replacedOrg = replacedOrgs[0];

    // Verify org created/replaced properly
    chai.expect(replacedOrg._id).to.equal(orgData.id);
    chai.expect(replacedOrg.name).to.equal(orgData.name);
    chai.expect(replacedOrg.custom).to.deep.equal(orgData.custom);
    chai.expect(replacedOrg.permissions[adminUser._id]).to.include('read');
    chai.expect(replacedOrg.permissions[adminUser._id]).to.include('write');
    chai.expect(replacedOrg.permissions[adminUser._id]).to.include('admin');

    // Verify additional properties
    chai.expect(replacedOrg.createdBy).to.equal(adminUser._id);
    chai.expect(replacedOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(replacedOrg.archivedBy).to.equal(null);
    chai.expect(replacedOrg.createdOn).to.not.equal(null);
    chai.expect(replacedOrg.updatedOn).to.not.equal(null);
    chai.expect(replacedOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can create or replace multiple orgs.
 *
 * @param {Function} done - The Mocha callback.
 */
function createOrReplaceOrgs(done) {
  const orgDataObjects = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create or replace orgs via controller
  OrgController.createOrReplace(adminUser, orgDataObjects)
  .then((replacedOrgs) => {
    // Expect replacedOrgs not to be empty
    chai.expect(replacedOrgs.length).to.equal(orgDataObjects.length);

    // Convert replacedOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, replacedOrgs);
    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      const replacedOrg = jmi2Orgs[orgDataObject.id];

      // Verify org created/replaced properly
      chai.expect(replacedOrg._id).to.equal(orgDataObject.id);
      chai.expect(replacedOrg.name).to.equal(orgDataObject.name);
      chai.expect(replacedOrg.custom).to.deep.equal(orgDataObject.custom);
      chai.expect(replacedOrg.permissions[adminUser._id]).to.include('read');
      chai.expect(replacedOrg.permissions[adminUser._id]).to.include('write');
      chai.expect(replacedOrg.permissions[adminUser._id]).to.include('admin');

      // Verify additional properties
      chai.expect(replacedOrg.createdBy).to.equal(adminUser._id);
      chai.expect(replacedOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(replacedOrg.archivedBy).to.equal(null);
      chai.expect(replacedOrg.createdOn).to.not.equal(null);
      chai.expect(replacedOrg.updatedOn).to.not.equal(null);
      chai.expect(replacedOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can find an org.
 *
 * @param {Function} done - The Mocha callback.
 */
function findOrg(done) {
  const orgData = testData.orgs[0];

  // Find org via controller
  OrgController.find(adminUser, orgData.id)
  .then((foundOrgs) => {
    // Expect foundOrgs array to contain 1 org
    chai.expect(foundOrgs.length).to.equal(1);
    const foundOrg = foundOrgs[0];

    // Verify correct org found
    chai.expect(foundOrg._id).to.equal(orgData.id);
    chai.expect(foundOrg.name).to.equal(orgData.name);
    chai.expect(foundOrg.custom).to.deep.equal(orgData.custom);
    chai.expect(foundOrg.permissions[adminUser._id]).to.include('read');
    chai.expect(foundOrg.permissions[adminUser._id]).to.include('write');
    chai.expect(foundOrg.permissions[adminUser._id]).to.include('admin');

    // Verify additional properties
    chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
    chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundOrg.archivedBy).to.equal(null);
    chai.expect(foundOrg.createdOn).to.not.equal(null);
    chai.expect(foundOrg.updatedOn).to.not.equal(null);
    chai.expect(foundOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can find multiple orgs.
 *
 * @param {Function} done - The Mocha callback.
 */
function findOrgs(done) {
  const orgDataObjects = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create list of org ids to find
  const orgIDs = orgDataObjects.map(o => o.id);

  // Find orgs via controller
  OrgController.find(adminUser, orgIDs)
  .then((foundOrgs) => {
    // Expect foundOrgs not to be empty
    chai.expect(foundOrgs.length).to.equal(orgDataObjects.length);

    // Convert foundOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, foundOrgs);
    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      const foundOrg = jmi2Orgs[orgDataObject.id];

      // Verify correct org found
      chai.expect(foundOrg._id).to.equal(orgDataObject.id);
      chai.expect(foundOrg.name).to.equal(orgDataObject.name);
      chai.expect(foundOrg.custom).to.deep.equal(orgDataObject.custom);
      chai.expect(foundOrg.permissions[adminUser._id]).to.include('read');
      chai.expect(foundOrg.permissions[adminUser._id]).to.include('write');
      chai.expect(foundOrg.permissions[adminUser._id]).to.include('admin');

      // Verify additional properties
      chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
      chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundOrg.archivedBy).to.equal(null);
      chai.expect(foundOrg.createdOn).to.not.equal(null);
      chai.expect(foundOrg.updatedOn).to.not.equal(null);
      chai.expect(foundOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can find all orgs a user has access to.
 *
 * @param {Function} done - The Mocha callback.
 */
function findAllOrgs(done) {
  const orgDataObjects = [
    {
      id: M.config.server.defaultOrganizationId,
      name: M.config.server.defaultOrganizationName
    },
    testData.orgs[0],
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Find orgs via controller
  OrgController.find(adminUser)
  .then((foundOrgs) => {
    // Expect foundOrgs not to be empty. Cannot know true number in DB
    chai.expect(foundOrgs.length).to.be.at.least(orgDataObjects.length);

    // Convert foundOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, foundOrgs);
    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      const foundOrg = jmi2Orgs[orgDataObject.id];

      // If the org was created in tests
      if (foundOrg._id !== M.config.server.defaultOrganizationId) {
        // Verify correct org found
        chai.expect(foundOrg._id).to.equal(orgDataObject.id);
        chai.expect(foundOrg.name).to.equal(orgDataObject.name);
        chai.expect(foundOrg.custom).to.deep.equal(orgDataObject.custom);
        chai.expect(foundOrg.permissions[adminUser._id]).to.include('read');
        chai.expect(foundOrg.permissions[adminUser._id]).to.include('write');
        chai.expect(foundOrg.permissions[adminUser._id]).to.include('admin');

        // Verify additional properties
        chai.expect(foundOrg.createdBy).to.equal(adminUser._id);
        chai.expect(foundOrg.lastModifiedBy).to.equal(adminUser._id);
        chai.expect(foundOrg.archivedBy).to.equal(null);
        chai.expect(foundOrg.createdOn).to.not.equal(null);
        chai.expect(foundOrg.updatedOn).to.not.equal(null);
        chai.expect(foundOrg.archivedOn).to.equal(null);
      }
      // Special case for default org since it has no custom data
      else {
        chai.expect(foundOrg._id).to.equal(orgDataObject.id);
        chai.expect(foundOrg.name).to.equal(orgDataObject.name);
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
 * @description Validates that the Org Controller can update an org.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateOrg(done) {
  const orgData = testData.orgs[0];

  // Create object to update org
  const updateObj = {
    name: `${orgData.name}_edit`,
    id: orgData.id
  };

  // Update org via controller
  OrgController.update(adminUser, updateObj)
  .then((updatedOrgs) => {
    // Expect updatedOrgs array to contain 1 org
    chai.expect(updatedOrgs.length).to.equal(1);
    const updatedOrg = updatedOrgs[0];

    // Verify correct org updated
    chai.expect(updatedOrg._id).to.equal(orgData.id);
    chai.expect(updatedOrg.name).to.equal(`${orgData.name}_edit`);
    chai.expect(updatedOrg.custom).to.deep.equal(orgData.custom);
    chai.expect(updatedOrg.permissions[adminUser._id]).to.include('read');
    chai.expect(updatedOrg.permissions[adminUser._id]).to.include('write');
    chai.expect(updatedOrg.permissions[adminUser._id]).to.include('admin');

    // Verify additional properties
    chai.expect(updatedOrg.createdBy).to.equal(adminUser._id);
    chai.expect(updatedOrg.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedOrg.archivedBy).to.equal(null);
    chai.expect(updatedOrg.createdOn).to.not.equal(null);
    chai.expect(updatedOrg.updatedOn).to.not.equal(null);
    chai.expect(updatedOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can update multiple orgs.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateOrgs(done) {
  const orgDataObjects = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create objects to update orgs
  const updateObjects = orgDataObjects.map(o => ({
    name: `${o.name}_edit`,
    id: o.id
  }));

  // Update orgs via controller
  OrgController.update(adminUser, updateObjects)
  .then((updatedOrgs) => {
    // Expect updatedOrgs not to be empty
    chai.expect(updatedOrgs.length).to.equal(orgDataObjects.length);

    // Convert updatedOrgs to JMI type 2 for easier lookup
    const jmi2Orgs = jmi.convertJMI(1, 2, updatedOrgs);
    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      const updatedOrg = jmi2Orgs[orgDataObject.id];

      // Verify correct org updated
      chai.expect(updatedOrg._id).to.equal(orgDataObject.id);
      chai.expect(updatedOrg.name).to.equal(`${orgDataObject.name}_edit`);
      chai.expect(updatedOrg.custom).to.deep.equal(orgDataObject.custom);
      chai.expect(updatedOrg.permissions[adminUser._id]).to.include('read');
      chai.expect(updatedOrg.permissions[adminUser._id]).to.include('write');
      chai.expect(updatedOrg.permissions[adminUser._id]).to.include('admin');

      // Verify additional properties
      chai.expect(updatedOrg.createdBy).to.equal(adminUser._id);
      chai.expect(updatedOrg.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedOrg.archivedBy).to.equal(null);
      chai.expect(updatedOrg.createdOn).to.not.equal(null);
      chai.expect(updatedOrg.updatedOn).to.not.equal(null);
      chai.expect(updatedOrg.archivedOn).to.equal(null);
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
 * @description Validates that the Org Controller can delete an org.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteOrg(done) {
  const orgData = testData.orgs[0];

  // Delete org via controller
  OrgController.remove(adminUser, orgData.id)
  .then((deletedOrgs) => {
    // Expect deletedOrgs array to contain 1 org
    chai.expect(deletedOrgs.length).to.equal(1);
    const deletedOrgID = deletedOrgs[0];

    // Verify correct org deleted
    chai.expect(deletedOrgID).to.equal(orgData.id);

    // Attempt to find the deleted org
    return OrgController.find(adminUser, orgData.id, { archived: true });
  })
  .then((foundOrgs) => {
    // Expect foundOrgs array to be empty
    chai.expect(foundOrgs.length).to.equal(0);
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
 * @description Validates that the Org Controller can delete multiple orgs.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteOrgs(done) {
  const orgDataObjects = [
    testData.orgs[1],
    testData.orgs[2],
    testData.orgs[3]
  ];

  // Create list of org ids to delete
  const orgIDs = orgDataObjects.map(o => o.id);

  // Delete org via controller
  OrgController.remove(adminUser, orgIDs)
  .then((deletedOrgs) => {
    // Expect deletedOrgs not to be empty
    chai.expect(deletedOrgs.length).to.equal(orgDataObjects.length);

    // Loop through each org data object
    orgDataObjects.forEach((orgDataObject) => {
      // Verify correct org deleted
      chai.expect(deletedOrgs).to.include(orgDataObject.id);
    });

    // Attempt to find the deleted orgs
    return OrgController.find(adminUser, orgIDs, { archived: true });
  })
  .then((foundOrgs) => {
    // Expect foundOrgs array to be empty
    chai.expect(foundOrgs.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
