/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Jake Ursetta
 * @author Austin Bieber
 *
 * @description
 * <p>This module defines the user data model. Users are the main operators of
 * MBEE and can be granted certain permission levels on organizations and
 * projects. Users can be set as system-wide admins by setting the admin field
 * to true, can be created using different providers, and can store custom
 * meta-data.</p>
 *
 * <h4>Admin</h4>
 * <p>The admin field is a boolean which defaults to false. If true, the user
 * is a system-wide admin and has permission to do basically anything. Admins
 * have the special ability create/delete users and organizations, which normal
 * users cannot do. This permissions should be given out carefully, and only
 * system-wide admins can grant admin permissions.</p>
 *
 * <h4>Provider</h4>
 * <p>The provider field accepts a string and defaults to the string 'local'.
 * This field is used to allow users from different providers to be created and
 * handled differently. Based on the provider field, different authentication
 * strategies can handle login in different ways, and even validate passwords
 * differently. Currently the supported options are 'local' and 'ldap', which
 * are used by the local-ldap-strategy. Other provider options can be used when
 * different authentication strategies are created.</p>
 *
 * <h4>Custom Data</h4>
 * <p>Custom data is designed to store any arbitrary JSON meta-data. Custom data
 * is stored in an object, and can contain any valid JSON the user desires.
 * Users can update their own custom data. The field "custom" is common to all
 * models, and is added through the extensions plugin.</p>
 */

// Node Modules
const crypto = require('crypto');

// MBEE modules
const db = M.require('lib.db');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');


/* -----------------------------( User Schema )------------------------------ */

/**
 * @namespace
 *
 * @description Defines the User Schema
 *
 * @property {string} _id - The users unique name.
 * @property {string} password - The users password.
 * @property {string} email - The users email.
 * @property {string} fname - The users first name.
 * @property {string} preferredName - The users preferred first name.
 * @property {string} lname - The users last name.
 * @property {boolean} admin - Indicates if the user is a global admin.
 * @property {string} provider - Defines the authentication provider for the
 * user.
 * @property {object} failedLogins - Stores the history of failed login
 * attempts.
 *
 */
const UserSchema = new db.Schema({
  _id: {
    type: 'String',
    required: [true, 'Username is required.'],
    validate: [{
      validator: function(v) {
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(v);
      },
      message: 'Username cannot include the following words: '
      + `[${validators.reserved}].`
    }, {
      validator: function(v) {
        // If the username is longer than max length, reject
        return v.length <= validators.user.usernameLength;
      },
      message: props => `Username length [${props.value.length}] must not be`
        + ` more than ${validators.user.usernameLength} characters.`
    }, {
      validator: function(v) {
        // If the username is shorter than min length, reject
        return v.length > 2;
      },
      message: props => `Username length [${props.value.length}] must not be`
        + ' less than 3 characters.'
    }, {
      validator: function(v) {
        if (typeof validators.user.username === 'string') {
          // If the username is invalid, reject
          return RegExp(validators.user.username).test(v);
        }
        else {
          return validators.user.username(v);
        }
      },
      message: props => `Invalid username [${props.value}].`
    }]
  },
  password: {
    type: 'String',
    required: false
  },
  email: {
    type: 'String',
    default: '',
    validate: [{
      validator: function(v) {
        if (typeof validators.user.email === 'string') {
          // If the email is invalid and provided, reject
          return !(!RegExp(validators.user.email).test(v) && v);
        }
        else {
          return !(!validators.user.email(v) && v);
        }
      },
      message: props => `Invalid email [${props.value}].`
    }]
  },
  fname: {
    type: 'String',
    default: '',
    validate: [{
      validator: function(v) {
        if (typeof validators.user.fname === 'string') {
          // If the fname is invalid and provided, reject
          return !(!RegExp(validators.user.fname).test(v) && v);
        }
        else {
          return !(!validators.user.fname(v) && v);
        }
      },
      message: props => `Invalid first name [${props.value}].`
    }]
  },
  preferredName: {
    type: 'String',
    default: '',
    validate: [{
      validator: function(v) {
        if (typeof validators.user.fname === 'string') {
          // If the preferredName is invalid and provided, reject
          return !(!RegExp(validators.user.fname).test(v) && v);
        }
        else {
          return !(!validators.user.fname(v) && v);
        }
      },
      message: props => `Invalid preferred name [${props.value}].`
    }]
  },
  lname: {
    type: 'String',
    default: '',
    validate: [{
      validator: function(v) {
        if (typeof validators.user.lname === 'string') {
          // If the lname is invalid and provided, reject
          return !(!RegExp(validators.user.lname).test(v) && v);
        }
        else {
          return !(!validators.user.lname(v) && v);
        }
      },
      message: props => `Invalid last name [${props.value}].`
    }]
  },
  admin: {
    type: 'Boolean',
    default: false
  },
  provider: {
    type: 'String',
    validate: [{
      validator: function(v) {
        return validators.user.provider(v);
      },
      message: props => `Invalid provider [${props.value}].`
    }],
    default: 'local'
  },
  failedlogins: {
    type: 'Object',
    default: []
  }
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
UserSchema.plugin(extensions);

/* -----------------------------( User Methods )----------------------------- */
/**
 * @description Verifies a password matches the stored hashed password.
 *
 * @param {object} user - The user object being validated.
 * @param {string} pass - The password to be compared with the stored password.
 * @memberOf UserSchema
 */
UserSchema.static('verifyPassword', function(user, pass) {
  return new Promise((resolve, reject) => {
    // Hash the input plaintext password
    crypto.pbkdf2(pass, user._id.toString(), 1000, 32, 'sha256', (err, derivedKey) => {
      // If err, reject it
      if (err) reject(err);

      // Compare the hashed input password with the stored hashed password
      // and return it.
      return resolve(derivedKey.toString('hex') === user.password);
    });
  });
});

/**
 * @description Returns user fields that can be changed
 * @memberOf UserSchema
 */
UserSchema.static('getValidUpdateFields', function() {
  return ['fname', 'preferredName', 'lname', 'email', 'custom', 'archived', 'admin'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf UserSchema
 */
UserSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy'];
});

/**
 * @description Validates and hashes a password
 * @memberOf UserSchema
 */
UserSchema.static('hashPassword', function(obj) {
  // Require auth module
  const AuthController = M.require('lib.auth');

  // If the provider is not defined, set it the the default, its needed for this fxn
  if (!obj.hasOwnProperty('provider')) {
    obj.provider = 'local';
  }

  // Check validation status NOT successful
  if (!AuthController.validatePassword(obj.password, obj.provider)) {
    // Failed validation, throw error
    throw new M.DataFormatError('Password validation failed.', 'warn');
  }
  // Hash plaintext password
  if (obj.password) {
    const derivedKey = crypto.pbkdf2Sync(obj.password, obj._id.toString(), 1000, 32, 'sha256');
    obj.password = derivedKey.toString('hex');
  }
});

/* ------------------------------( User Index )------------------------------ */
/**
 * @description Adds a compound text index on the first name, preferred name,
 * and last name of the user.
 * @memberOf UserSchema
 */
UserSchema.index({
  fname: 'text',
  preferredName: 'text',
  lname: 'text'
});

/* -------------------------( User Schema Export )--------------------------- */
// Export model as 'User'
module.exports = new db.Model('User', UserSchema, 'users');
