/**
 * @classification UNCLASSIFIED
 *
 * @module test.406c-artifact-controller-specific-tests
 *
 * @copyright Copyright (C) 2019, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description These tests test for specific use cases within the artifact
 * controller. The tests verify that operations can be done that are more
 * specific than the core tests.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const fs = require('fs');
const path = require('path');
const ArtifactController = M.require('controllers.artifact-controller');
const Artifact = M.require('models.artifact');
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;
let projID = null;
let branchID = null;
let artifactBlob = null;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create an admin user, organization, project, and artifacts.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();

      // Create organization
      org = await testUtils.createTestOrg(adminUser);

      // Create project
      const retProj = await testUtils.createTestProject(adminUser, org._id);
      branchID = testData.branches[0].id;

      // Add project to array of created projects
      projID = utils.parseID(retProj._id).pop();

      // Create test artifacts for the main project
      const arts = testData.artifacts;
      await ArtifactController.create(adminUser, org._id, projID, branchID, arts);

      // Get png test file
      const artifactPath = path.join(
        M.root, testData.artifacts[0].location, testData.artifacts[0].filename
      );

      // Get the test file
      artifactBlob = await fs.readFileSync(artifactPath);
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /**
   * After: Remove organization, project and artifacts.
   */
  after(async () => {
    try {
      // Remove organization
      // Note: Projects and artifacts under organization will also be removed
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
  // -------------- Find --------------
  it('should populate allowed fields when finding an artifact', optionPopulateFind);
  it('should archive an artifact', archiveArtifact);
  it('should find an archived artifact when the option archived is provided', optionArchivedFind);
  it('should return an artifact with only the specific fields specified from'
    + ' find()', optionFieldsFind);
  it('should return a limited number of artifacts from find()', optionLimitFind);
  it('should return a second batch of artifacts with the limit and skip option'
    + ' from find()', optionSkipFind);
  it('should sort find results', optionSortFind);
  // ------------- Create -------------
  it('should create an archived artifact', createArchivedArtifact);
  it('should populate allowed fields when creating an artifact', optionPopulateCreate);
  it('should return an artifact with only the specific fields specified from'
    + ' create()', optionFieldsCreate);
  // ------------- Update -------------
  it('should populate allowed fields when updating an artifact', optionPopulateUpdate);
  it('should return an artifact with only the specific fields specified from'
    + ' update()', optionFieldsUpdate);
  it('should sort find results', optionSortFind);
  // ------------- Delete -------------
  it('should delete blob with artifact document', optionDeleteBlob);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies that an artifact can be archived upon creation.
 */
async function createArchivedArtifact() {
  try {
    // Create the artifact object
    const artObj = {
      id: 'archived-artifact',
      description: 'Archived Artifact',
      archived: true,
      location: 'archived',
      filename: 'archived.txt'
    };

    // Create the artifact
    const createdArtifacts = await ArtifactController.create(adminUser, org._id, projID,
      branchID, artObj);
    // Verify that only one artifact was created
    chai.expect(createdArtifacts.length).to.equal(1);
    const art = createdArtifacts[0];

    // Expect archived to be true, and archivedOn and archivedBy to not be null
    chai.expect(art.archived).to.equal(true);
    chai.expect(art.archivedBy).to.equal(adminUser._id);
    chai.expect(art.archivedOn).to.not.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that an artifact can be archived.
 */
async function archiveArtifact() {
  try {
    // Get the ID of the artifact to archive
    const artID = testData.artifacts[3].id;
    // Create the update object
    const updateObj = {
      id: artID,
      archived: true
    };

    // Update the artifact with archived: true
    const updatedArtifacts = await ArtifactController.update(adminUser, org._id, projID,
      branchID, updateObj);

    // Verify the array length is exactly 1
    chai.expect(updatedArtifacts.length).to.equal(1);
    const art = updatedArtifacts[0];

    // Expect archived to be true, and archivedOn and archivedBy to not be null
    chai.expect(art.archived).to.equal(true);
    chai.expect(art.archivedBy).to.equal(adminUser._id);
    chai.expect(art.archivedOn).to.not.equal(null);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the fields specified in the artifact model function
 * getValidPopulateFields() can all be populated in the find() function using
 * the option 'populate'.
 */
async function optionPopulateFind() {
  // Get the valid populate fields
  const pop = Artifact.getValidPopulateFields();
  // Create the options object
  const options = { populate: pop };
  // Get the artifact ID
  const artID = testData.artifacts[0].id;

  try {
    // Find an artifact using the populate option
    const foundArtifacts = await ArtifactController.find(adminUser, org._id, projID,
      branchID, artID, options);

    // Verify the array length is exactly 1
    chai.expect(foundArtifacts.length).to.equal(1);
    const art = foundArtifacts[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in art).to.equal(true);
      if (Array.isArray(art[field])) {
        art[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (art[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof art[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in art[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that archived artifacts can be found in the find()
 * function using the option 'archived'.
 */
async function optionArchivedFind() {
  try {
    const artID = testData.artifacts[3].id;

    // Create the options object
    const options = { archived: true };

    // Attempt to find the artifact without providing options
    const notFoundArtifacts = await ArtifactController.find(adminUser, org._id, projID, branchID,
      artID);

    // Expect the array to be empty since the option archived: true was not provided
    chai.expect(notFoundArtifacts.length).to.equal(0);

    // Attempt the find the artifact WITH providing the archived option
    const foundArtifacts = await ArtifactController.find(adminUser, org._id, projID, branchID,
      artID, options);

    // Expect the array to be of length 1
    chai.expect(foundArtifacts.length).to.equal(1);
    const artifact = foundArtifacts[0];

    // Verify all of the archived fields are properly set
    chai.expect(artifact.archived).to.equal(true);
    chai.expect(artifact.archivedOn).to.not.equal(null);
    chai.expect(artifact.archivedBy).to.equal(adminUser._id);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that option 'fields' returns an artifact with only
 * specific fields in find().
 */
async function optionFieldsFind() {
  try {
    // Get the ID of the artifact to find
    const artID = testData.artifacts[0].id;
    // Create the options object with the list of fields specifically find
    const findOptions = { fields: ['description', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Find the artifact only with specific fields.
    const foundArtifacts = await ArtifactController.find(adminUser, org._id, projID,
      branchID, artID, findOptions);

    // Expect there to be exactly 1 artifact found
    chai.expect(foundArtifacts.length).to.equal(1);
    const art = foundArtifacts[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible artifact fields
    const visibleFields = Object.keys(art);

    // Check that the only keys in the artifact are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Find the artifact without the notFind fields
    const notFindArtifacts = await ArtifactController.find(adminUser, org._id, projID,
      branchID, artID, notFindOptions);
    // Expect there to be exactly 1 artifact found
    chai.expect(notFindArtifacts.length).to.equal(1);
    const art2 = foundArtifacts[0];

    // Create a list of visible artifact fields
    const visibleFields2 = Object.keys(art2);

    // Check that the keys in the notFindOptions are not in art
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies a limited number of artifacts are returned when the
 * option 'limit' is supplied to the find() function.
 */
async function optionLimitFind() {
  try {
    // Create the options object with a limit of 2
    const options = { limit: 2 };

    // Find all artifacts on a given project
    const foundArtifacts = await ArtifactController.find(adminUser, org._id, projID,
      branchID, options);
    // Verify that no more than 2 artifacts were found
    chai.expect(foundArtifacts).to.have.lengthOf.at.most(2);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that a second batch of artifacts are returned when using
 * the 'skip' and 'limit' option together in the find() function.
 */
async function optionSkipFind() {
  try {
    // Create the first options object with just a limit
    const firstOptions = { limit: 2 };
    // Create the second options object with a limit and skip
    const secondOptions = { limit: 2, skip: 2 };

    // Find all artifacts on a given project
    const foundArtifacts = await ArtifactController.find(adminUser, org._id, projID,
      branchID, firstOptions);
    // Verify that no more than 2 artifacts were found
    chai.expect(foundArtifacts).to.have.lengthOf.at.most(2);
    // Add artifact ids to the firstBatchIDs array
    const firstBatchIDs = foundArtifacts.map(e => e._id);

    // Find the next batch of artifacts
    const secondArtifacts = await ArtifactController.find(adminUser, org._id, projID, branchID,
      secondOptions);
    // Verify that no more than 2 artifacts were found
    chai.expect(secondArtifacts).to.have.lengthOf.at.most(2);
    // Verify the second batch of artifacts are not the same as the first
    const secondBatchIDs = secondArtifacts.map(e => e._id);
    chai.expect(secondBatchIDs).to.not.have.members(firstBatchIDs);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the fields specified in the artifact model function
 * getValidPopulateFields() can all be populated in the create() function using
 * the option 'populate'.
 */
async function optionPopulateCreate() {
  try {
    // Get the valid populate fields
    const pop = Artifact.getValidPopulateFields();
    // Create the options object
    const options = { populate: pop };
    // Create the artifact object
    const artObj = {
      id: 'populate-artifact',
      location: 'location',
      filename: 'file.txt'
    };

    // Create the artifact
    const createdArtifacts = await ArtifactController.create(adminUser, org._id, projID,
      branchID, artObj, options);
    // Verify the array length is exactly 1
    chai.expect(createdArtifacts.length).to.equal(1);
    const art = createdArtifacts[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in art).to.equal(true);
      if (Array.isArray(art[field])) {
        art[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (art[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof art[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in art[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that option 'fields' returns an artifact with only
 * specific fields in create().
 */
async function optionFieldsCreate() {
  try {
    // Create the artifact objects
    const artObjFind = {
      id: 'fields-artifact',
      description: 'Fields Artifact',
      location: 'location/field',
      filename: 'file.dat'

    };
    const artObjNotFind = {
      id: 'not-fields-artifact',
      description: 'Not Fields Artifact',
      location: 'not/location/field',
      filename: 'notfile.dat'
    };
    // Create the options object with the list of fields specifically find
    const findOptions = { fields: ['description', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Create the artifact only with specific fields returned
    const createdArtifacts = await ArtifactController.create(adminUser, org._id, projID,
      branchID, artObjFind, findOptions);
    // Expect there to be exactly 1 artifact created
    chai.expect(createdArtifacts.length).to.equal(1);
    const art = createdArtifacts[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible artifact fields
    const visibleFields = Object.keys(art);

    // Check that the only keys in the artifact are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Create the artifact without the notFind fields
    const notFindArtifacts = await ArtifactController.create(adminUser, org._id,
      projID, branchID, artObjNotFind, notFindOptions);
    // Expect there to be exactly 1 artifact created
    chai.expect(notFindArtifacts.length).to.equal(1);
    const art2 = notFindArtifacts[0];

    // Create a list of visible artifact fields
    const visibleFields2 = Object.keys(art2);

    // Check that the keys in the notFindOptions are not in art
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the fields specified in the artifact model function
 * getValidPopulateFields() can all be populated in the update() function using
 * the option 'populate'.
 */
async function optionPopulateUpdate() {
  try {
    // Get the valid populate fields
    const pop = Artifact.getValidPopulateFields();
    // Create the options object
    const options = { populate: pop };
    // Create the update object
    const updateObj = {
      id: 'populate-artifact',
      description: 'Update Artifact'
    };

    // Update the artifact
    const updatedArtifacts = await ArtifactController.update(adminUser, org._id, projID,
      branchID, updateObj, options);
    // Verify the array length is exactly 1
    chai.expect(updatedArtifacts.length).to.equal(1);
    const art = updatedArtifacts[0];

    // For each field in pop
    pop.forEach((field) => {
      chai.expect(field in art).to.equal(true);
      if (Array.isArray(art[field])) {
        art[field].forEach((item) => {
          // Expect each populated field to be an object
          chai.expect(typeof item).to.equal('object');
          // Expect each populated field to at least have an id
          chai.expect('_id' in item).to.equal(true);
        });
      }
      else if (art[field] !== null) {
        // Expect each populated field to be an object
        chai.expect(typeof art[field]).to.equal('object');
        // Expect each populated field to at least have an id
        chai.expect('_id' in art[field]).to.equal(true);
      }
    });
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that option 'fields' returns an artifact with only
 * specific fields in update().
 */
async function optionFieldsUpdate() {
  try {
    // Create the update objects
    const updateObjFind = {
      id: 'fields-artifact',
      description: 'Fields Artifact Updated'
    };
    const updateObjNotFind = {
      id: 'not-fields-artifact',
      description: 'Not Fields Artifact Updated'
    };
    // Create the options object with the list of fields specifically find
    const findOptions = { fields: ['description', 'createdBy'] };
    // Create the options object with the list of fields to specifically NOT find
    const notFindOptions = { fields: ['-createdOn', '-updatedOn'] };
    // Create the list of fields which are always provided no matter what
    const fieldsAlwaysProvided = ['_id'];

    // Update the artifact only with specific fields returned
    const updatedArtifacts = await ArtifactController.update(adminUser, org._id, projID,
      branchID, updateObjFind, findOptions);
    // Expect there to be exactly 1 artifact updated
    chai.expect(updatedArtifacts.length).to.equal(1);
    const art = updatedArtifacts[0];

    // Create the list of fields that should be returned
    const expectedFields = findOptions.fields.concat(fieldsAlwaysProvided);

    // Create a list of visible artifact fields
    const visibleFields = Object.keys(art);

    // Check that the only keys in the artifact are the expected ones
    chai.expect(visibleFields).to.have.members(expectedFields);

    // Update the artifact without the notFind fields
    const notFindArtifacts = await ArtifactController.update(adminUser, org._id,
      projID, branchID, updateObjNotFind, notFindOptions);
    // Expect there to be exactly 1 artifact updated
    chai.expect(notFindArtifacts.length).to.equal(1);
    const art2 = notFindArtifacts[0];

    // Create a list of visible artifact fields
    const visibleFields2 = Object.keys(art2);

    // Check that the keys in the notFindOptions are not in art
    chai.expect(visibleFields2).to.not.have.members(['createdOn', 'updatedOn']);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Validates that the find results can be sorted.
 */
async function optionSortFind() {
  try {
    // Create artifact objects
    const testArts = [{
      id: 'testart00',
      description: 'b',
      location: 'b',
      filename: 'b.txt'
    },
    {
      id: 'testart01',
      description: 'c',
      location: 'c',
      filename: 'c.txt'
    },
    {
      id: 'testart02',
      description: 'a',
      location: 'a',
      filename: 'a.txt'
    }];
    // Create sort options
    const sortOption = { sort: 'description' };
    const sortOptionReverse = { sort: '-description' };

    // Create the test artifacts
    const createdElems = await ArtifactController.create(adminUser, org._id, projID,
      branchID, testArts);
    // Validate that 3 artifacts were created
    chai.expect(createdElems.length).to.equal(3);

    // Find the artifacts and return them sorted
    const foundElems = await ArtifactController.find(adminUser, org._id, projID, branchID,
      testArts.map((e) => e.id),
      sortOption);

    // Expect to find all three artifacts
    chai.expect(foundElems.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(foundElems[0].description).to.equal('a');
    chai.expect(foundElems[0]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart02'));
    chai.expect(foundElems[1].description).to.equal('b');
    chai.expect(foundElems[1]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart00'));
    chai.expect(foundElems[2].description).to.equal('c');
    chai.expect(foundElems[2]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart01'));

    // Find the artifacts and return them sorted in reverse
    const reverseElems = await ArtifactController.find(adminUser, org._id, projID, branchID,
      testArts.map((e) => e.id),
      sortOptionReverse);
    // Expect to find all three artifacts
    chai.expect(foundElems.length).to.equal(3);

    // Validate that the sort option is working
    chai.expect(reverseElems[0].description).to.equal('c');
    chai.expect(reverseElems[0]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart01'));
    chai.expect(reverseElems[1].description).to.equal('b');
    chai.expect(reverseElems[1]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart00'));
    chai.expect(reverseElems[2].description).to.equal('a');
    chai.expect(reverseElems[2]._id).to.equal(utils.createID(org._id, projID, branchID, 'testart02'));

    await ArtifactController.remove(adminUser, org._id, projID, branchID,
      testArts.map((e) => e.id));
  }
  catch (error) {
    M.log.error(error.message);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}

/**
 * @description Verifies that the option 'deleteBlob' deletes a no longer referenced
 * blob when an artifact document is deleted.
 */
async function optionDeleteBlob() {
  try {
    const artData = {
      project: projID,
      org: org._id,
      location: testData.artifacts[0].location,
      filename: testData.artifacts[0].filename
    };

    // Create the options object
    const options = { deleteBlob: true };

    // Post blob
    await ArtifactController.postBlob(adminUser, org._id,
      projID, artData, artifactBlob);

    const artID = testData.artifacts[0].id;

    // Delete the artifact and its non referenced blob
    const deleteArtIDs = await ArtifactController.remove(adminUser, org._id, projID,
      branchID, artID, options);

    // Verify response
    chai.expect(deleteArtIDs[0]).to.equal(
      utils.createID(org._id, projID, branchID, artID)
    );

    // Ensure blob not found
    await ArtifactController.getBlob(adminUser,
      org._id, projID, artData).should.eventually.be.rejectedWith(
      'Artifact blob not found.'
    );
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
  }
}
