/**
 * @classification UNCLASSIFIED
 *
 * @module lib.config-utils
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 * @author Jake Ursetta
 *
 * @description Provides utilities for handling .cfg files, specifically
 * removing comments and validating the format.
 */

// Node modules
const fs = require('fs');
const path = require('path');


/**
 * @description A helper function to simplify testing the existence and types of
 * config keys.
 *
 * @param {object} config - The json object version of the config file.
 * @param {string} key - The key of the config to test.
 * @param {string} type - The type that this key should be.
 */
function test(config, key, type) {
  const keys = key.split('.');

  // Get the field from an arbitrary depth of key nesting
  let field = config;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    field = field[k];
  }

  // Test that the field exists.
  if (field === undefined) {
    throw new Error(`Configuration file: "${key}" is not defined.`);
  }

  // Test that the field is the correct type.
  if (type === 'object') {
    if (typeof field !== 'object' || field === null) {
      throw new Error(`Configuration file: "${key}" is not an object.`);
    }
  }
  else if (type === 'Array') {
    if (!Array.isArray(field)) {
      throw new Error(`Configuration file: "${key}" is not an array.`);
    }
  }
  else if (type === 'number') {
    const num = parseInt(field, 10);
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(num)) throw new Error(`Configuration file: "${key}" is not a number.`);
  }
  // eslint-disable-next-line valid-typeof
  else if (typeof field !== type) {
    throw new Error(`Configuration file: "${key}" is not a ${type}.`);
  }
}

/**
 * @description This function checks every field in the config to validate that
 * it is formatted properly. It will also search for specified strategy,
 * docker file, and CA files to validate that they exist.
 *
 * @param {object} config - The configuration settings object.
 */
module.exports.validate = function(config) {
  // ----------------------------- Verify auth ----------------------------- //
  test(config, 'auth', 'object');
  test(config, 'auth.strategy', 'string');
  const authStrategies = ['local-strategy', 'ldap-strategy', 'local-ldap-strategy'];
  if (!authStrategies.includes(config.auth.strategy)) {
    throw new Error(`Configuration file: ${config.auth.strategy} in "auth.strategy" is not a valid`
    + 'authentication strategy.');
  }
  const stratFiles = fs.readdirSync(path.join(M.root, 'app', 'auth'))
  .filter((file) => file.includes(config.auth.strategy));
  if (stratFiles.length === 0) {
    throw new Error(
      `Configuration file: Auth strategy file ${config.auth.strategy} not found in app/auth directory.`
    );
  }

  if (config.auth.strategy.includes('ldap')) {
    test(config, 'auth.ldap', 'object');
    test(config, 'auth.ldap.url', 'string');
    test(config, 'auth.ldap.port', 'number');

    // Check that the ca files exist
    if (config.auth.ldap.ca) {
      test(config, 'auth.ldap.ca', 'Array');
      config.auth.ldap.ca.forEach((ca) => {
        if (typeof ca !== 'string') {
          throw new Error('Configuration file: One or more items in "auth.ldap.ca" is not a string.');
        }
        const caFile = fs.readdirSync(path.isAbsolute(ca) ? path.dirname(ca) : path.join(M.root, 'certs'))
        .filter((file) => ca.includes(file));
        if (caFile.length === 0) {
          throw new Error(`Configuration file: CA file ${ca} not found in specified directory.`);
        }
      });
    }

    test(config, 'auth.ldap.bind_dn', 'string');
    test(config, 'auth.ldap.bind_dn_pass', 'string');
    test(config, 'auth.ldap.base', 'string');
    test(config, 'auth.ldap.filter', 'string');
    test(config, 'auth.ldap.attributes', 'object');
    test(config, 'auth.ldap.attributes.username', 'string');
    test(config, 'auth.ldap.attributes.firstName', 'string');
    test(config, 'auth.ldap.attributes.preferredName', 'string');
    test(config, 'auth.ldap.attributes.lastName', 'string');
    test(config, 'auth.ldap.attributes.email', 'string');
  }
  test(config, 'auth.token', 'object');
  test(config, 'auth.token.expires', 'number');
  test(config, 'auth.token.units', 'string');
  test(config, 'auth.session', 'object');
  test(config, 'auth.session.expires', 'number');
  test(config, 'auth.session.units', 'string');
  if (config.auth.oldPasswords) test(config, 'auth.oldPasswords', 'number');


  // ----------------------------- Verify db ----------------------------- //
  test(config, 'db', 'object');
  test(config, 'db.strategy', 'string');

  // Ensure that the db strategy directory exists
  const dirs = fs.readdirSync(path.join(M.root, 'app', 'db'))
  .filter((file) => file.includes(config.db.strategy));
  if (dirs.length === 0) {
    throw new Error(`Configuration file: DB strategy directory ${config.db.strategy} not found in app/db directory.`);
  }

  // Ensure that the db strategy exists
  const dbFiles = fs.readdirSync(path.join(M.root, 'app', 'db', config.db.strategy))
  .filter((file) => file.includes(config.db.strategy));
  if (dbFiles.length === 0) {
    throw new Error(`Configuration file: DB strategy file ${config.db.strategy}`
      + ` not found in app/db/${config.db.strategy} directory.`);
  }

  // Test supported database
  if (config.db.strategy === 'mongoose-mongodb-strategy') {
    if (typeof config.db.seedList !== 'undefined') {
      test(config, 'db.seedList', 'Array');
    }
    else {
      test(config, 'db.url', 'string');
      test(config, 'db.port', 'number');
    }
    test(config, 'db.name', 'string');

    // Test optional fields
    if (config.db.username !== undefined) test(config, 'db.username', 'string');
    if (config.db.password !== undefined) test(config, 'db.password', 'string');
    if (config.db.ssl !== undefined) test(config, 'db.ssl', 'boolean');

    // If ssl is enabled, validate the ca file
    if (config.db.ssl) {
      test(config, 'db.ca', 'string');
      const caFile = fs.readdirSync(path.isAbsolute(config.db.ca) ? path.dirname(config.db.ca) : path.join(M.root, 'certs'))
      .filter((file) => config.db.ca.includes(file));
      if (caFile.length === 0) {
        throw new Error(`Configuration file: CA file ${config.db.ca} not found in certs directory.`);
      }
    }
  }
  // Test DynamoDB strategy
  else if (config.db.strategy === 'dynamodb-strategy') {
    test(config, 'db.url', 'string');
    test(config, 'db.port', 'number');
    test(config, 'db.accessKeyId', 'string');
    test(config, 'db.secretAccessKey', 'string');
    test(config, 'db.region', 'string');
    test(config, 'db.ssl', 'boolean');
    test(config, 'db.billingMode', 'string');
    // Ensure billing mode is either PAY_PER_REQUEST or PROVISIONED
    if (config.db.billingMode !== 'PAY_PER_REQUEST' && config.db.billingMode !== 'PROVISIONED') {
      throw new Error('DynamoDB Billing Mode must either be "PAY_PER_REQUEST" or "PROVISIONED".');
    }
    // Test the optional proxy field
    if (config.db.proxy) {
      test(config, 'db.proxy', 'string');
    }
  }


  // ----------------------------- Verify docker ----------------------------- //
  if (config.docker) {
    test(config, 'docker.image', 'object');
    test(config, 'docker.image.name', 'string');
    test(config, 'docker.container', 'object');
    test(config, 'docker.container.name', 'string');
    test(config, 'docker.db', 'object');
    test(config, 'docker.db.enabled', 'boolean');
    if (config.docker.db.enabled) test(config, 'docker.db.port', 'number');
    test(config, 'docker.http', 'object');
    test(config, 'docker.http.enabled', 'boolean');
    if (config.docker.http.enabled) test(config, 'docker.http.port', 'number');
    test(config, 'docker.https', 'object');
    test(config, 'docker.https.enabled', 'boolean');
    if (config.docker.https.enabled) test(config, 'docker.https.port', 'number');

    // Ensure the Dockerfile exists
    test(config, 'docker.Dockerfile', 'string');
    const dockerPaths = config.docker.Dockerfile.split('/');
    let dockerPath = M.root;
    for (let i = 0; i < (dockerPaths.length - 1); i++) {
      dockerPath = path.join(dockerPath, dockerPaths[i]);
    }
    const Dockerfile = dockerPaths[dockerPaths.length - 1];
    const findDockerfile = fs.readdirSync(dockerPath)
    .filter((file) => file === Dockerfile);
    if (findDockerfile.length === 0) {
      throw new Error(`Configuration file: Dockerfile ${Dockerfile} not found in specified directory.`);
    }
  }

  // ----------------------------- Verify log ----------------------------- //
  test(config, 'log', 'object');
  test(config, 'log.level', 'string');
  const logLevels = ['info', 'verbose', 'debug', 'warn', 'error', 'critical'];
  if (!logLevels.includes(config.log.level)) {
    throw new Error(`Configuration file: ${config.log.level} in "log.level" is not a valid`
      + 'log level.');
  }
  test(config, 'log.file', 'string');
  test(config, 'log.error_file', 'string');
  test(config, 'log.debug_file', 'string');
  test(config, 'log.security_file', 'string');
  test(config, 'log.colorize', 'boolean');

  // ----------------------------- Verify server ----------------------------- //
  test(config, 'server', 'object');
  test(config, 'server.defaultAdminUsername', 'string');
  test(config, 'server.defaultAdminPassword', 'string');
  test(config, 'server.defaultOrganizationId', 'string');
  test(config, 'server.defaultOrganizationName', 'string');
  test(config, 'server.http', 'object');
  test(config, 'server.http.enabled', 'boolean');
  if (config.server.http.enabled) test(config, 'server.http.port', 'number');
  test(config, 'server.https', 'object');
  test(config, 'server.https.enabled', 'boolean');
  if (config.server.https.enabled) test(config, 'server.http.port', 'number');
  if (config.server.requestSize) {
    limitRequestSize(config.server.requestSize);
  }
  test(config, 'server.api', 'object');
  test(config, 'server.api.enabled', 'boolean');
  if (config.server.api.enabled) {
    test(config, 'server.api.json', 'object');
    test(config, 'server.api.json.indent', 'number');
    if (config.server.api.userAPI) test(config, 'server.api.userAPI', 'object');
    if (config.server.api.userAPI.get) test(config, 'server.api.userAPI.get', 'boolean');
    if (config.server.api.userAPI.post) test(config, 'server.api.userAPI.post', 'boolean');
    if (config.server.api.userAPI.patch) test(config, 'server.api.userAPI.patch', 'boolean');
    if (config.server.api.userAPI.put) test(config, 'server.api.userAPI.put', 'boolean');
    if (config.server.api.userAPI.patchPassword) test(config, 'server.api.userAPI.patchPassword', 'boolean');
    if (config.server.api.userAPI.delete) test(config, 'server.api.userAPI.delete', 'boolean');
  }
  if (config.server.hasOwnProperty('uniqueProjects')) test(config, 'server.uniqueProjects', 'boolean');
  test(config, 'server.plugins', 'object');
  test(config, 'server.plugins.enabled', 'boolean');
  if (config.server.plugins.enabled) {
    test(config, 'server.plugins.plugins', 'object');
    Object.keys(config.server.plugins.plugins).forEach((pluginName) => {
      test(config, `server.plugins.plugins.${pluginName}`, 'object');
      test(config, `server.plugins.plugins.${pluginName}.title`, 'string');
      test(config, `server.plugins.plugins.${pluginName}.source`, 'string');
      if (config.server.plugins.plugins[pluginName].testOnStartup) {
        test(config, `server.plugins.plugins.${pluginName}.testOnStartup`, 'boolean');
      }
    });
  }
  test(config, 'server.ui', 'object');
  test(config, 'server.ui.enabled', 'boolean');
  if (config.server.ui.enabled) {
    test(config, 'server.ui.mode', 'string');
    test(config, 'server.ui.banner', 'object');
    test(config, 'server.ui.banner.on', 'boolean');
    if (config.server.ui.banner.on) {
      test(config, 'server.ui.banner.message', 'string');
      test(config, 'server.ui.banner.color', 'string');
      test(config, 'server.ui.banner.background', 'string');
      test(config, 'server.ui.banner.bold', 'boolean');
      test(config, 'server.ui.banner.border', 'string');
    }
    test(config, 'server.ui.loginModal', 'object');
    test(config, 'server.ui.loginModal.on', 'boolean');
    if (config.server.ui.loginModal.on) {
      test(config, 'server.ui.loginModal.message', 'string');
    }
  }
  test(config, 'server.secret', 'string');

  // ----------------------------- Verify test ----------------------------- //
  test(config, 'test', 'object');
  test(config, 'test.url', 'string');

  // --------------------------- Verify validators -------------------------- //
  if (config.validators) {
    test(config, 'validators', 'object');
    const rootIDs = ['model', '__mbee__', 'undefined', 'holding_bin', 'master',
      config.server.defaultOrganizationId, config.server.defaultAdminUsername];
    const elemIDs = ['model', '__mbee__', 'undefined', 'holding_bin'];
    if (config.validators.id) test(config, 'validators.id', 'string');
    if (config.validators.id) {
      // Check that custom id validators don't exclude root ids
      rootIDs.forEach((id) => {
        if (!RegExp(config.validators.id).test(id)) {
          throw new Error(`Configuration file: custom id regex excludes root id "${id}".`);
        }
      });
    }
    if (config.validators.id_length) {
      test(config, 'validators.id_length', 'number');
      const minLength = rootIDs.map((id) => id.length).reduce((a, b) => Math.max(a, b));
      if (config.validators.id_length < minLength) {
        // Check that custom id validators don't exclude root ids
        throw new Error(`Configuration file: custom id length "${config.validators.id_length}" is `
        + `too short.  The minimum length must be ${minLength} to account for root element ids, `
        + 'the default org id, and/or the default admin username.');
      }
    }
    if (config.validators.element_id) {
      test(config, 'validators.element_id', 'string');
      // Check that custom id validators don't exclude root ids
      elemIDs.forEach((id) => {
        if (!RegExp(config.validators.element_id).test(id)) {
          throw new Error(`Configuration file: custom element id regex excludes root id "${id}".`);
        }
      });
    }
    if (config.validators.element_id_length) {
      test(config, 'validators.element_id_length', 'number');
      // Check that custom id validators don't exclude root ids
      if (config.validators.element_id_length < 11) {
        throw new Error(`Configuration file: custom element id length "${config.validators.id_length}" is too short.`);
      }
    }
    if (config.validators.org_id) {
      test(config, 'validators.org_id', 'string');
      if (!RegExp(config.validators.org_id).test(config.server.defaultOrganizationId)) {
        throw new Error(`Configuration file: custom org id regex excludes default org id "${config.server.defaultOrganizationId}".`);
      }
    }
    if (config.validators.org_id_length) {
      test(config, 'validators.org_id_length', 'number');
      if (config.validators.org_id_length < config.server.defaultOrganizationId.length) {
        throw new Error('Configuration file: custom org id length '
        + `"${config.validators.org_id_length}" is shorter than the length of the default org id.`);
      }
    }
    if (config.validators.project_id) test(config, 'validators.project_id', 'string');
    if (config.validators.project_id_length) test(config, 'validators.project_id_length', 'number');
    if (config.validators.branch_id) test(config, 'validators.branch_id', 'string');
    if (config.validators.branch_id_length) test(config, 'validators.branch_id_length', 'number');
    if (config.validators.user_username) {
      test(config, 'validators.user_username', 'string');
      if (!RegExp(config.validators.user_username).test(config.server.defaultAdminUsername)) {
        throw new Error(`Configuration file: custom username regex excludes default admin username "${config.server.defaultAdminUsername}".`);
      }
    }
    if (config.validators.user_username_length) {
      test(config, 'validators.user_username_length', 'number');
      if (config.validators.user_username_length < config.server.defaultAdminUsername.length) {
        throw new Error('Configuration file: custom username length '
        + `"${config.validators.user_username_length}" is shorter than the length of the default admin username.`);
      }
    }
    if (config.validators.user_email) test(config, 'validators.user_email', 'string');
    if (config.validators.user_fname) test(config, 'validators.user_fname', 'string');
    if (config.validators.user_lname) test(config, 'validators.user_lname', 'string');
    if (config.validators.user_provider) test(config, 'validators.user_provider', 'string');
    if (config.validators.url_next) test(config, 'validators.url_next', 'string');
  }

  // ----------------------------- Verify Artifact ----------------------------- //
  test(config, 'artifact', 'object');
  test(config, 'artifact.strategy', 'string');
  // Check that the strategy file exists
  const artStratFiles = fs.readdirSync(path.join(M.root, 'app', 'artifact'))
  .filter((file) => file === `${config.artifact.strategy}.js`);
  if (artStratFiles.length === 0) {
    throw new Error(
      `Configuration file: Artifact strategy file ${config.artifact.strategy} not found in app/artifact directory.`
    );
  }

  // Test s3 artifact
  if (config.artifact.strategy === 's3-strategy') {
    test(config, 'artifact.s3.Bucket', 'string');
    test(config, 'artifact.s3.accessKeyId', 'string');
    test(config, 'artifact.s3.secretAccessKey', 'string');
    test(config, 'artifact.s3.region', 'string');
    // If CA is defined
    if (config.artifact.s3.ca) {
      // Validate the ca file
      test(config, 'artifact.s3.ca', 'string');
      const caFile = fs.readdirSync(path.isAbsolute(config.artifact.s3.ca) ? path.dirname(config.artifact.s3.ca) : path.join(M.root, 'certs'))
      .filter((file) => config.artifact.s3.ca.includes(file));
      if (caFile.length === 0) {
        throw new Error(`Configuration file: CA file ${config.artifact.s3.ca} not found in certs directory.`);
      }
    }
    // Test the optional proxy field
    if (config.artifact.s3.proxy) {
      test(config, 'artifact.s3.proxy', 'string');
    }
  }
};

/**
 * @description This function removes comments from a string separated by new
 * line characters to convert commented JSON to valid JSON.
 *
 * @param {string} inputString - The name of the file to parse.
 *
 * @returns {object} Valid JSON object.
 */
module.exports.removeComments = function(inputString) {
  // Ensure inputString is of type string
  if (typeof inputString !== 'string') {
    throw new M.DataFormatError('Value is not a string.', 'warn');
  }

  // Attempt to read file into array separated by each newline character.
  const arrStringSep = inputString.split('\n');

  // Remove all array elements that start with '//', the JS comment identifier
  const arrCommRem = arrStringSep.filter(line => !RegExp(/^ *\/\//).test(line));

  // Join the array into a single string separated by new line characters
  // Return the now-valid JSON
  return arrCommRem.join('\n');
};

/**
 * @description Removes '^' and '$' from the RegEx of custom validators because those characters
 * are factored in in the validators.js file.
 *
 * @param {object} configObj - The config object, before it gets frozen on the M object.
 */
module.exports.parseRegEx = function(configObj) {
  if (configObj.hasOwnProperty('validators')) {
    Object.keys(configObj.validators).forEach((key) => {
      // Only search custom id validators, not id length validators
      if (typeof configObj.validators[key] === 'string' && !key.includes('length')) {
        // Remove ^ and $ from custom validator regex strings
        configObj.validators[key] = configObj.validators[key].replace(/\^|\$/g, (match, offset, string) => {
          if (offset !== 0 && string[offset - 1] === '\\') {
            return match;
          }
          else {
            return '';
          }
        });
      }
    });
  }
};

/**
 * @description A helper function specifically to parse and validate the requestSize server option.
 *
 * @param {string} size - The requestSize specified in the config file.
 */
function limitRequestSize(size) {
  if (typeof size !== 'string') throw new Error('Configuration file: requestSize is not a string.');
  // Extract the number and the unit from the string
  const number = Number(size.match(/(\d+)/g)[0]);
  const unit = size.match(/(\D+)/g)[0];
  switch (unit) {
    case 'kb':
      if (number > 1024 * 1024) {
        throw new Error('Configuration file: requestSize cannot be greater than 1 gb.');
      }
      break;
    case 'mb':
      if (number > 1024) {
        throw new Error('Configuration file: requestSize cannot be greater than 1 gb.');
      }
      break;
    case 'gb':
      if (number > 1) {
        throw new Error('Configuration file: requestSize cannot be greater than 1 gb.');
      }
      break;
    default:
      throw new Error('Configuration file: invalid format for requestSize.');
  }
}
