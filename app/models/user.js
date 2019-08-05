/**
 * Classification: UNCLASSIFIED
 *
 * @module models.user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the user data model.
 */

// Node Modules
const crypto = require('crypto');

// NPM modules
const mongoose = require('mongoose');

// MBEE Modules
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');


/* ----------------------------( Element Model )----------------------------- */

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
 * @property {Object} custom - JSON used to store additional data.
 *
 */
const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: [true, 'Username is required.'],
    match: RegExp(validators.user.username),
    maxlength: [36, 'Too many characters in username'],
    minlength: [3, 'Too few characters in username'],
    validate: {
      validator: function(v) {
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(v);
      },
      message: 'Username cannot include the following words: '
      + `[${validators.reserved}].`
    }
  },
  password: {
    type: String,
    required: false
  },
  email: {
    type: String,
    match: RegExp(validators.user.email),
    default: ''
  },
  fname: {
    type: String,
    default: '',
    match: RegExp(validators.user.fname),
    maxlength: [36, 'Too many characters in first name']
  },
  preferredName: {
    type: String,
    default: '',
    match: RegExp(validators.user.fname),
    maxlength: [36, 'Too many characters in preferred name']
  },
  lname: {
    type: String,
    default: '',
    match: RegExp(validators.user.lname),
    maxlength: [36, 'Too many characters in last name']
  },
  admin: {
    type: Boolean,
    default: false
  },
  provider: {
    type: String,
    validate: {
      validator: function(v) {
        return validators.user.provider(v);
      }
    },
    default: 'local'
  },
  custom: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});
UserSchema.virtual('name')
.get(function() {
  return `${this.fname} ${this.lname}`;
});
UserSchema.virtual('username')
.get(function() {
  return this._id;
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
UserSchema.plugin(extensions);

/* ---------------------------( User Middleware )---------------------------- */
/**
 * @description Run our pre-defined setters on save.
 * @memberOf UserSchema
 */
UserSchema.pre('save', function(next) {
  UserSchema.statics.hashPassword(this);
  next();
});

/* -----------------------------( User Methods )----------------------------- */
/**
 * @description Verifies a password matches the stored hashed password.
 *
 * @param {string} pass  The password to be compared with the stored password.
 * @memberOf UserSchema
 */
UserSchema.methods.verifyPassword = function(pass) {
  return new Promise((resolve, reject) => {
    // Hash the input plaintext password
    crypto.pbkdf2(pass, this._id.toString(), 1000, 32, 'sha256', (err, derivedKey) => {
      // If err, reject it
      if (err) reject(err);

      // Compare the hashed input password with the stored hashed password
      // and return it.
      return resolve(derivedKey.toString('hex') === this.password);
    });
  });
};

/**
 * @description Returns user fields that can be changed
 * @memberOf UserSchema
 */
UserSchema.methods.getValidUpdateFields = function() {
  return ['fname', 'preferredName', 'lname', 'email', 'custom', 'archived', 'admin'];
};

UserSchema.statics.getValidUpdateFields = function() {
  return UserSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf UserSchema
 */
UserSchema.methods.getValidPopulateFields = function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy'];
};

UserSchema.statics.getValidPopulateFields = function() {
  return UserSchema.methods.getValidPopulateFields();
};

/**
 * @description Validates and hashes a password
 */
UserSchema.methods.hashPassword = function() {
  // Require auth module
  const AuthController = M.require('lib.auth');

  // Check validation status NOT successful
  if (!AuthController.validatePassword(this.password, this.provider)) {
    // Failed validation, throw error
    throw new M.DataFormatError('Password validation failed.', 'warn');
  }
  // Hash plaintext password
  if (this.password) {
    const derivedKey = crypto.pbkdf2Sync(this.password, this._id.toString(), 1000, 32, 'sha256');
    this.password = derivedKey.toString('hex');
  }
};

/**
 * @description Validates and hashes a password
 */
UserSchema.statics.hashPassword = function(obj) {
  // Require auth module
  const AuthController = M.require('lib.auth');

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
};

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

/* ---------------------------( User Properties )---------------------------- */
// Required for virtual getters
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

/* -------------------------( User Schema Export )--------------------------- */
// Export mongoose model as 'User'
module.exports = mongoose.model('User', UserSchema);
