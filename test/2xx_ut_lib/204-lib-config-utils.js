/**
 * @classification UNCLASSIFIED
 *
 * @module  test.204-lib-config-utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 * @author Leah De Laurell
 *
 * @description Tests the config utils functions, including the config validator module and the
 * parse-json module to verify successful parsing of of JSON files with comments allowed.
 */

// NPM modules
const chai = require('chai');
const should = chai.should(); // eslint-disable-line no-unused-vars


// MBEE modules
const configUtils = M.require('lib.config-utils');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('Should parse the configuration file', parseTest);
  it('Should validate the configuration file', validateTest);
  it('Should reject an invalid configuration file', rejectInvalidConfigTest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Checks to make sure the file is being properly parsed.
 */
async function parseTest() {
  // Initialize test string
  const testString = '// This is a test file which is used to check and make sure that all comments\n'
    + '// are being parsed out of the file and are resolving in the application as\n'
    + '// valid JSON\n'
    + '{\n'
    + '    // In-line comment test 1\n'
    + '    "key1": null,\n'
    + '    "key2": 1234567890,\n'
    + '    "key3": "string1",\n'
    + '    // In-line comment test 2\n'
    + '    "key4":\n'
    + '    {\n'
    + '        // nested comment test 1\n'
    + '        "nestedKey1": null,\n'
    + '        "nestedKey3": "string2"\n'
    + '        // nested comment test 2\n'
    + '    },\n'
    + '    // In-line comment test 3\n'
    + '    "key5": ["val1", "val2", "val3"]\n'
    + '}\n'
    + '// Final comment test';

  // Initialize expected string after comments removed
  const confirmString = '{\n'
    + '    "key1": null,\n'
    + '    "key2": 1234567890,\n'
    + '    "key3": "string1",\n'
    + '    "key4":\n'
    + '    {\n'
    + '        "nestedKey1": null,\n'
    + '        "nestedKey3": "string2"\n'
    + '    },\n'
    + '    "key5": ["val1", "val2", "val3"]\n'
    + '}';

  // Remove comments from test string
  const parseString = configUtils.removeComments(testString);
  // Expect parseString to equal confirmString
  chai.expect(parseString).to.equal(confirmString);

  try {
    // Try to parse parseString to JSON Object
    JSON.parse(parseString);
  }
  catch (err) {
    M.log.error(err);
    // Expect no error
    chai.expect(true).to.equal(false);
  }
}

/**
 * @description Checks to make sure validate function is working.
 */
async function validateTest() {
  try {
    configUtils.validate(M.config);
  }
  catch (error) {
    should.not.exist(error);
  }
}

/**
 * @description Checks to make sure validate function rejects invalid config objects.
 */
async function rejectInvalidConfigTest() {
  const invalidConfig = {};

  // Test rejection if auth is not defined
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "auth" is not defined.');
  }

  // Test rejection if auth is not an object
  invalidConfig.auth = 'not an object';
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "auth" is not an object.');
  }

  // Test rejection if auth is empty
  invalidConfig.auth = {};
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "auth.strategy" is not defined.');
  }

  // Test rejection if db is not defined
  invalidConfig.auth = M.config.auth;
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "db" is not defined.');
  }

  // Test rejection if log is not defined
  invalidConfig.db = M.config.db;
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "log" is not defined.');
  }

  // Test rejection if server is not defined
  invalidConfig.log = M.config.log;
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "server" is not defined.');
  }

  // Test rejection if test is not defined
  invalidConfig.server = M.config.server;
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "test" is not defined.');
  }

  // Test rejection if artifact is not defined
  invalidConfig.test = M.config.test;
  try {
    configUtils.validate(invalidConfig);
  }
  catch (error) {
    error.message.should.equal('Configuration file: "artifact" is not defined.');
  }
}
