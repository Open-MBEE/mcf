/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.element
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 * @author Josh Kaplan
 *
 * @description
 * <p>This module defines the element data model. Elements are the core of MBEE
 * and are the individual components of a model. Elements are stored under
 * branches, which are stored in projects. Elements have many unique fields
 * including a reference the the element's parent, a reference to a source and
 * target, a type, and a documentation section. Elements also have three virtual
 * fields which are not stored in the database and can optionally be calculated
 * and returned post-find. Elements also have the ability to store custom
 * meta-data.</p>
 *
 * <h4>Parent</h4>
 * <p>The parent field stores the concatenated id of the current element's
 * parent. This is a required field, and the only element which should not have
 * a parent is the root model element, whose parent value is null.</p>
 *
 * <h4>Source and Target</h4>
 * <p>Both source and target store concatenated ids of other elements which they
 * reference. When creating relationship types in a model, the source and target
 * should be populated. If an element is not a relationship type, the source
 * and target will default to null. Both source and target are required
 * together, one cannot provide only a source or only a target.</p>
 *
 * <h4>Type</h4>
 * <p>The type field allows users to store an arbitrary type of an element. Some
 * types are mapped to specific icons in the UI, but apart from that the type
 * is not used internally in MBEE.</p>
 *
 * <h4>Documentation</h4>
 * <p>The documentation field allows users to store arbitrary text about a
 * certain element. The documentation field is included with the name in a
 * "text" index, and can be searched through using a text search.</p>
 *
 * <h4>Virtuals</h4>
 * <p>Elements support three virtuals: contains, sourceOf and targetOf. These
 * fields are not stored in the database, and are rather calculated after an
 * element has been found. Contains returns an array of elements whose parent
 * field is equal to the current element's id and sourceOf and targetOf return
 * arrays of elements whose source/target field is the current element's id.
 * Virtuals <b>MUST</b> be populated in the find operation to be returned.</p>
 *
 * <h4>Custom Data</h4>
 * <p>Custom data is designed to store any arbitrary JSON meta-data. Custom data
 * is stored in an object, and can contain any valid JSON the user desires.
 * Only users with write and admin permissions on the project can update the
 * element's custom data. The field "custom" is common to all models, and is
 * added through the extensions plugin.</p>
 */

// MBEE modules
const db = M.require('db');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');
const utils = M.require('lib.utils');


/* ----------------------------( Element Schema )---------------------------- */
/**
 * @namespace
 *
 * @description The base schema definition inherited by all other element types.
 *
 * @property {string} _id - The elements unique element ID.
 * @property {string} name - The elements non-unique name.
 * @property {string} project - A reference to an element's project.
 * @property {string} branch - A reference to an element's branch.
 * @property {string} parent - The parent element which contains the element
 * @property {string} source - A reference to the source element if the base
 * element is a relationship. NOTE: If source is provided, target is required.
 * @property {string} target - A reference to the target element if the base
 * element is a relationship. NOTE: If target is provided, source is required.
 * @property {string} documentation - The element documentation.
 * @property {string} type - An optional type string.
 *
 */
const ElementSchema = new db.Schema({
  _id: {
    type: 'String',
    required: true,
    validate: [{
      validator: function(v) {
        const elemID = utils.parseID(v).pop();
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(elemID);
      },
      message: 'Element ID cannot include the following words: '
        + `[${validators.reserved}].`
    }, {
      validator: function(v) {
        // If the ID is longer than max length, reject
        return v.length <= validators.element.idLength;
      },
      // Return a message, with calculated length of element ID (element.max - branch.max - :)
      message: props => `Element ID length [${props.value.length - validators.branch.idLength - 1}]`
        + ` must not be more than ${validators.element.idLength - validators.branch.idLength - 1}`
        + ' characters.'
    }, {
      validator: function(v) {
        // If the ID is shorter than min length, reject
        return v.length > 10;
      },
      // Return a message, with calculated length of element ID (element.min - branch.min - :)
      message: props => `Element ID length [${props.value.length - 9}] must not`
        + ' be less than 2 characters.'
    }, {
      validator: function(v) {
        if (typeof validators.element.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.element.id).test(v);
        }
        else {
          return validators.element.id(v);
        }
      },
      message: props => `Invalid element ID [${utils.parseID(props.value).pop()}].`
    }]
  },
  name: {
    type: 'String',
    default: ''
  },
  project: {
    type: 'String',
    required: true,
    ref: 'Project',
    validate: [{
      validator: function(v) {
        if (typeof validators.project.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.project.id).test(v);
        }
        else {
          return validators.project.id(v);
        }
      },
      message: props => `${props.value} is not a valid project ID.`
    }]
  },
  branch: {
    type: 'String',
    required: true,
    ref: 'Branch',
    index: true,
    validate: [{
      validator: function(v) {
        if (typeof validators.branch.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.branch.id).test(v);
        }
        else {
          return validators.branch.id(v);
        }
      },
      message: props => `${props.value} is not a valid branch ID.`
    }]
  },
  parent: {
    type: 'String',
    ref: 'Element',
    default: null,
    index: true,
    validate: [{
      validator: function(v) {
        if (typeof validators.element.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.element.id).test(v) || (v === null);
        }
        else {
          return validators.element.id(v) || (v === null);
        }
      },
      message: props => `${props.value} is not a valid parent ID.`
    }]
  },
  source: {
    type: 'String',
    ref: 'Element',
    default: null,
    index: true,
    validate: [{
      validator: function(v) {
        if (typeof validators.element.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.element.id).test(v) || (v === null);
        }
        else {
          return validators.element.id(v) || (v === null);
        }
      },
      message: props => `${props.value} is not a valid source ID.`
    }, {
      validator: function(v) {
        // If source is provided
        if (v) {
          // Reject if target is null
          return this.target;
        }
        // Source null, return true
        else {
          return true;
        }
      },
      message: props => 'Target is required if source is provided.'
    }]
  },
  target: {
    type: 'String',
    ref: 'Element',
    default: null,
    index: true,
    validate: [{
      validator: function(v) {
        if (typeof validators.element.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.element.id).test(v) || (v === null);
        }
        else {
          return validators.element.id(v) || (v === null);
        }
      },
      message: props => `${props.value} is not a valid target ID.`
    }, {
      validator: function(v) {
        // If target is provided
        if (v) {
          // Reject if source is null
          return this.source;
        }
        // Target null, return true
        else {
          return true;
        }
      },
      message: props => 'Source is required if target is provided.'
    }]
  },
  documentation: {
    type: 'String',
    default: ''
  },
  type: {
    type: 'String',
    index: true,
    default: ''
  },
  artifact: {
    type: 'String',
    ref: 'Artifact',
    index: true,
    default: null,
    validate: [{
      validator: function(v) {
        // If v not defined, validation not required
        if (v === null) {
          return true;
        }
        else if (typeof validators.artifact.id === 'string') {
          // If the ID is invalid, reject
          return RegExp(validators.artifact.id).test(v);
        }
        else {
          return validators.artifact.id(v);
        }
      },
      message: props => `${props.value} is not a valid artifact ID.`
    }]
  }
}); // end of ElementSchema

ElementSchema.virtual('contains', {
  ref: 'Element',
  localField: '_id',
  foreignField: 'parent',
  justOne: false
});

// Virtual which stores elements that the retrieved element is a source of
ElementSchema.virtual('sourceOf', {
  ref: 'Element',
  localField: '_id',
  foreignField: 'source',
  justOne: false
});

// Virtual which stores elements that the retrieved element is a target of
ElementSchema.virtual('targetOf', {
  ref: 'Element',
  localField: '_id',
  foreignField: 'target',
  justOne: false
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
ElementSchema.plugin(extensions);


/* ---------------------------( Element Methods )---------------------------- */

/**
 * @description Returns element fields that can be changed
 * @memberOf ElementSchema
 */
ElementSchema.static('getValidUpdateFields', function() {
  return ['name', 'documentation', 'custom', 'archived', 'parent', 'type',
    'source', 'target', 'artifact'];
});

/**
 * @description Returns element fields that can be changed in bulk
 * @memberOf ElementSchema
 */
ElementSchema.static('getValidBulkUpdateFields', function() {
  return ['name', 'documentation', 'custom', 'archived', 'type', 'source',
    'target', 'artifact'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf ElementSchema
 */
ElementSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'parent', 'source',
    'target', 'project', 'branch', 'sourceOf', 'targetOf', 'contains',
    'artifact'];
});

/**
 * @description Returns a list of valid root elements
 * @memberOf ElementSchema
 */
ElementSchema.static('getValidRootElements', function() {
  return ['model', '__mbee__', 'holding_bin', 'undefined'];
});

/* ---------------------------( Element Indexes )---------------------------- */

/**
 * @description Adds a compound text index on the name, documentation, _id,
 * source, target and parent fields.
 * @memberOf ElementSchema
 */
ElementSchema.index({
  name: 'text',
  documentation: 'text'
});


/* ------------------------( Element Schema Export )------------------------- */
module.exports = new db.Model('Element', ElementSchema, 'elements');
