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
 * @owner Phillip Lee
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
const db = M.require('db');
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
 * @property {string} provider - Defines the authentication provider for the user.
 * @property {object} failedlogins - Stores the history of failed login attempts.
 * @property {object} oldPasswords - Stores previous passwords; used to prevent users
 * from re-using recent passwords.
 *
 */
const UserSchema = new db.Schema({
  _id: {
    type: 'String',
    required: [true, 'Username is required.'],
    validate: [{
      validator: validators.user._id.reserved,
      message: props => 'Username cannot include the following words: '
      + `[${validators.reserved}].`
    }, {
      validator: validators.user._id.match,
      message: props => `Invalid username [${props.value}].`
    }, {
      validator: validators.user._id.maxLength,
      message: props => `Username length [${props.value.length}] must not be`
        + ` more than ${validators.user.usernameLength} characters.`
    }, {
      validator: validators.user._id.minLength,
      message: props => `Username length [${props.value.length}] must not be`
        + ' less than 3 characters.'
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
      validator: validators.user.fname,
      message: props => `Invalid first name [${props.value}].`
    }]
  },
  preferredName: {
    type: 'String',
    default: '',
    validate: [{
      validator: validators.user.preferredName,
      message: props => `Invalid preferred name [${props.value}].`
    }]
  },
  lname: {
    type: 'String',
    default: '',
    validate: [{
      validator: validators.user.lname,
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
      validator: validators.user.provider,
      message: props => `Invalid provider [${props.value}].`
    }],
    default: 'local',
    immutable: true
  },
  failedlogins: {
    type: 'Object',
    default: []
  },
  oldPasswords: {
    type: 'Object'
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
  // Hash the input plaintext password
  const derivedKey = crypto.pbkdf2Sync(pass, user._id.toString(), 1000, 32, 'sha256');
  // Compare the hashed input password with the stored hashed password
  // and return it.
  return derivedKey.toString('hex') === user.password;
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

  // If the provider is not defined, set it the the default, it's needed for this fxn
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

/**
 * @description Checks that the new password does not match any of the stored previous passwords
 *
 * @param {object} user - The user object being validated.
 * @param {string} pass - The new password to be compared with the old passwords.
 * @memberOf UserSchema
 */
UserSchema.static('checkOldPasswords', function(user, pass) {
  // Check that this feature is enabled in the config file
  // This check should only be run on users stored locally
  if (M.config.auth.hasOwnProperty('oldPasswords')
    && (!user.hasOwnProperty('provider') || user.provider === 'local')) {
    // Get the hash of the new password
    const newPassword = crypto.pbkdf2Sync(pass, user._id.toString(), 1000, 32, 'sha256');

    // Add the current password to the list of old passwords
    if (!user.hasOwnProperty('oldPasswords')) user.oldPasswords = [user.password];
    else user.oldPasswords.push(user.password);

    // Check that the user hasn't reused a recent password
    if (user.oldPasswords.includes(newPassword.toString('hex'))) {
      throw new M.OperationError('Password has been used too recently.', 'warn');
    }

    // Trim the list of old passwords if necessary
    if (user.oldPasswords.length > M.config.auth.oldPasswords) {
      user.oldPasswords.shift();
    }

    // Return the new list of old passwords to be used in an update
    return user.oldPasswords;
  }
  return [];
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
