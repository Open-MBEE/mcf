/**
 * @classification UNCLASSIFIED
 *
 * @module test.404a-branch-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Austin Bieber
 * @author Connor Doyle
 *
 * @description This tests the Branch Controller functionality.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const BranchController = M.require('controllers.branch-controller');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
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
   * Before: Create an admin user, organization, and project.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Set global organization
      org = await testUtils.createTestOrg(adminUser);
      // Set global project
      proj = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(proj._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove Organization and project.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
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
  it('should create a branch', createBranch);
  it('should create multiple branches', createBranches);
  it('should create a tag', createTag);
  // -------------- Find --------------
  it('should find a branch', findBranch);
  it('should find multiple branches', findBranches);
  it('should find all branches', findAllBranches);
  // ------------- Update -------------
  it('should update a branch', updateBranch);
  it('should update multiple branches', updateBranches);
  // ------------- Remove -------------
  it('should delete a branch', deleteBranch);
  it('should delete multiple branches', deleteBranches);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Validates that the Branch Controller can create a branch.
 *
 * @param {Function} done - The Mocha callback.
 */
function createBranch(done) {
  const branchData = testData.branches[1];

  // Create branch via controller
  BranchController.create(adminUser, org._id, projID, branchData)
  .then((_createdBranch) => {
    // Expect createdBranch array to contain 1 branch
    chai.expect(_createdBranch.length).to.equal(1);
    const createdBranch = _createdBranch[0];

    // Verify branch created properly
    chai.expect(createdBranch._id).to.equal(utils.createID(org._id, projID, branchData.id));
    chai.expect(createdBranch.name).to.equal(branchData.name);
    chai.expect(createdBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(createdBranch.project).to.equal(utils.createID(org._id, projID));
    chai.expect(createdBranch.tag).to.equal(branchData.tag);

    // Verify additional properties
    chai.expect(createdBranch.createdBy).to.equal(adminUser._id);
    chai.expect(createdBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdBranch.archivedBy).to.equal(null);
    chai.expect(createdBranch.createdOn).to.not.equal(null);
    chai.expect(createdBranch.updatedOn).to.not.equal(null);
    chai.expect(createdBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can create multiple branches.
 *
 * @param {Function} done - The Mocha callback.
 */
function createBranches(done) {
  const branchDataObjects = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create branches via controller
  BranchController.create(adminUser, org._id, projID, branchDataObjects)
  .then((createdBranches) => {
    // Expect createdBranches not to be empty
    chai.expect(createdBranches.length).to.equal(branchDataObjects.length);

    // Convert createdBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, createdBranches);
    // Loop through each branch data object
    branchDataObjects.forEach((branchObj) => {
      const branchID = utils.createID(org._id, projID, branchObj.id);
      const createdBranch = jmi2Branches[branchID];

      // Verify branches created properly
      chai.expect(createdBranch._id).to.equal(branchID);
      chai.expect(createdBranch.name).to.equal(branchObj.name);
      chai.expect(createdBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(createdBranch.project).to.equal(utils.createID(org._id, projID));

      // Verify additional properties
      chai.expect(createdBranch.createdBy).to.equal(adminUser._id);
      chai.expect(createdBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(createdBranch.archivedBy).to.equal(null);
      chai.expect(createdBranch.createdOn).to.not.equal(null);
      chai.expect(createdBranch.updatedOn).to.not.equal(null);
      chai.expect(createdBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can create a tag branch.
 *
 * @param {Function} done - The Mocha callback.
 */
function createTag(done) {
  const branchData = testData.branches[7];

  // Create branch via controller
  BranchController.create(adminUser, org._id, projID, branchData)
  .then((_createdBranch) => {
    // Expect createdBranch array to contain 1 branch
    chai.expect(_createdBranch.length).to.equal(1);
    const createdBranch = _createdBranch[0];

    // Verify branch created properly
    chai.expect(createdBranch._id).to.equal(utils.createID(org._id, projID, branchData.id));
    chai.expect(createdBranch.name).to.equal(branchData.name);
    chai.expect(createdBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(createdBranch.project).to.equal(utils.createID(org._id, projID));
    chai.expect(createdBranch.tag).to.equal(branchData.tag);

    // Verify additional properties
    chai.expect(createdBranch.createdBy).to.equal(adminUser._id);
    chai.expect(createdBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(createdBranch.archivedBy).to.equal(null);
    chai.expect(createdBranch.createdOn).to.not.equal(null);
    chai.expect(createdBranch.updatedOn).to.not.equal(null);
    chai.expect(createdBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can find a branch.
 *
 * @param {Function} done - The Mocha callback.
 */
function findBranch(done) {
  const branchData = testData.branches[1];

  // Find branch via controller
  BranchController.find(adminUser, org._id, projID, branchData.id)
  .then((_foundBranch) => {
    // Expect foundBranch array to contains 1 branch
    chai.expect(_foundBranch.length).to.equal(1);
    const foundBranch = _foundBranch[0];

    // Verify correct branch found
    chai.expect(foundBranch._id).to.equal(utils.createID(org._id, projID, branchData.id));
    chai.expect(foundBranch.name).to.equal(branchData.name);
    chai.expect(foundBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(foundBranch.project).to.equal(utils.createID(org._id, projID));

    // Verify additional properties
    chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(foundBranch.archivedBy).to.equal(null);
    chai.expect(foundBranch.createdOn).to.not.equal(null);
    chai.expect(foundBranch.updatedOn).to.not.equal(null);
    chai.expect(foundBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can find multiple branches.
 *
 * @param {Function} done - The Mocha callback.
 */
function findBranches(done) {
  const branchDataObjects = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create list of branch ids to find
  const branchIDs = branchDataObjects.map(b => b.id);

  // Find branches via controller
  BranchController.find(adminUser, org._id, projID, branchIDs)
  .then((foundBranches) => {
    // Expect foundBranches not to be empty
    chai.expect(foundBranches.length).to.equal(branchDataObjects.length);

    // Convert foundBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, foundBranches);
    // Loop through each branch data object
    branchDataObjects.forEach((branchObj) => {
      const branchID = utils.createID(org._id, projID, branchObj.id);
      const foundBranch = jmi2Branches[branchID];

      // Verify correct branches found
      chai.expect(foundBranch._id).to.equal(branchID);
      chai.expect(foundBranch.name).to.equal(branchObj.name);
      chai.expect(foundBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(foundBranch.project).to.equal(utils.createID(org._id, projID));

      // Verify additional properties
      chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
      chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(foundBranch.archivedBy).to.equal(null);
      chai.expect(foundBranch.createdOn).to.not.equal(null);
      chai.expect(foundBranch.updatedOn).to.not.equal(null);
      chai.expect(foundBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can find all the branches on a project.
 *
 * @param {Function} done - The Mocha callback.
 */
function findAllBranches(done) {
  const branchDataObjects = [
    testData.branches[0],
    testData.branches[1],
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Find branches via controller
  BranchController.find(adminUser, org._id, projID)
  .then((foundBranches) => {
    // Expect foundBranches not to be empty. Cannot know exact number in db
    chai.expect(foundBranches.length).to.not.equal(0);

    // Convert foundBranches to JMI type 2 for easier lookup
    const jmi2Branches = jmi.convertJMI(1, 2, foundBranches);
    // Loop through each branch data object
    branchDataObjects.forEach((branchDataObject) => {
      const branchID = utils.createID(org._id, projID, branchDataObject.id);
      const foundBranch = jmi2Branches[branchID];

      // Verify correct branch found
      chai.expect(foundBranch._id).to.equal(branchID);
      chai.expect(foundBranch.name).to.equal(branchDataObject.name);
      chai.expect(foundBranch.custom).to.deep.equal(branchDataObject.custom);
      chai.expect(foundBranch.project).to.equal(utils.createID(org._id, projID));

      // Verify additional properties
      if (branchID !== utils.createID(org._id, projID, 'master')) {
        chai.expect(foundBranch.createdBy).to.equal(adminUser._id);
        chai.expect(foundBranch.lastModifiedBy).to.equal(adminUser._id);
      }
      chai.expect(foundBranch.archivedBy).to.equal(null);
      chai.expect(foundBranch.createdOn).to.not.equal(null);
      chai.expect(foundBranch.updatedOn).to.not.equal(null);
      chai.expect(foundBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can update a branch.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateBranch(done) {
  const branchData = testData.branches[1];

  // Create the object to update branch
  const updateObj = {
    name: `${branchData.name}_edit`,
    id: branchData.id
  };

  // Update branch via controller
  BranchController.update(adminUser, org._id, projID, updateObj)
  .then((updatedBranches) => {
    // Expect updatedBranches array to contain 1 branch
    chai.expect(updatedBranches.length).to.equal(1);
    const updatedBranch = updatedBranches[0];

    // Verify branch updated properly
    chai.expect(updatedBranch._id).to.equal(utils.createID(org._id, projID, branchData.id));
    chai.expect(updatedBranch.name).to.equal(updateObj.name);
    chai.expect(updatedBranch.custom || {}).to.deep.equal(branchData.custom);
    chai.expect(updatedBranch.project).to.equal(utils.createID(org._id, projID));

    // Verify additional properties
    chai.expect(updatedBranch.createdBy).to.equal(adminUser._id);
    chai.expect(updatedBranch.lastModifiedBy).to.equal(adminUser._id);
    chai.expect(updatedBranch.archivedBy).to.equal(null);
    chai.expect(updatedBranch.createdOn).to.not.equal(null);
    chai.expect(updatedBranch.updatedOn).to.not.equal(null);
    chai.expect(updatedBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can update multiple branches.
 *
 * @param {Function} done - The Mocha callback.
 */
function updateBranches(done) {
  const branchDataObjects = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create objects to update branches
  const updateObjects = branchDataObjects.map(b => ({
    name: `${b.name}_edit`,
    id: b.id
  }));

  // Update branches via controller
  BranchController.update(adminUser, org._id, projID, updateObjects)
  .then((updatedBranches) => {
    // Expect updatedBranches not to be empty
    chai.expect(updatedBranches.length).to.equal(branchDataObjects.length);

    // Convert updatedBranches to JMI type 2 for easier lookup
    const jmi2Elements = jmi.convertJMI(1, 2, updatedBranches);
    // Loop through each branch data object
    branchDataObjects.forEach((branchObj) => {
      const branchID = utils.createID(org._id, projID, branchObj.id);
      const updatedBranch = jmi2Elements[branchID];

      // Verify branch updated properly
      chai.expect(updatedBranch._id).to.equal(branchID);
      chai.expect(updatedBranch.name).to.equal(`${branchObj.name}_edit`);
      chai.expect(updatedBranch.custom || {}).to.deep.equal(branchObj.custom);
      chai.expect(updatedBranch.project).to.equal(utils.createID(org._id, projID));

      // Verify additional properties
      chai.expect(updatedBranch.createdBy).to.equal(adminUser._id);
      chai.expect(updatedBranch.lastModifiedBy).to.equal(adminUser._id);
      chai.expect(updatedBranch.archivedBy).to.equal(null);
      chai.expect(updatedBranch.createdOn).to.not.equal(null);
      chai.expect(updatedBranch.updatedOn).to.not.equal(null);
      chai.expect(updatedBranch.archivedOn).to.equal(null);
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
 * @description Validates that the Branch Controller can delete a branch.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteBranch(done) {
  const branchData = testData.branches[1];

  // Deletes branch via controller
  BranchController.remove(adminUser, org._id, projID, branchData.id)
  .then((deletedBranch) => {
    // Expect deletedBranch array to contain 1 branch
    chai.expect(deletedBranch.length).to.equal(1);
    // Verify correct branch deleted
    chai.expect(deletedBranch).to.include(utils.createID(org._id, projID, branchData.id));

    // Attempt to find the deleted branch
    return BranchController.find(adminUser, org._id, projID, branchData.id, { archived: true });
  })
  .then((foundBranch) => {
    // Expect foundBranch array to be empty
    chai.expect(foundBranch.length).to.equal(0);
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
 * @description Validates that the Branch Controller can delete multiple branches.
 *
 * @param {Function} done - The Mocha callback.
 */
function deleteBranches(done) {
  const branchDataObjects = [
    testData.branches[2],
    testData.branches[3],
    testData.branches[4],
    testData.branches[5],
    testData.branches[6]
  ];

  // Create list of branch ids to delete
  const branchIDs = branchDataObjects.map(b => b.id);

  // Delete branches via controller
  BranchController.remove(adminUser, org._id, projID, branchIDs)
  .then((deletedBranches) => {
    // Expect deletedBranches not to be empty
    chai.expect(deletedBranches.length).to.equal(branchDataObjects.length);

    // Loop through each branch data object
    branchDataObjects.forEach((branchDataObject) => {
      const branchID = utils.createID(org._id, projID, branchDataObject.id);
      // Verify correct branch deleted
      chai.expect(deletedBranches).to.include(branchID);
    });

    // Attempt to find the deleted branches
    return BranchController.find(adminUser, org._id, projID, branchIDs, { archived: true });
  })
  .then((foundBranches) => {
    // Expect foundBranches array to be empty
    chai.expect(foundBranches.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
