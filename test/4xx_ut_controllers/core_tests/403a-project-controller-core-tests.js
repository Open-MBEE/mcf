/**
 * Classification: UNCLASSIFIED
 *
 * @module test.403a-project-controller-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description  This tests the Project Controller functionality. These tests
 * are to make sure the code is working as it should or should not be. Especially,
 * when making changes/ updates to the code. The project controller tests create,
 * update, find, and delete projects
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const ProjController = M.require('controllers.project-controller');
const db = M.require('lib.db');
const utils = M.require('lib.utils');
const jmi = M.require('lib.jmi-conversions');

/* --------------------( Test Data )-------------------- */
// Variables used across test functions
const testUtils = M.require('lib.test-utils');
const testData = testUtils.importTestData('test_data.json');
let adminUser = null;
let org = null;


/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /**
   * Before: Create admin and non-admin user. Create organization.
   */
  before((done) => {
    // Connect db
    db.connect()
    // Create test admin
    .then(() => testUtils.createTestAdmin())
    .then((_adminUser) => {
      // Set global admin user
      adminUser = _adminUser;
      // Create a global organization
      return testUtils.createTestOrg(adminUser);
    })
    .then((retOrg) => {
      // Set global org
      org = retOrg;
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
   * After: Remove non-admin user and organization.
   */
  after((done) => {
    // Removing the organization created
    testUtils.removeTestOrg(adminUser)
    // Remove the admin user
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
  it('should create a project', createProject);
  it('should create multiple projects', createProjects);
  it('should create or replace a project', createOrReplaceProject);
  it('should create and replace multiple projects', createOrReplaceProjects);
  it('should find a project', findProject);
  it('should find multiple projects', findProjects);
  it('should find all projects', findAllProjects);
  it('should update a project', updateProject);
  it('should update multiple projects', updateProjects);
  it('should delete a project', deleteProject);
  it('should delete multiple projects', deleteProjects);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Creates a project using the project controller
 */
function createProject(done) {
  const projData = testData.projects[0];

  // Create project via controller
  ProjController.create(adminUser, org.id, projData)
  .then((createdProjects) => {
    // Expect createdProjects array to contain 1 project
    chai.expect(createdProjects.length).to.equal(1);
    const createdProj = createdProjects[0];

    // Verify project created properly
    chai.expect(createdProj.id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(createdProj._id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(createdProj.name).to.equal(projData.name);
    chai.expect(createdProj.custom).to.deep.equal(projData.custom);
    chai.expect(createdProj.permissions[adminUser.username]).to.include('read');
    chai.expect(createdProj.permissions[adminUser.username]).to.include('write');
    chai.expect(createdProj.permissions[adminUser.username]).to.include('admin');
    chai.expect(createdProj.org).to.equal(org.id);

    // Verify additional properties
    chai.expect(createdProj.createdBy).to.equal(adminUser.username);
    chai.expect(createdProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(createdProj.archivedBy).to.equal(null);
    chai.expect(createdProj.createdOn).to.not.equal(null);
    chai.expect(createdProj.updatedOn).to.not.equal(null);
    chai.expect(createdProj.archivedOn).to.equal(null);
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
 * @description Creates multiple projects using the project controller
 */
function createProjects(done) {
  const projDataObjects = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3]
  ];

  // Create projects via controller
  ProjController.create(adminUser, org.id, projDataObjects)
  .then((createdProjects) => {
    // Expect createdProjects not to be empty
    chai.expect(createdProjects.length).to.equal(projDataObjects.length);

    // Convert createdProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, createdProjects);
    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);
      const createdProj = jmi2Projects[projectID];

      // Verify project created properly
      chai.expect(createdProj.id).to.equal(projectID);
      chai.expect(createdProj._id).to.equal(projectID);
      chai.expect(createdProj.name).to.equal(projDataObject.name);
      chai.expect(createdProj.custom).to.deep.equal(projDataObject.custom);
      chai.expect(createdProj.permissions[adminUser.username]).to.include('read');
      chai.expect(createdProj.permissions[adminUser.username]).to.include('write');
      chai.expect(createdProj.permissions[adminUser.username]).to.include('admin');
      chai.expect(createdProj.org).to.equal(org.id);

      // Verify additional properties
      chai.expect(createdProj.createdBy).to.equal(adminUser.username);
      chai.expect(createdProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(createdProj.archivedBy).to.equal(null);
      chai.expect(createdProj.createdOn).to.not.equal(null);
      chai.expect(createdProj.updatedOn).to.not.equal(null);
      chai.expect(createdProj.archivedOn).to.equal(null);
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
 * @description Creates or replaces a project using the project controller
 */
function createOrReplaceProject(done) {
  const projData = testData.projects[0];

  // Create project via controller
  ProjController.createOrReplace(adminUser, org.id, projData)
  .then((replacedProjects) => {
    // Expect replacedProjects array to contain 1 project
    chai.expect(replacedProjects.length).to.equal(1);
    const replacedProj = replacedProjects[0];

    // Verify project created/replaced properly
    chai.expect(replacedProj.id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(replacedProj._id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(replacedProj.name).to.equal(projData.name);
    chai.expect(replacedProj.custom).to.deep.equal(projData.custom);
    chai.expect(replacedProj.permissions[adminUser.username]).to.include('read');
    chai.expect(replacedProj.permissions[adminUser.username]).to.include('write');
    chai.expect(replacedProj.permissions[adminUser.username]).to.include('admin');
    chai.expect(replacedProj.org).to.equal(org.id);

    // Verify additional properties
    chai.expect(replacedProj.createdBy).to.equal(adminUser.username);
    chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(replacedProj.archivedBy).to.equal(null);
    chai.expect(replacedProj.createdOn).to.not.equal(null);
    chai.expect(replacedProj.updatedOn).to.not.equal(null);
    chai.expect(replacedProj.archivedOn).to.equal(null);
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
 * @description Creates or replaces multiple projects using the project
 * controller.
 */
function createOrReplaceProjects(done) {
  const projDataObjects = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  // Create projects via controller
  ProjController.createOrReplace(adminUser, org.id, projDataObjects)
  .then((replacedProjects) => {
    // Expect replacedProjects not to be empty
    chai.expect(replacedProjects.length).to.equal(projDataObjects.length);

    // Convert replacedProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, replacedProjects);
    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);
      const replacedProj = jmi2Projects[projectID];

      // Verify project created/replaced properly
      chai.expect(replacedProj.id).to.equal(projectID);
      chai.expect(replacedProj._id).to.equal(projectID);
      chai.expect(replacedProj.name).to.equal(projDataObject.name);
      chai.expect(replacedProj.custom).to.deep.equal(projDataObject.custom);
      chai.expect(replacedProj.permissions[adminUser.username]).to.include('read');
      chai.expect(replacedProj.permissions[adminUser.username]).to.include('write');
      chai.expect(replacedProj.permissions[adminUser.username]).to.include('admin');
      chai.expect(replacedProj.org).to.equal(org.id);

      // Verify additional properties
      chai.expect(replacedProj.createdBy).to.equal(adminUser.username);
      chai.expect(replacedProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(replacedProj.archivedBy).to.equal(null);
      chai.expect(replacedProj.createdOn).to.not.equal(null);
      chai.expect(replacedProj.updatedOn).to.not.equal(null);
      chai.expect(replacedProj.archivedOn).to.equal(null);
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
 * @description Finds a project via the project controller
 */
function findProject(done) {
  const projData = testData.projects[0];

  // Find project via controller
  ProjController.find(adminUser, org.id, projData.id)
  .then((foundProjects) => {
    // Expect foundProjects array to contain 1 project
    chai.expect(foundProjects.length).to.equal(1);
    const foundProj = foundProjects[0];

    // Verify correct project found
    chai.expect(foundProj.id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(foundProj._id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(foundProj.name).to.equal(projData.name);
    chai.expect(foundProj.custom).to.deep.equal(projData.custom);
    chai.expect(foundProj.permissions[adminUser.username]).to.include('read');
    chai.expect(foundProj.permissions[adminUser.username]).to.include('write');
    chai.expect(foundProj.permissions[adminUser.username]).to.include('admin');
    chai.expect(foundProj.org).to.equal(org.id);

    // Verify additional properties
    chai.expect(foundProj.createdBy).to.equal(adminUser.username);
    chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(foundProj.archivedBy).to.equal(null);
    chai.expect(foundProj.createdOn).to.not.equal(null);
    chai.expect(foundProj.updatedOn).to.not.equal(null);
    chai.expect(foundProj.archivedOn).to.equal(null);
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
 * @description Finds multiple projects using the project controller
 */
function findProjects(done) {
  const projDataObjects = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  // Create list of project ids to find
  const projIDs = projDataObjects.map(p => p.id);

  // Find projects via controller
  ProjController.find(adminUser, org.id, projIDs)
  .then((foundProjects) => {
    // Expect foundProjects not to be empty
    chai.expect(foundProjects.length).to.equal(projDataObjects.length);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects);
    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);
      const foundProj = jmi2Projects[projectID];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projectID);
      chai.expect(foundProj._id).to.equal(projectID);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom);
      chai.expect(foundProj.permissions[adminUser.username]).to.include('read');
      chai.expect(foundProj.permissions[adminUser.username]).to.include('write');
      chai.expect(foundProj.permissions[adminUser.username]).to.include('admin');
      chai.expect(foundProj.org).to.equal(org.id);

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser.username);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundProj.archivedBy).to.equal(null);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);
      chai.expect(foundProj.archivedOn).to.equal(null);
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
 * @description Finds all projects on a given organization using the project
 * controller
 */
function findAllProjects(done) {
  const projDataObjects = [
    testData.projects[0],
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  // Find projects via controller
  ProjController.find(adminUser, org.id)
  .then((foundProjects) => {
    // Expect foundProjects not to be empty. Cannot know exact number in db
    chai.expect(foundProjects.length).to.not.equal(0);

    // Convert foundProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, foundProjects);
    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);
      const foundProj = jmi2Projects[projectID];

      // Verify correct project found
      chai.expect(foundProj.id).to.equal(projectID);
      chai.expect(foundProj._id).to.equal(projectID);
      chai.expect(foundProj.name).to.equal(projDataObject.name);
      chai.expect(foundProj.custom).to.deep.equal(projDataObject.custom);
      chai.expect(foundProj.permissions[adminUser.username]).to.include('read');
      chai.expect(foundProj.permissions[adminUser.username]).to.include('write');
      chai.expect(foundProj.permissions[adminUser.username]).to.include('admin');
      chai.expect(foundProj.org).to.equal(org.id);

      // Verify additional properties
      chai.expect(foundProj.createdBy).to.equal(adminUser.username);
      chai.expect(foundProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(foundProj.archivedBy).to.equal(null);
      chai.expect(foundProj.createdOn).to.not.equal(null);
      chai.expect(foundProj.updatedOn).to.not.equal(null);
      chai.expect(foundProj.archivedOn).to.equal(null);
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
 * @description Updates a project using the project controller
 */
function updateProject(done) {
  const projData = testData.projects[0];

  // Create the object to update project
  const updateObj = {
    name: `${projData.name}_edit`,
    id: projData.id
  };

  // Update project via controller
  ProjController.update(adminUser, org.id, updateObj)
  .then((updatedProjects) => {
    // Expect updatedProjects array to contain 1 project
    chai.expect(updatedProjects.length).to.equal(1);
    const updatedProj = updatedProjects[0];

    // Verify correct project updated
    chai.expect(updatedProj.id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(updatedProj._id).to.equal(utils.createID(org.id, projData.id));
    chai.expect(updatedProj.name).to.equal(`${projData.name}_edit`);
    chai.expect(updatedProj.custom).to.deep.equal(projData.custom);
    chai.expect(updatedProj.org).to.equal(org.id);
    chai.expect(updatedProj.permissions[adminUser.username]).to.include('read');
    chai.expect(updatedProj.permissions[adminUser.username]).to.include('write');
    chai.expect(updatedProj.permissions[adminUser.username]).to.include('admin');

    // Verify additional properties
    chai.expect(updatedProj.createdBy).to.equal(adminUser.username);
    chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser.username);
    chai.expect(updatedProj.archivedBy).to.equal(null);
    chai.expect(updatedProj.createdOn).to.not.equal(null);
    chai.expect(updatedProj.updatedOn).to.not.equal(null);
    chai.expect(updatedProj.archivedOn).to.equal(null);
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
 * @description Updates multiple projects using the project controller
 */
function updateProjects(done) {
  const projDataObjects = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  // Create objects to update projects
  const updateObjects = projDataObjects.map(p => ({
    name: `${p.name}_edit`,
    id: p.id
  }));

  // Update projects via controller
  ProjController.update(adminUser, org.id, updateObjects)
  .then((updatedProjects) => {
    // Expect updatedProjects not to be empty
    chai.expect(updatedProjects.length).to.equal(projDataObjects.length);

    // Convert updatedProjects to JMI type 2 for easier lookup
    const jmi2Projects = jmi.convertJMI(1, 2, updatedProjects);
    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);
      const updatedProj = jmi2Projects[projectID];

      // Verify correct project updated
      chai.expect(updatedProj.id).to.equal(projectID);
      chai.expect(updatedProj._id).to.equal(projectID);
      chai.expect(updatedProj.name).to.equal(`${projDataObject.name}_edit`);
      chai.expect(updatedProj.custom).to.deep.equal(projDataObject.custom);
      chai.expect(updatedProj.org).to.equal(org.id);
      chai.expect(updatedProj.permissions[adminUser.username]).to.include('read');
      chai.expect(updatedProj.permissions[adminUser.username]).to.include('write');
      chai.expect(updatedProj.permissions[adminUser.username]).to.include('admin');

      // Verify additional properties
      chai.expect(updatedProj.createdBy).to.equal(adminUser.username);
      chai.expect(updatedProj.lastModifiedBy).to.equal(adminUser.username);
      chai.expect(updatedProj.archivedBy).to.equal(null);
      chai.expect(updatedProj.createdOn).to.not.equal(null);
      chai.expect(updatedProj.updatedOn).to.not.equal(null);
      chai.expect(updatedProj.archivedOn).to.equal(null);
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
 * @description Deletes a project using the project controller
 */
function deleteProject(done) {
  const projData = testData.projects[0];

  // Delete project via controller
  ProjController.remove(adminUser, org.id, projData.id)
  .then((deletedProjects) => {
    // Expect deletedProjects array to contain 1 project
    chai.expect(deletedProjects.length).to.equal(1);
    // Verify correct project deleted
    chai.expect(deletedProjects).to.include(utils.createID(org.id, projData.id));

    // Attempt to find the deleted project
    return ProjController.find(adminUser, org.id, projData.id, { archived: true });
  })
  .then((foundProjects) => {
    // Expect foundProjects array to be empty
    chai.expect(foundProjects.length).to.equal(0);
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
 * @description Deletes multiple projects using the project controller
 */
function deleteProjects(done) {
  const projDataObjects = [
    testData.projects[1],
    testData.projects[2],
    testData.projects[3],
    testData.projects[4]
  ];

  // Create list of project ids to delete
  const projIDs = projDataObjects.map(p => p.id);

  // Delete projects via controller
  ProjController.remove(adminUser, org.id, projIDs)
  .then((deletedProjects) => {
    // Expect deletedProjects not to be empty
    chai.expect(deletedProjects.length).to.equal(projDataObjects.length);

    // Loop through each project data object
    projDataObjects.forEach((projDataObject) => {
      const projectID = utils.createID(org.id, projDataObject.id);

      // Verify correct project deleted
      chai.expect(deletedProjects).to.include(projectID);
    });

    // Attempt to find the deleted projects
    return ProjController.find(adminUser, org.id, projIDs, { archived: true });
  })
  .then((foundProjects) => {
    // Expect foundProjects array to be empty
    chai.expect(foundProjects.length).to.equal(0);
    done();
  })
  .catch((error) => {
    M.log.error(error);
    // Expect no error
    chai.expect(error.message).to.equal(null);
    done();
  });
}
