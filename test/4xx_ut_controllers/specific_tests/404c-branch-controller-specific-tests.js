/**
 * @classification UNCLASSIFIED
 *
 * @module test.404c-branch-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description These tests test for specific use cases within the branch
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const BranchController = M.require('controllers.branch-controller');
const Branch = M.require('models.branch');
const db = M.require('lib.db');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let proj = null;
let projID = null;
let branches = null;

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
  before(async () => {
    try {
      // Open the database connection
      await db.connect();

      // Create test admin, test org, test project
      adminUser = await testUtils.createTestAdmin();
      org = await testUtils.createTestOrg(adminUser);
      proj = await testUtils.createTestProject(adminUser, org.id);

      projID = utils.parseID(proj.id).pop();

      // Create additional branches for the tests to utilize
      branches = await BranchController.create(adminUser, org.id, projID,
        testData.branches.slice(1, 8));
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove Organization and project.
   * Close database connection.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects under organization will also be removed
      await testUtils.removeTestOrg(adminUser);
      await testUtils.removeTestAdmin();
      await db.disconnect();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  // -------------- Find --------------
  it('should populate find results', optionPopulateFind);
  it('should include archived branches in the find results', optionIncludeArchivedFind);
  it('should only return the specified fields', optionFieldsFind);
  it('should return a raw JSON version of a branch instead of a document with'
    + ' instance methods from find()', optionLimitFind);
  it('should skip over find results', optionSkipFind);
  it('should should return raw JSON rather than instances of models', optionLeanFind);
  it('should sort find results', optionSortFind);
  it('should find a specific tagged branch', optionTagFind);
  it('should find a branch with a specific source', optionSourceFind);
  it('should find a branch with a specific name', optionNameFind);
  it('should find a branch created by a specific user', optionCreatedByFind);
  it('should find a branch last modified by a specific user', optionLastModifiedByFind);
  it('should only find archived branches', optionArchivedFind);
  it('should find a branch archived by a specific user', optionArchivedByFind);
  it('should find a branch based on its custom data', optionCustomFind);
  // ------------- Create -------------
  it('should populate the return object from create', optionPopulateCreate);
  it('should only return specified fields from create', optionFieldsCreate);
  it('should return a raw JSON version of a branch instead of a document with'
    + ' instance methods from create()', optionLeanCreate);
  // ------------- Update -------------
  it('should populate the return object from update', optionPopulateUpdate);
  it('should only return specified fields from update', optionFieldsUpdate);
  it('should return a raw JSON version of a branch instead of a document with'
    + ' instance methods from update()', optionLeanUpdate);
  // ------------- Remove -------------
});

/* --------------------( Tests )-------------------- */

/**
 * @description Validates that the find results can be populated.
 */
async function optionPopulateFind() {
  try {
    // Select a branch to test
    const branch = branches[1];

    // Get populate options, without archivedBy because this branch isn't archived
    let fields = Branch.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Perform a find on the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID,
      utils.parseID(branch.id).pop(), options);
    // There should be one branch
    chai.expect(foundBranches.length).to.equal(1);
    const foundBranch = foundBranches[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in foundBranch).to.equal(true);
      if (Array.isArray(foundBranch[field])) {
        foundBranch[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (foundBranch[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof foundBranch[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in foundBranch[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can include archived results.
 */
async function optionIncludeArchivedFind() {
  try {
    // Select branches to test
    const branch = branches[1];
    const branchID = utils.parseID(branch.id).pop();
    const archivedBranch = branches[2];
    const archivedID = utils.parseID(archivedBranch.id).pop();

    // Create find option
    const options = { includeArchived: true };

    // Archive the second branch
    const archiveUpdate = {
      id: archivedID,
      archived: true
    };
    await BranchController.update(adminUser, org.id, projID,
      archiveUpdate);

    // Perform a find on the branches
    const foundBranch = await BranchController.find(adminUser, org.id, projID,
      [branchID, archivedID]);
    // There should be one branch
    chai.expect(foundBranch.length).to.equal(1);
    chai.expect(foundBranch[0]._id).to.equal(branch._id);

    // Perform a find on the branches
    const foundBranches = await BranchController.find(adminUser, org.id, projID,
      [branchID, archivedID], options);
    // There should be two branches
    chai.expect(foundBranches.length).to.equal(2);
    chai.expect(foundBranches[0]._id).to.equal(branch._id);
    chai.expect(foundBranches[1]._id).to.equal(archivedBranch._id);

    // Clean up for the following tests
    archiveUpdate.archived = false;
    await BranchController.update(adminUser, org.id, projID,
      archiveUpdate);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results only return specified fields.
 */
async function optionFieldsFind() {
  try {
    // Select a branch to test
    const branch = branches[1];
    const branchID = utils.parseID(branch.id).pop();

    // Create fields option
    const fields = ['name', 'source', 'tag'];
    const options = { fields: fields, lean: true };

    // Perform a find on the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID,
      branchID, options);
    // There should be one branch
    chai.expect(foundBranches.length).to.equal(1);
    const foundBranch = foundBranches[0];

    const keys = Object.keys(foundBranch);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the number of find results can be limited.
 */
async function optionLimitFind() {
  try {
    // Create limit option
    const options = { limit: 3 };
    // There should be seven branches plus the master branch
    const numBranches = branches.length + 1;

    // Find all the branches just to check
    const allBranches = await BranchController.find(adminUser, org.id, projID);
    // There should be eight branches
    chai.expect(allBranches.length).to.equal(numBranches);

    // Find all the branches with the limit option
    const limitBranches = await BranchController.find(adminUser, org.id, projID, options);
    // There should only be as many branches as specified in the limit option
    chai.expect(limitBranches.length).to.equal(options.limit);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that find results can be skipped over.
 */
async function optionSkipFind() {
  try {
    // Create limit option
    const options = { skip: 3 };
    // There should be seven branches, plus the master branch
    const numBranches = branches.length + 1;

    // Find all the branches just to check
    const allBranches = await BranchController.find(adminUser, org.id, projID);
    chai.expect(allBranches.length).to.equal(numBranches);

    // Find all the branches with the skip option
    const skipBranches = await BranchController.find(adminUser, org.id, projID, options);
    chai.expect(skipBranches.length).to.equal(numBranches - options.skip);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that find results can return raw JSON rather than models.
 */
async function optionLeanFind() {
  try {
    // Create lean option
    const options = { lean: true };

    // Find the branches without lean to check that they are models
    const foundBranches = await BranchController.find(adminUser, org.id, projID);

    const branch1 = foundBranches[0];
    // Expect the instance method getValidUpdateFields to be a function
    chai.expect(typeof branch1.getValidUpdateFields).to.equal('function');

    // Find the branches with the lean option
    const leanBranches = await BranchController.find(adminUser, org.id, projID, options);

    const branch2 = leanBranches[0];
    // Expect the instance method getValidUpdateFields to undefined
    chai.expect(typeof branch2.getValidUpdateFields).to.equal('undefined');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can be sorted.
 */
async function optionSortFind() {
  try {
    // Create the test branch objects
    const testBranches = [
      {
        id: 'testbranch00',
        name: 'b',
        source: 'master'
      },
      {
        id: 'testbranch01',
        name: 'c',
        source: 'master'
      },
      {
        id: 'testbranch02',
        name: 'a',
        source: 'master'
      }];
    // Create sort options
    const sortOption = { sort: 'name' };
    const sortOptionReverse = { sort: '-name' };

    // Create the branches
    const createdBranches = await BranchController.create(adminUser, org.id, projID, testBranches);

    // Expect createdBranches array to contain 3 projects
    chai.expect(createdBranches.length).to.equal(3);

    const foundBranches = await BranchController.find(adminUser, org.id, projID,
      testBranches.map((p) => p.id), sortOption);

    // Expect to find 3 branches
    chai.expect(foundBranches.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundBranches[0].name).to.equal('a');
    chai.expect(foundBranches[0].id).to.equal(utils.createID(org.id, projID, 'testbranch02'));
    chai.expect(foundBranches[1].name).to.equal('b');
    chai.expect(foundBranches[1].id).to.equal(utils.createID(org.id, projID, 'testbranch00'));
    chai.expect(foundBranches[2].name).to.equal('c');
    chai.expect(foundBranches[2].id).to.equal(utils.createID(org.id, projID, 'testbranch01'));

    // Find the branches and return them sorted in reverse
    const reverseBranches = await BranchController.find(adminUser, org.id, projID,
      testBranches.map((b) => b.id), sortOptionReverse);

    // Expect to find 3 branches
    chai.expect(reverseBranches.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseBranches[0].name).to.equal('c');
    chai.expect(reverseBranches[0].id).to.equal(utils.createID(org.id, projID, 'testbranch01'));
    chai.expect(reverseBranches[1].name).to.equal('b');
    chai.expect(reverseBranches[1].id).to.equal(utils.createID(org.id, projID, 'testbranch00'));
    chai.expect(reverseBranches[2].name).to.equal('a');
    chai.expect(reverseBranches[2].id).to.equal(utils.createID(org.id, projID, 'testbranch02'));

    await BranchController.remove(adminUser, org.id, projID, testBranches.map((b) => b.id));
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that tagged branches can be found.
 */
async function optionTagFind() {
  try {
    // Create tag option
    const options = { tag: true };

    // Find the tag branch
    const tagBranches = await BranchController.find(adminUser, org.id, projID, options);

    // There should only be one branch found
    chai.expect(tagBranches.length).to.equal(1);
    const tagBranch = tagBranches[0];

    // Expect the branch to be a tag
    chai.expect(tagBranch.tag).to.equal(true);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches with a specific source can be found.
 */
async function optionSourceFind() {
  try {
    // Create source option
    const options = { source: 'master' };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);

    // There should be seven branches found
    chai.expect(foundBranches.length).to.equal(branches.length);

    // Validate that each branch has master as its source
    foundBranches.forEach((branch) => {
      chai.expect(branch.source).to.equal(utils.createID(org.id, projID, 'master'));
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches with a specific name can be found.
 */
async function optionNameFind() {
  try {
    // Create name option
    const options = { name: 'Branch04' };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);

    // There should be one branch found
    chai.expect(foundBranches.length).to.equal(1);
    const foundBranch = foundBranches[0];

    // Validate that the correct branch has been found
    chai.expect(foundBranch.name).to.equal('Branch04');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches created by a specific user can be found.
 */
async function optionCreatedByFind() {
  try {
    // Create createdBy option
    const options = { createdBy: 'test_admin' };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);

    // Validate that each branch was created by the test admin
    foundBranches.forEach((branch) => {
      chai.expect(branch.createdBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches last modified by a specific user can be found.
 */
async function optionLastModifiedByFind() {
  try {
    // Create lastModifedBy option
    const options = { lastModifiedBy: 'test_admin' };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);

    // Validate that each branch was created by the test admin
    foundBranches.forEach((branch) => {
      chai.expect(branch.lastModifiedBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that only archived branches will be returned with the archived option.
 */
async function optionArchivedFind() {
  try {
    // Select branches to test
    const branch = branches[1];
    const branchID = utils.parseID(branch.id).pop();
    const archivedBranch = branches[2];
    const archivedID = utils.parseID(archivedBranch.id).pop();

    // Create find option
    const options = { archived: true };

    // Archive the second branch
    const archiveUpdate = {
      id: archivedID,
      archived: true
    };
    await BranchController.update(adminUser, org.id, projID,
      archiveUpdate);

    // Perform a find on the branches
    const foundBranch = await BranchController.find(adminUser, org.id, projID,
      [branchID, archivedID]);
    // There should be one branch
    chai.expect(foundBranch.length).to.equal(1);
    chai.expect(foundBranch[0]._id).to.equal(branch._id);

    // Perform a find on the branches
    const foundBranches = await BranchController.find(adminUser, org.id, projID,
      [branchID, archivedID], options);
    // There should be one branch
    chai.expect(foundBranches.length).to.equal(1);
    chai.expect(foundBranches[0]._id).to.equal(archivedBranch._id);

    // Clean up for the following tests
    archiveUpdate.archived = false;
    await BranchController.update(adminUser, org.id, projID,
      archiveUpdate);
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches archived by a specific user can be found.
 */
async function optionArchivedByFind() {
  try {
    // Archive a branch
    const update = {
      id: utils.parseID(branches[0]._id).pop(),
      archived: true
    };
    await BranchController.update(adminUser, org.id, projID, update);

    // Create archivedBy option
    const options = { archivedBy: 'test_admin', includeArchived: true };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);

    // Validate that each branch was archived by the test admin
    foundBranches.forEach((branch) => {
      chai.expect(branch.archivedBy).to.equal('test_admin');
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that branches with specific custom data can be found.
 */
async function optionCustomFind() {
  try {
    // Create custom option
    const options = { 'custom.location': 'Location02' };

    // Find the branch
    const foundBranches = await BranchController.find(adminUser, org.id, projID, options);
    // There should be one branches found
    chai.expect(foundBranches.length).to.equal(1);
    const foundBranch = foundBranches[0];

    // Validate the found branch has the custom data
    chai.expect(foundBranch.custom).to.deep.equal({ location: 'Location02' });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the return object from create() can be populated.
 */
async function optionPopulateCreate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01',
      source: 'master'
    };

    // Delete the branch
    await BranchController.remove(adminUser, org.id, projID, branchID);

    // Get populate options, without archivedBy because this branch isn't archived
    let fields = Branch.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Create the branch
    const createdBranches = await BranchController.create(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(createdBranches.length).to.equal(1);
    const createdBranch = createdBranches[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in createdBranch).to.equal(true);
      if (Array.isArray(createdBranch[field])) {
        createdBranch[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (createdBranch[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof createdBranch[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in createdBranch[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the create results only return specified fields.
 */
async function optionFieldsCreate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01',
      source: 'master'
    };

    // Delete the branch
    await BranchController.remove(adminUser, org.id, projID, branchID);

    // Create fields option
    const fields = ['name', 'source', 'tag'];
    const options = { fields: fields, lean: true };

    // Create the branch
    const createdBranches = await BranchController.create(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(createdBranches.length).to.equal(1);
    const foundBranch = createdBranches[0];

    const keys = Object.keys(foundBranch);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the create results return JSON data rather than model instances.
 */
async function optionLeanCreate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01',
      source: 'master'
    };

    // Delete the branch
    await BranchController.remove(adminUser, org.id, projID, branchID);

    // Create lean option
    const options = { lean: true };

    // Create the branch
    const createdBranches = await BranchController.create(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(createdBranches.length).to.equal(1);
    const foundBranch = createdBranches[0];

    // Expect the instance method getValidUpdateFields to undefined
    chai.expect(typeof foundBranch.getValidUpdateFields).to.equal('undefined');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the return object from update() can be populated.
 */
async function optionPopulateUpdate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01 populate update'
    };

    // Get populate options, without archivedBy because this branch isn't archived
    let fields = Branch.getValidPopulateFields();
    fields = fields.filter((f) => f !== 'archivedBy');
    const options = { populate: fields };

    // Update the branch
    const updatedBranches = await BranchController.update(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(updatedBranches.length).to.equal(1);
    const updatedBranch = updatedBranches[0];

    // Check that each populated field was returned as an object
    fields.forEach((field) => {
      chai.expect(field in updatedBranch).to.equal(true);
      if (Array.isArray(updatedBranch[field])) {
        updatedBranch[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (updatedBranch[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof updatedBranch[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in updatedBranch[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the update results only return specified fields.
 */
async function optionFieldsUpdate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01 fields update'
    };

    // Create fields option
    const fields = ['name', 'source', 'tag'];
    const options = { fields: fields, lean: true };

    // Update the branch
    const updatedBranches = await BranchController.update(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(updatedBranches.length).to.equal(1);
    const foundBranch = updatedBranches[0];

    const keys = Object.keys(foundBranch);
    // +1 because the _id field is always returned no matter what
    chai.expect(keys.length).to.equal(fields.length + 1);
    // Check that only the specified fields have been returned
    fields.forEach((field) => {
      chai.expect(keys.includes(field)).to.equal(true);
    });
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the update results return JSON data rather than model instances.
 */
async function optionLeanUpdate() {
  try {
    // Select a branch to test
    const branchID = utils.parseID(branches[1]._id).pop();
    const branchObj = {
      id: branchID,
      name: 'Branch01 lean update'
    };

    // Create lean option
    const options = { lean: true };

    // Update the branch
    const createdBranches = await BranchController.update(adminUser, org.id, projID,
      branchObj, options);
    // There should be one branch
    chai.expect(createdBranches.length).to.equal(1);
    const foundBranch = createdBranches[0];

    // Expect the instance method getValidUpdateFields to undefined
    chai.expect(typeof foundBranch.getValidUpdateFields).to.equal('undefined');
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
