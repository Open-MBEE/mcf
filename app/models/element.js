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
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');


/* ---------------------------( Element Schemas )---------------------------- */

/**
 * @namespace
 *
 * @description The base schema definition inherited by all other element types.
 *
 * @property {string} _id - The elements non-unique element ID.
 * or taken from another source if imported.
 * @property {string} name - THe elements non-unique name.
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
    maxlength: [110, 'Too many characters in ID'],
    minlength: [8, 'Too few characters in ID']
  },
  name: {
    type: String
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
    default: null
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
  return ['name', 'documentation', 'custom', 'archived', 'parent', 'type'];
};

ElementSchema.statics.getValidUpdateFields = function() {
  return ElementSchema.methods.getValidUpdateFields();
};

/**
 * @description Returns element fields that can be changed in bulk
 * @memberOf ElementSchema
 */
ElementSchema.methods.getValidBulkUpdateFields = function() {
  return ['name', 'documentation', 'custom', 'archived', 'type'];
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
 * @description Returns the element public data
 * @memberOf ElementSchema
 */
ElementSchema.methods.getPublicData = function() {
  // Parse the element ID
  const idParts = utils.parseID(this._id);

  let createdBy;
  let lastModifiedBy;
  let archivedBy;
  let parent;
  let source;
  let target;

  // If this.createdBy is defined
  if (this.createdBy) {
    // If this.createdBy is populated
    if (typeof this.createdBy === 'object') {
      // Get the public data of createdBy
      createdBy = this.createdBy.getPublicData();
    }
    else {
      createdBy = this.createdBy;
    }
  }

  // If this.lastModifiedBy is defined
  if (this.lastModifiedBy) {
    // If this.lastModifiedBy is populated
    if (typeof this.lastModifiedBy === 'object') {
      // Get the public data of lastModifiedBy
      lastModifiedBy = this.lastModifiedBy.getPublicData();
    }
    else {
      lastModifiedBy = this.lastModifiedBy;
    }
  }

  // If this.archivedBy is defined
  if (this.archivedBy) {
    // If this.archivedBy is populated
    if (typeof this.archivedBy === 'object') {
      // Get the public data of archivedBy
      archivedBy = this.archivedBy.getPublicData();
    }
    else {
      archivedBy = this.archivedBy;
    }
  }

  // If this.parent is defined
  if (this.parent) {
    // If this.parent is populated
    if (typeof this.parent === 'object') {
      // Get the public data of parent
      parent = this.parent.getPublicData();
    }
    else {
      parent = utils.parseID(this.parent).pop();
    }
  }

  // If this.source is defined
  if (this.source) {
    // If this.source is populated
    if (typeof this.source === 'object') {
      // Get the public data of source
      source = this.source.getPublicData();
    }
    else {
      source = utils.parseID(this.source).pop();
    }
  }

  // If this.target is defined
  if (this.target) {
    // If this.target is populated
    if (typeof this.target === 'object') {
      // Get the public data of target
      target = this.target.getPublicData();
    }
    else {
      target = utils.parseID(this.target).pop();
    }
  }

  const data = {
    id: idParts.pop(),
    name: this.name,
    project: idParts[1],
    org: idParts[0],
    parent: parent,
    source: source,
    target: target,
    type: this.type,
    documentation: this.documentation,
    custom: this.custom,
    createdOn: this.createdOn,
    createdBy: createdBy,
    updatedOn: this.updatedOn,
    lastModifiedBy: lastModifiedBy,
    archived: (this.archived) ? true : undefined,
    archivedOn: (this.archivedOn) ? this.archivedOn : undefined,
    archivedBy: archivedBy
  };


  if (this.contains) {
    // Handle the virtual contains field
    data.contains = (this.contains.every(e => typeof e === 'object'))
      ? this.contains.map(e => utils.parseID(e._id).pop())
      : this.contains.map(e => utils.parseID(e).pop());
  }

  return data;
};

/**
 * @description Validates an object to ensure that it only contains keys
 * which exist in the element model.
 *
 * @param {Object} object to check keys of.
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
 * @description Adds a compound index on the name and documentation fields.
 * @memberOf ElementSchema
 */
ElementSchema.index({ name: 'text', documentation: 'text' });


/* -----------------------( Organization Properties )------------------------ */

// Required for virtual getters
ElementSchema.set('toJSON', { virtuals: true });
ElementSchema.set('toObject', { virtuals: true });


/* ------------------------( Element Schema Export )------------------------- */

module.exports = mongoose.model('Element', ElementSchema);
