/**
 * @classification UNCLASSIFIED
 *
 * @module test.610-metrics-api-core-test
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Phillip Lee
 *
 * @author Phillip Lee
 *
 * @description Tests the test metrics API endpoint.
 */

// NPM modules
const chai = require('chai');
const axios = require('axios');

// MBEE modules
const utils = M.require('lib.utils');

/* --------------------( Test Data )-------------------- */
const testUtils = M.require('lib.test-utils');
const test = M.config.test;
let org = null;
let adminUser = null;
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
   * Before: Create admin, organization, and project.
   */
  before(async () => {
    try {
      // Create test admin
      adminUser = await testUtils.createTestAdmin();
      // Create org
      org = await testUtils.createTestOrg(adminUser);
      // Create project
      const retProj = await testUtils.createTestProject(adminUser, org._id);
      projID = utils.parseID(retProj._id).pop();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error.message).to.equal(null);
    }
  });

  /**
   * After: Delete organization and admin user.
   */
  after(async () => {
    try {
      // Delete organization
      await testUtils.removeTestOrg();
      // Delete admin user
      await testUtils.removeTestAdmin();
    }
    catch (error) {
      M.log.error(error);
      // Expect no error
      chai.expect(error).to.equal(null);
    }
  });

  /* Execute the tests */
  it('should run metrics test.', runMetrics);
});

/* --------------------( Tests )-------------------- */
/**
 * @description This function tests the metrics endpoint.
 */
async function runMetrics() {
  try {
    const options = {
      method: 'post',
      url: `${test.url}/api/orgs/${org._id}/projects/${projID}/branches/master/metrics`,
      headers: testUtils.getHeaders()
    };

    // Make an API request
    const res = await axios(options);

    // Expect response status: 200 OK
    chai.expect(res.status).to.equal(200);
    // Verify response body
    const metricsData = res.data;

    // Verify project metrics data
    chai.expect(metricsData.hasOwnProperty('NumOfElems')).to.equal(true);
    chai.expect(metricsData.hasOwnProperty('Users')).to.equal(true);
    chai.expect(metricsData.Users).to.include(adminUser._id);
    chai.expect(metricsData.hasOwnProperty('LastModifiedDaysAgo')).to.equal(true);
    chai.expect(metricsData.LastModifiedDaysAgo).to.equal('0');
    chai.expect(metricsData.hasOwnProperty('Types')).to.equal(true);
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
