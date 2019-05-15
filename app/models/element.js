/**
 * Classification: UNCLASSIFIED
 *
 * @module models.element
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description
 * <p>Defines the element data model. Using
 * <a href="http://mongoosejs.com/docs/discriminators.html">
 * Mongoose discriminators</a>, different 'types' of elements are defined such
 * that each inherit the base schema from the generic 'Element'.</p>
 *
 * <p>The following element types are defined: Block, Relationship, and Package.
 * </p>
 *
 * <p><b>Block</b> does not extend the Element schema other
 * than adding the 'type' of 'Block'.</p>
 *
 * <p><b>Relationship</b> adds 'source' and 'target' fields that reference
 * other elements, allowing relationships to represent a link between other
 * elements.</p>
 *
 * <p><b>Package</b> adds a 'contains' field which references other elements,
 * allowing packages to be used to structure the model.</p>
 *
 * <p>A project will have one root element whose "parent" field will
 * be null. All other elements will have a parent that should be a package (
 * either the root package or some other package in the hierarchy).</p>
 */

// NPM modules
const mongoose = require('mongoose');

// MBEE modules
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');
const utils = M.require('lib.utils');


/* ---------------------------( Element Schemas )---------------------------- */

/**
 * @namespace
 *
 * @description The base schema definition inherited by all other element types.
 *
 * @property {string} _id - The elements non-unique element ID.
 * or taken from another source if imported.
 * @property {string} name - The elements non-unique name.
 * @property {string} project - A reference to an element's project.
 * @property {string} parent - The parent element which contains the element
 * @property {string} source - A reference to the source element if the base
 * element is a relationship. NOTE: If source is provided, target is required.
 * @property {string} target - A reference to the target element if the base
 * element is a relationship. NOTE: If target is provided, source is required.
 * @property {string} documentation - The element documentation.
 * @property {string} type - An optional type string.
 * @property {Object} custom - JSON used to store additional date.
 *
 */
const ElementSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    match: RegExp(validators.element.id),
    maxlength: [255, 'Too many characters in ID'],
    minlength: [8, 'Too few characters in ID'],
    validate: {
      validator: function(v) {
        const elemID = utils.parseID(v).pop();
        // If the ID is a reserved keyword, reject
        return !validators.reserved.includes(elemID);
      },
      message: 'Element ID cannot include the following words: '
      + `[${validators.reserved}].`
    }
  },
  name: {
    type: String,
    default: ''
  },
  project: {
    type: String,
    required: true,
    ref: 'Project',
    set: function(_proj) {
      // Check value undefined
      if (typeof this.project === 'undefined') {
        // Return value to set it
        return _proj;
      }
      // Check value NOT equal to db value
      if (_proj !== this.project) {
        // Immutable field, return error
        M.log.warn('Assigned project cannot be changed.');
      }
      // No change, return the value
      return this.project;
    }
  },
  parent: {
    type: String,
    ref: 'Element',
    default: null,
    index: true
  },
  source: {
    type: String,
    ref: 'Element',
    default: null
  },
  target: {
    type: String,
    ref: 'Element',
    default: null
  },
  documentation: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    index: true,
    default: ''
  },
  custom: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}); // end of ElementSchema

ElementSchema.virtual('contains', {
  ref: 'Element',
  localField: '_id',
  foreignField: 'parent',
  justOne: false,
  default: []
});

/* ---------------------------( Model Plugin )---------------------------- */
// Use extensions model plugin;
ElementSchema.plugin(extensions);


/* ---------------------------( Element Methods )---------------------------- */

/**
 * @description Returns element fields that can be changed
 * @memberOf ElementSchema
 */
ElementSchema.methods.getValidUpdateFields = function() {
  return ['name', 'documentation', 'custom', 'archived', 'parent', 'type',
    'source', 'target'];
};

ElementSchema.statics.getValidUpdateFields = function() {
  return ElementSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns element fields that can be changed in bulk
 * @memberOf ElementSchema
 */
ElementSchema.methods.getValidBulkUpdateFields = function() {
  return ['name', 'documentation', 'custom', 'archived', 'type', 'source',
    'target'];
};

ElementSchema.statics.getValidBulkUpdateFields = function() {
  return ElementSchema.methods.getValidBulkUpdateFields();
};

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf ElementSchema
 */
ElementSchema.methods.getValidPopulateFields = function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy', 'parent', 'source',
    'target', 'project'];
};

ElementSchema.statics.getValidPopulateFields = function() {
  return ElementSchema.methods.getValidPopulateFields();
};

/**
 * @description Returns a list of valid root elements
 * @memberOf ElementSchema
 */
ElementSchema.methods.getValidRootElements = function() {
  return ['model', '__mbee__', 'holding_bin', 'undefined'];
};

ElementSchema.statics.getValidRootElements = function() {
  return ElementSchema.methods.getValidRootElements();
};

/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the element model.
 *
 * @param {Object} object - Object for key verification.
 * @return {boolean} The boolean indicating if the object contained only
 * existing fields.
 */
ElementSchema.statics.validateObjectKeys = function(object) {
  // Initialize returnBool to true
  let returnBool = true;
  // Check if the object is NOT an instance of the element model
  if (!(object instanceof mongoose.model('Element', ElementSchema))) {
    let validKeys = Object.keys(ElementSchema.paths);
    validKeys = validKeys.filter((elem, pos) => validKeys.indexOf(elem) === pos);
    validKeys.push('id');
    // Loop through each key of the object
    Object.keys(object).forEach(key => {
      // Check if the object key is a key in the element model
      if (!validKeys.includes(key)) {
        // Key is not in element model, return false
        returnBool = false;
      }
    });
  }
  // All object keys found in element model or object was an instance of
  // element model, return true
  return returnBool;
};

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


/* -----------------------( Organization Properties )------------------------ */

// Required for virtual getters
ElementSchema.set('toJSON', { virtuals: true });
ElementSchema.set('toObject', { virtuals: true });


/* ------------------------( Element Schema Export )------------------------- */

module.exports = mongoose.model('Element', ElementSchema);
