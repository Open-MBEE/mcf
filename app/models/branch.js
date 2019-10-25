/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.branch
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Josh Kaplan
 * @author Leah De Laurell
 * @author Austin Bieber
 *
 * @description
 * <p>This module defines the branch data model. Branches contain elements which
 * make up a model. Every branch should at least contain 4 elements; the root
 * "model" element contains an "__mbee__" package, which contains an "undefined"
 * element and "holding_bin". Every element which gets created is placed under
 * the root model element unless otherwise specified. Branches contain two
 * unique fields, a reference to the source branch and a boolean field denoting
 * if the branch is a tag. Branches also have the ability to store custom
 * meta-data.</p>
 *
 * <h4>Source</h4>
 * <p>The source field is a reference to the branch which the current branch was
 * branched from. The value stored in this field should be a concatenated id in
 * the form org:project:branch. By default, the master branch has a source of
 * null.</p>
 *
 * <h4>Tag</h4>
 * <p>The tag field is a boolean which is false by default. If true, the branch
 * becomes a tag and no new elements can be created, updated or deleted for that
 * branch. Tags are designed to be read-only moments in the model and allow for
 * quick retrieval of the model at a certain point in time.</p>
 *
 * <h4>Custom Data</h4>
 * <p>Custom data is designed to store any arbitrary JSON meta-data. Custom data
 * is stored in an object, and can contain any valid JSON the user desires.
 * Only users with write and admin permissions on the project can update the
 * branch's custom data. The field "custom" is common to all models, and is
 * added through the extensions plugin.</p>
 */

// MBEE modules
const db = M.require('lib.db');
const validators = M.require('lib.validators');
const utils = M.require('lib.utils');
const extensions = M.require('models.plugin.extensions');


/* ----------------------------( Branch Model )----------------------------- */
/**
 * @namespace
 *
 * @description The base schema definition inherited by all other branch types.
 *
 * @property {string} _id - The branches non-unique branch ID.
 * or taken from another source if imported.
 * @property {string} name - The branches non-unique name.
 * @property {string} project - A reference to an branch's project.
 * @property {string} tag - Verifying if the branch is a tagged branch.
 *
 */
const BranchSchema = new db.Schema({
  _id: {
    type: 'String',
    required: true,
    validate: [{
      validator: function(v) {
        const branchID = utils.parseID(v).pop();
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(branchID);
      },
      message: 'Branch ID cannot include the following words: '
        + `[${validators.reserved}].`
    }, {
      validator: function(v) {
        // If the ID is longer than max length, reject
        return v.length <= validators.branch.idLength;
      },
      // Return a message, with calculated length of branch ID (branch.max - project.max - :)
      message: props => `Branch ID length [${props.value.length - validators.project.idLength - 1}]`
        + ` must not be more than ${validators.branch.idLength - validators.project.idLength - 1}`
        + ' characters.'
    }, {
      validator: function(v) {
        // If the ID is shorter than min length, reject
        return v.length > 7;
      },
      // Return a message, with calculated length of branch ID (branch.min - project.min - :)
      message: props => `Branch ID length [${props.value.length - 6}] must not`
        + ' be less than 2 characters.'
    }, {
      validator: function(v) {
        // If the ID is invalid, reject
        return RegExp(validators.branch.id).test(v);
      },
      message: props => `Invalid branch ID [${utils.parseID(props.value).pop()}].`
    }]
  },
  project: {
    type: 'String',
    ref: 'Project',
    required: true,
    index: true,
    validate: [{
      validator: function(v) {
        return RegExp(validators.project.id).test(v);
      },
      message: props => `${props.value} is not a valid project ID.`
    }]
  },
  name: {
    type: 'String',
    default: ''
  },
  source: {
    type: 'String',
    ref: 'Branch',
    default: null,
    validate: [{
      validator: function(v) {
        return RegExp(validators.branch.id).test(v) || (v === null);
      },
      message: props => `${props.value} is not a valid source ID.`
    }]
  },
  tag: {
    type: 'Boolean',
    default: false
  }
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
BranchSchema.plugin(extensions);

/* ---------------------------( Branch Methods )---------------------------- */
/**
 * @description Returns branch fields that can be changed
 * @memberOf BranchSchema
 */
BranchSchema.method('getValidUpdateFields', function() {
  return ['name', 'custom', 'archived'];
});
BranchSchema.static('getValidUpdateFields', function() {
  return ['name', 'custom', 'archived'];
});

/**
 * @description Returns a list of valid root source fields
 * @memberOf BranchSchema
 */
BranchSchema.method('getValidRootSource', function() {
  return ['master'];
});

BranchSchema.static('getValidRootSource', function() {
  return ['master'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf BranchSchema
 */
BranchSchema.method('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'project', 'source'];
});

BranchSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'project', 'source'];
});


/* ------------------------( Branch Schema Export )------------------------- */

// Export model as "Branch"
module.exports = new db.Model('Branch', BranchSchema, 'branches');
