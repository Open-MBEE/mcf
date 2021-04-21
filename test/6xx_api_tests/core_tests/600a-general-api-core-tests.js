/**
 * @classification UNCLASSIFIED
 *
 * @module test.600a-general-api-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Phillip Lee
 *
 * @description Tests the API functionality. Confirms API and swagger API
 * documentation is up. Testing these endpoints also confirms that server has
 * started.
 */

// NPM modules
const chai = require('chai');
const axios = require('axios');

// MBEE modules
const test = M.config.test;

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  /* Execute the tests */
  it('should confirm that the API is up', upTest);
  it('should confirm that swagger.json API documentation is up', swaggerJSONTest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Verifies the API is up and running.
 */
async function upTest() {
  try {
    const options = {
      method: 'get',
      url: `${test.url}/api/test`
    };

    // Make an API request
    const res = await axios(options);

    // Expect status 200 OK
    chai.expect(res.status).to.equal(200);
    // Expect body to be an empty string
    chai.expect(res.data).to.equal('');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}

/**
 * @description Verifies swagger API documentation is up and running.
 */
async function swaggerJSONTest() {
  // API GET request swagger documentation
  try {
    const options = {
      method: 'get',
      url: `${test.url}/api/doc/swagger.json`
    };

    // Make an API request
    const res = await axios(options);

    // Expect status 200 OK
    chai.expect(res.status).to.equal(200);

    // Expect body is valid JSON
    chai.expect(res.data).to.be.an('object');
  }
  catch (error) {
    M.log.error(error);
    // Expect no error
    chai.expect(error).to.equal(null);
  }
}
