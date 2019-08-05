/**
 * Classification: UNCLASSIFIED
 *
 * @module lib.jmi-conversions
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Defines the JMI Type conversion functions.
 */

// Node modules
const assert = require('assert');

/**
 * @description Converts data between different JMI types
 *
 * @param {number} from - The current JMI version of the data.
 * @param {number} to - The JMI version to convert the data to.
 * @param {Object|Object[]} data - The data to convert between JMI versions.
 * @param {string} [field=_id] - The field to parse on
 *
 * @return {Object|Object[]} The converted JMI.
 */
module.exports.convertJMI = function(from, to, data, field = '_id') {
  // Convert JMI type 1 to type 2
  if (from === 1 && to === 2) {
    // Return JMI type 2 data
    return jmi12(data, field);
  }
  // Convert JMI type 1 to type 2
  if (from === 1 && to === 3) {
    // Return JMI type 3 data
    return jmi13(data, field);
  }

  throw new M.ServerError('JMI conversion not yet implemented.', 'warn');
};

/**
 * @description Converts data between JMI type 1 to type 2
 *
 * @param {Object[]} data - The data to convert between JMI versions.
 * @param {string} field - The field to parse on
 *
 * @return {Object} The converted JMI type 2 object.
 */
function jmi12(data, field) {
  // Error Check: Ensure data is in JMI type 1
  try {
    assert.ok(Array.isArray(data), 'Data is not in JMI type 1.');
  }
  catch (msg) {
    throw new M.DataFormatError(msg, 'warn');
  }

  // Initialize return object
  const returnObj = {};

  // Loop through data
  data.forEach((object) => {
    // Error Check: Ensure there are no duplicate keys
    if (returnObj[object[field]]) {
      throw new M.DataFormatError('Invalid object, duplicate keys '
        + `[${object[field]}] exist.`, 'warn');
    }
    // Create JMI type 2 object
    returnObj[object[field]] = object;
  });

  // Return JMI type 2 object
  return returnObj;
}

/**
 * @description Converts data between JMI type 1 to type 3
 *
 * @param {Object[]} data - The data to convert between JMI versions.
 * @param {string} field - The field to parse on
 *
 * @return {Object} The converted JMI type 3 object.
 */
function jmi13(data, field) {
  // Convert the array of objects to JMI2
  const jmi2Obj = jmi12(data, field);
  // Convert the JMI2 object to JMI3
  const jmi3Obj = jmi23(jmi2Obj);

  // Loop through all top level keys in JMI 3 object
  Object.keys(jmi3Obj).forEach((k) => {
    // Get the ID of the elements parent
    const parentID = (typeof jmi3Obj[k].parent === 'object' && jmi3Obj[k].parent !== null)
      ? jmi3Obj[k].parent[field]
      : jmi3Obj[k].parent;

    // If the parent is on the top level, a circular reference exists.
    if (jmi3Obj[parentID]) {
      throw new M.DataFormatError('A circular reference exists in the given data.', 'warn');
    }
  });

  return jmi3Obj;
}

/**
 * @description Converts a JMI 2 object into JMI 3 format.
 *
 * @param {Object} jmi2 - A JMI 2 object containing elements. Keys are the
 * unique identifier (id by default), and values are the element objects.
 *
 * @return {Object} Modified JMI2 object which is now in JMI3 format.
 */
function jmi23(jmi2) {
  // Create an array for elements with no children
  const empty = [];

  // Loop through each element
  Object.keys(jmi2).forEach((e) => {
    const element = jmi2[e];

    // If the element has no children, add to empty
    if (element.contains.length === 0) {
      empty.push(element.id);
    }

    const obj = {};
    // Convert array of strings to object
    element.contains.forEach((i) => {
      obj[i] = i;
    });

    // Set the contains equal to the object
    element.contains = obj;
  });

  // Call JMI 2->3 Helper
  jmi23Helper(jmi2, empty);

  // Return modified JMI2 object
  return jmi2;
}

/**
 * @description Helper function for converting JMI 2 to JMI 3
 *
 * @param {Object} jmi2 - JMI type 2 object
 * @param {string[]} ids - List of lowest level ids
 */
function jmi23Helper(jmi2, ids) {
  // Create array for lowest level elements
  const empties = [];
  // Loop through each id
  ids.forEach((i) => {
    const element = jmi2[i];
    const parentID = (typeof element.parent === 'object') ? element.parent.id : element.parent;
    const parent = jmi2[parentID];
    // Move element to its parent's contains field
    parent.contains[i] = element;
    delete jmi2[i];

    // Get the ID of the parent's parent
    const parentsParent = (typeof parent.parent === 'object' && parent.parent !== null)
      ? jmi2[parent.parent.id]
      : jmi2[parent.parent];

    // If all of the items in contains are objects, the parent is lowest level
    if (Object.keys(parent.contains).every(k => typeof parent.contains[k] === 'object')
      && parentsParent) {
      empties.push(parentID);
    }
  });

  // If there are still lowest level elements, recursively call function
  if (empties.length > 0) {
    jmi23Helper(jmi2, empties);
  }
}
