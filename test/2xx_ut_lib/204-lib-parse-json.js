/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.204-lib-parse-json
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests the parse-json module to verify successful parsing of
 * of JSON files with comments allowed.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const parseJSON = M.require('lib.parse-json');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('Should parse the configuration file', parseTest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Checks to make sure the file is being properly parsed
 */
function parseTest(done) {
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
  const parseString = parseJSON.removeComments(testString);
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
  done();
}
