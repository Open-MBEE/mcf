/**
 * Classification: UNCLASSIFIED
 *
 * @module models.organization
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the organization data model.
 */

// NPM modules
const mongoose = require('mongoose');

// MBEE modules
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');

/* -------------------------( Organization Schema )-------------------------- */

/**
 * @namespace
 *
 * @description Defines the Organization Schema
 *
 * @property {string} _id - The organization's unique ID.
 * @property {string} name - The organization's name.
 * @property {Object} permissions - An object whose keys identify an
 * organization's roles. The keys are usernames and the values are arrays
 * containing the users permissions.
 * @property {Object} custom - JSON used to store additional data.
 *
 */
const OrganizationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    match: RegExp(validators.org.id),
    maxlength: [36, 'Too many characters in ID'],
    minlength: [2, 'Too few characters in ID'],
    validate: {
      validator: function(v) {
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(v);
      },
      message: 'Organization ID cannot include the following words: '
        + `[${validators.reserved}].`
    }
  },
  name: {
    type: String,
    required: true
  },
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  custom: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

OrganizationSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'org',
  justOne: false
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
OrganizationSchema.plugin(extensions);

/* -------------------------( Organization Methods )------------------------- */
/**
 * @description Returns supported permission levels
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getPermissionLevels = function() {
  return ['remove_all', 'read', 'write', 'admin'];
};
OrganizationSchema.statics.getPermissionLevels = function() {
  return OrganizationSchema.methods.getPermissionLevels();
};

/**
 * @description Returns organization fields that can be changed
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getValidUpdateFields = function() {
  return ['name', 'custom', 'archived', 'permissions'];
};
OrganizationSchema.statics.getValidUpdateFields = function() {
  return OrganizationSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf OrganizationSchema
 */
OrganizationSchema.methods.getValidPopulateFields = function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'projects'];
};

OrganizationSchema.statics.getValidPopulateFields = function() {
  return OrganizationSchema.methods.getValidPopulateFields();
};


/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the organization model.
 *
 * @param {Object} object - Object for key verification.
 *
 * @return {boolean} The boolean indicating if the object contained only
 * existing fields.
 */
OrganizationSchema.statics.validateObjectKeys = function(object) {
  // Initialize returnBool to true
  let returnBool = true;
  // Set list array of valid keys
  const validKeys = Object.keys(OrganizationSchema.paths);
  // Add 'id' to list of valid keys, for 0.6.0 support
  validKeys.push('id');
  // Check if the object is NOT an instance of the organization model
  if (!(object instanceof mongoose.model('Organization', OrganizationSchema))) {
    // Loop through each key of the object
    Object.keys(object).forEach(key => {
      // Check if the object key is a key in the organization model
      if (!validKeys.includes(key)) {
        // Key is not in organization model, return false
        returnBool = false;
      }
    });
  }
  // All object keys found in organization model or object was an instance of
  // organization model, return true
  return returnBool;
};


/* -----------------------( Organization Properties )------------------------ */

// Required for virtual getters
OrganizationSchema.set('toJSON', { virtuals: true });
OrganizationSchema.set('toObject', { virtuals: true });


/* ----------------------( Organization Schema Export )---------------------- */

// Export mongoose model as "Organization"
module.exports = mongoose.model('Organization', OrganizationSchema);
