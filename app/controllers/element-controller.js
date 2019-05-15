/**
 * Classification: UNCLASSIFIED
 *
 * @module controllers.element-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This implements the behavior and logic for elements.
 * It also provides function for interacting with elements.
 */

// Expose element controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  find,
  create,
  update,
  createOrReplace,
  remove,
  search
};

// Disable eslint rule for logic in nested promises
/* eslint-disable no-loop-func */

// Node.js Modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// MBEE Modules
const Element = M.require('models.element');
const Project = M.require('models.project');
const EventEmitter = M.require('lib.events');
const sani = M.require('lib.sanitization');
const utils = M.require('lib.utils');
const validators = M.require('lib.validators');
const jmi = M.require('lib.jmi-conversions');

/**
 * @description This function finds one or many elements. Depending on the
 * parameters provided, this function will find a single element by ID, multiple
 * elements by ID, or all elements within a project. The user making the request
 * must be part of the specified project or be a system-wide admin.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to find.
 * @param {(string|string[])} [elements] - The elements to find. Can either be
 * an array of element ids, a single element id, or not provided, which defaults
 * to every element in a project being found.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {boolean} [options.archived = false] - If true, find results will include
 * archived objects.
 * @param {boolean} [options.subtree = false] - If true, all elements in the subtree of
 * the found elements will also be returned.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id, id, and contains. To NOT include a field, provide a '-' in
 * front.
 * @param {number} [options.limit = 0] - A number that specifies the maximum
 * number of documents to be returned to the user. A limit of 0 is equivalent to
 * setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the
 * number of documents to skip returning. For example, if 10 documents are found
 * and skip is 5, the first 5 documents will NOT be returned.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 * @param {string} [options.parent] - Search for elements with a specific
 * parent.
 * @param {string} [options.source] - Search for elements with a specific
 * source.
 * @param {string} [options.target] - Search for elements with a specific
 * target.
 * @param {string} [options.type] - Search for elements with a specific type.
 * @param {string} [options.name] - Search for elements with a specific name.
 * @param {string} [options.createdBy] - Search for elements with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for elements with a
 * specific lastModifiedBy value.
 * @param {string} [options.archivedBy] - Search for elements with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'
 *
 * @return {Promise} Array of found element objects
 *
 * @example
 * find({User}, 'orgID', 'projID', 'branchID', ['elem1', 'elem2'], { populate: 'parent' })
 * .then(function(elements) {
 *   // Do something with the found elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function find(requestingUser, organizationID, projectID, branch, elements, options) {
  return new Promise((resolve, reject) => {
    // Set options if no elements were provided, but options were
    if (typeof elements === 'object' && elements !== null && !Array.isArray(elements)) {
      // Note: assumes input param elements is input option param
      options = elements; // eslint-disable-line no-param-reassign
      elements = undefined; // eslint-disable-line no-param-reassign
    }

    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');

      const elementsTypes = ['undefined', 'object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(elementsTypes.includes(typeof elements), 'Elements parameter is an invalid type.');
      // If elements is an object, ensure it's an array of strings
      if (typeof elements === 'object') {
        assert.ok(Array.isArray(elements), 'Elements is an object, but not an array.');
        assert.ok(elements.every(e => typeof e === 'string'), 'Elements is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters
    const saniElements = (elements !== undefined)
      ? sani.mongo(JSON.parse(JSON.stringify(elements)))
      : undefined;
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    let foundElements = [];
    const searchQuery = { project: utils.createID(orgID, projID), archived: false };

    // Initialize validOptions
    let validOptions = {};

    // Validate and set the options
    validOptions = utils.validateOptions(options, ['archived', 'populate',
      'subtree', 'fields', 'limit', 'skip', 'lean'], Element);

    // Ensure options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['parent', 'source', 'target', 'type', 'name',
        'createdBy', 'lastModifiedBy', 'archivedBy'];

      // Loop through provided options, look for validSearchOptions
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the search option is a string
          if (typeof options[o] !== 'string') {
            throw new M.CustomError(`The option '${o}' is not a string.`, 400, 'warn');
          }

          // If the search option is an element reference
          if (['parent', 'source', 'target'].includes(o)) {
            // Make value the concatenated ID
            options[o] = utils.createID(orgID, projID, options[o]);
          }
          // Add the search option to the searchQuery
          searchQuery[o] = sani.mongo(options[o]);
        }
      });
    }

    // Find the project
    Project.findOne({ _id: utils.createID(orgID, projID) }).lean()
    .then((project) => {
      // Check that the project was found
      if (!project) {
        throw new M.CustomError(`Project [${projID}] not found in the `
        + `organization [${orgID}].`, 404, 'warn');
      }

      // Verify the user has read permissions on the project
      if (!reqUser.admin && (!project.permissions[reqUser._id]
        || !project.permissions[reqUser._id].includes('read'))) {
        throw new M.CustomError('User does not have permission to get'
            + ` elements on the project [${utils.parseID(project._id).pop()}].`, 403, 'warn');
      }

      let elementsToFind = [];

      // Check the type of the elements parameter
      if (Array.isArray(saniElements)) {
        // An array of element ids, find all
        elementsToFind = saniElements.map(e => utils.createID(orgID, projID, e));
      }
      else if (typeof saniElements === 'string') {
        // A single element id
        elementsToFind = [utils.createID(orgID, projID, saniElements)];
      }
      else if (((typeof saniElements === 'object' && saniElements !== null)
          || saniElements === undefined)) {
        // Find all elements in the project
        elementsToFind = [];
      }
      else {
        // Invalid parameter, throw an error
        throw new M.CustomError('Invalid input for finding elements.', 400, 'warn');
      }

      // If wanting to find subtree, find subtree ids
      if (validOptions.subtree) {
        return findElementTree(orgID, projID, 'master', elementsToFind);
      }

      return elementsToFind;
    })
    .then((elementIDs) => {
      // If the archived field is true, remove it from the query
      if (validOptions.archived) {
        delete searchQuery.archived;
      }

      // If no IDs provided, find all elements in a project
      if (elementIDs.length === 0) {
        // If the lean option is supplied
        if (validOptions.lean) {
          // Find all elements in a project
          return Element.find(searchQuery, validOptions.fieldsString,
            { limit: validOptions.limit, skip: validOptions.skip })
          .populate(validOptions.populateString || 'contains')
          .lean();
        }
        else {
          return Element.find(searchQuery, validOptions.fieldsString,
            { limit: validOptions.limit, skip: validOptions.skip })
          .populate(validOptions.populateString || 'contains');
        }
      }
      // Find elements by ID

      const promises = [];

      // Find elements in batches
      for (let i = 0; i < elementIDs.length / 50000; i++) {
        // Split elementIDs list into batches of 50000
        // Need to sanitize _id
        searchQuery._id = elementIDs.slice(i * 50000, i * 50000 + 50000);

        // If the lean option is supplied
        if (validOptions.lean) {
          // Add find operation to promises array
          promises.push(Element.find(searchQuery, validOptions.fieldsString,
            { limit: validOptions.limit, skip: validOptions.skip })
          .populate(validOptions.populateString || 'contains')
          .lean()
          .then((_foundElements) => {
            foundElements = foundElements.concat(_foundElements);
          }));
        }
        else {
          // Add find operation to promises array
          promises.push(Element.find(searchQuery, validOptions.fieldsString,
            { limit: validOptions.limit, skip: validOptions.skip })
          .populate(validOptions.populateString || 'contains')
          .then((_foundElements) => {
            foundElements = foundElements.concat(_foundElements);
          }));
        }
      }

      // Return when all elements have been found
      return Promise.all(promises);
    })
    .then((found) => {
      // If each item in found is not undefined, its the return from Element.find()
      if (!found.every(o => typeof o === 'undefined')) {
        return resolve(found);
      }

      // Each item in found is undefined, which is the return from Promise.all(), return
      // foundElements
      return resolve(foundElements);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This functions creates one or many elements. In addition to
 * creating the elements from the data supplied, this function also checks for
 * elements with duplicate IDs, ensures the user has write permissions on the
 * provided project, ensures existence of specified parents, sources and
 * targets, and then returns the elements which were created.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to add elements to.
 * @param {(Object|Object[])} elements - Either an array of objects containing
 * element data or a single object containing element data to create.
 * @param {string} elements.id - The ID of the element being created.
 * @param {string} [elements.name] - The name of the element.
 * @param {string} [elements.parent = 'model'] - The ID of the parent of the
 * element.
 * @param {string} [elements.source] - The ID of the source element. If
 * provided, the parameter target is required.
 * @param {Object} [elements.sourceNamespace] - The optional namespace of the
 * source element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.target] - The ID of the target element. If
 * provided, the parameter source is required.
 * @param {Object} [elements.targetNamespace] - The optional namespace of the
 * target element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.documentation] - Any additional text
 * documentation about an element.
 * @param {string} [elements.type] - An optional type string.
 * @param {Object} [elements.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id, id, and contains. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created element objects
 *
 * @example
 * create({User}, 'orgID', 'projID', 'branch', [{Elem1}, {Elem2}, ...], { populate: ['parent'] })
 * .then(function(elements) {
 *   // Do something with the newly created elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function create(requestingUser, organizationID, projectID, branch, elements, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');
      assert.ok(typeof elements === 'object', 'Elements parameter is not an object.');
      assert.ok(elements !== null, 'Elements parameter cannot be null.');
      // If elements is an array, ensure each item inside is an object
      if (Array.isArray(elements)) {
        assert.ok(elements.every(e => typeof e === 'object'), 'Every item in elements is not an'
          + ' object.');
        assert.ok(elements.every(e => e !== null), 'One or more items in elements is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }
    // Sanitize input parameters and create function-wide variables
    const saniElements = sani.mongo(JSON.parse(JSON.stringify(elements)));
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    let elementObjects = [];
    const remainingElements = [];
    let populatedElements = [];
    const projectRefs = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Element);

    // Define array to store element data
    let elementsToCreate = [];

    // Check the type of the elements parameter
    if (Array.isArray(saniElements)) {
      // elements is an array, create many elements
      elementsToCreate = saniElements;
    }
    else if (typeof saniElements === 'object') {
      // elements is an object, create a single element
      elementsToCreate = [saniElements];
    }
    else {
      // elements is not an object or array, throw an error
      throw new M.CustomError('Invalid input for creating elements.', 400, 'warn');
    }

    // Create array of id's for lookup and array of valid keys
    const arrIDs = [];
    const validElemKeys = ['id', 'name', 'parent', 'source', 'target',
      'documentation', 'type', 'custom', 'sourceNamespace', 'targetNamespace',
      'archived'];

    // Check that each element has an id and set the parent if null
    try {
      let index = 1;
      elementsToCreate.forEach((elem) => {
        // Ensure keys are valid
        Object.keys(elem).forEach((k) => {
          assert.ok(validElemKeys.includes(k), `Invalid key [${k}].`);
        });

        // Ensure each element has an id and that it's a string
        assert.ok(elem.hasOwnProperty('id'), `Element #${index} does not have an id.`);
        assert.ok(typeof elem.id === 'string', `Element #${index}'s id is not a string.`);
        elem.id = utils.createID(orgID, projID, elem.id);
        arrIDs.push(elem.id);
        elem._id = elem.id;

        // Set the element parent if null
        if (!elem.hasOwnProperty('parent') || elem.parent === null || elem.parent === '') {
          elem.parent = 'model';
        }
        assert.ok(typeof elem.parent === 'string', `Element #${index}'s parent is not a string.`);
        elem.parent = utils.createID(orgID, projID, elem.parent);
        assert.ok(elem.parent !== elem._id, 'Elements parent cannot be self.');

        // If element has a source, ensure it has a target
        if (elem.hasOwnProperty('source')) {
          assert.ok(elem.hasOwnProperty('target'), `Element #${index} is missing a target id.`);
          assert.ok(typeof elem.target === 'string',
            `Element #${index}'s target is not a string.`);
          elem.source = utils.createID(orgID, projID, elem.source);
        }

        // If element has a target, ensure it has a source
        if (elem.hasOwnProperty('target')) {
          assert.ok(elem.hasOwnProperty('source'), `Element #${index} is missing a source id.`);
          assert.ok(typeof elem.source === 'string',
            `Element #${index}'s source is not a string.`);
          elem.target = utils.createID(orgID, projID, elem.target);
        }

        // If the element a sourceNamespace section, ensure it contains the proper fields
        if (elem.hasOwnProperty('sourceNamespace')) {
          assert.ok(elem.hasOwnProperty('source'), `Element #${index} is missing a source id.`);

          // Ensure the object contains an org, project and branch field
          assert.ok(elem.sourceNamespace.hasOwnProperty('org'), 'Element'
            + ` #${index}'s sourceNamespace is missing an org.`);
          assert.ok(elem.sourceNamespace.hasOwnProperty('project'), 'Element'
            + ` #${index}'s sourceNamespace is missing a project.`);
          assert.ok(elem.sourceNamespace.hasOwnProperty('branch'), 'Element'
            + ` #${index}'s sourceNamespace is missing a branch.`);

          // Ensure the sourceNamespace org is the same org
          assert.ok(elem.sourceNamespace.org === orgID, `Element #${index}'s `
            + 'source cannot reference elements outside its org.');

          // Add project id to projectRefs array. Later we verify these projects
          // are in the foundProject's projectReferences array
          projectRefs.push(utils.createID(elem.sourceNamespace.org, elem.sourceNamespace.project));

          // Change element source to referenced project's id
          const tmpSource = utils.parseID(elem.source).pop();
          elem.source = utils.createID(elem.sourceNamespace.org,
            elem.sourceNamespace.project, tmpSource);
        }

        // If the element a targetNamespace section, ensure it contains the proper fields
        if (elem.hasOwnProperty('targetNamespace')) {
          assert.ok(elem.hasOwnProperty('target'), `Element #${index} is missing a target id.`);

          // Ensure the object contains an org, project and branch field
          assert.ok(elem.targetNamespace.hasOwnProperty('org'), 'Element'
            + ` #${index}'s targetNamespace is missing an org.`);
          assert.ok(elem.targetNamespace.hasOwnProperty('project'), 'Element'
            + ` #${index}'s targetNamespace is missing a project.`);
          assert.ok(elem.targetNamespace.hasOwnProperty('branch'), 'Element'
            + ` #${index}'s targetNamespace is missing a branch.`);

          // Ensure the targetNamespace org is the same org
          assert.ok(elem.targetNamespace.org === orgID, `Element #${index}'s `
            + 'target cannot reference elements outside its org.');

          // Add project id to projectRefs array. Later we verify these projects
          // are in the foundProject's projectReferences array
          projectRefs.push(utils.createID(elem.targetNamespace.org, elem.targetNamespace.project));

          // Change element target to referenced project's id
          const tmpTarget = utils.parseID(elem.target).pop();
          elem.target = utils.createID(elem.targetNamespace.org,
            elem.targetNamespace.project, tmpTarget);
        }

        index++;
      });
    }
    catch (err) {
      throw new M.CustomError(err.message, 403, 'warn');
    }

    // Attempt to convert elements to JMI type 2, to see if duplicate ids exist
    try {
      jmi.convertJMI(1, 2, elementsToCreate, '_id');
    }
    catch (err) {
      throw new M.CustomError('Cannot create multiple elements with the same ID.', 403, 'warn');
    }

    // Find the project to verify existence and permissions
    Project.findOne({ _id: utils.createID(orgID, projID) }).lean()
    .then((foundProject) => {
      // Check that the project was found
      if (!foundProject) {
        throw new M.CustomError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 404, 'warn');
      }

      // Verify user has write permissions on the project
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.CustomError('User does not have permission to create'
            + ' elements on the project '
            + `[${utils.parseID(foundProject._id).pop()}].`, 403, 'warn');
      }

      // Verify that the found project's projectReferences contains the specified refs
      projectRefs.forEach((ref) => {
        if (!foundProject.projectReferences.includes(ref)) {
          throw new M.CustomError(`The project [${utils.parseID(ref).pop()}] `
            + 'is not in the found project\'s projectReference list.', 403, 'warn');
        }
      });

      const promises = [];
      for (let i = 0; i < arrIDs.length / 50000; i++) {
        // Split arrIDs into batches of 50000
        const tmpQuery = { _id: { $in: arrIDs.slice(i * 50000, i * 50000 + 50000) } };
        // Attempt to find any elements with matching _id
        promises.push(Element.find(tmpQuery, '_id').lean()
        .then((foundElements) => {
          if (foundElements.length > 0) {
            // Get array of the foundElements's ids
            const foundElementIDs = foundElements.map(e => utils.parseID(e._id).pop());

            // There are one or more elements with conflicting IDs
            throw new M.CustomError('Elements with the following IDs already exist'
                  + ` [${foundElementIDs.toString()}].`, 403, 'warn');
          }
        }));
      }
      return Promise.all(promises);
    })
    .then(() => {
      // For each object of element data, create the element object
      elementObjects = elementsToCreate.map((elemObj) => {
        // Set the project, lastModifiedBy and createdBy
        elemObj.project = utils.createID(orgID, projID);
        elemObj.lastModifiedBy = reqUser._id;
        elemObj.createdBy = reqUser._id;
        elemObj.updatedOn = Date.now();
        elemObj.archivedBy = (elemObj.archived) ? reqUser._id : null;

        // Add hidden fields
        elemObj.$parent = elemObj.parent;
        elemObj.$source = (elemObj.source) ? elemObj.source : null;
        elemObj.$target = (elemObj.target) ? elemObj.target : null;

        return elemObj;
      });

      // Convert elemObjects array to JMI type 2 for easier lookup
      const jmi2 = jmi.convertJMI(1, 2, elementObjects);

      // Define array of elements that need to be searched for in DB
      const elementsToFind = [];

      // Loop through each element and set its parent (and source and target)
      elementObjects.forEach((element) => {
        // If the element has a parent
        if (element.$parent) {
          // If the element's parent is also being created
          if (jmi2.hasOwnProperty(element.$parent)) {
            const parentObj = jmi2[element.$parent];
            element.parent = parentObj._id;
            element.$parent = null;
          }
          else {
            // Add elements parent to list of elements to search for in DB
            elementsToFind.push(element.$parent);
            remainingElements.push(element);
          }
        }

        // If the element has a source
        if (element.$source) {
          // If the element's source is also being created
          if (jmi2.hasOwnProperty(element.$source)) {
            element.source = element.$source;
            element.$source = null;
          }
          else {
            // Add elements source to list of elements to search for in DB
            elementsToFind.push(element.$source);
            remainingElements.push(element);
          }
        }

        // If the element has a target
        if (element.$target) {
          // If the element's target is also being created
          if (jmi2.hasOwnProperty(element.$target)) {
            element.target = element.$target;
            element.$target = null;
          }
          else {
            // Add elements target to list of elements to search for in DB
            elementsToFind.push(element.$target);
            remainingElements.push(element);
          }
        }
      });

      // Create query for finding elements
      const findExtraElementsQuery = { _id: { $in: elementsToFind } };

      // Find extra elements, and only return _id for faster lookup
      return Element.find(findExtraElementsQuery, '_id').lean();
    })
    .then((extraElements) => {
      // Convert extraElements to JMI type 2 for easier lookup
      const extraElementsJMI2 = jmi.convertJMI(1, 2, extraElements);
      // Loop through each remaining element that does not have it's parent,
      // source, or target set yet
      remainingElements.forEach((element) => {
        // If the element has a parent
        if (element.$parent) {
          try {
            element.parent = extraElementsJMI2[element.$parent]._id;
            element.$parent = null;
          }
          catch (e) {
            // Parent not found in db, throw an error
            throw new M.CustomError(`Parent element ${element.parent} not found.`, 404, 'warn');
          }
        }

        // If the element is a relationship and has a source
        if (element.$source) {
          try {
            element.source = extraElementsJMI2[element.$source]._id;
            element.$source = null;
          }
          catch (e) {
            // Source not found in db, throw an error
            throw new M.CustomError(`Source element ${element.source} not found.`, 404, 'warn');
          }
        }

        // If the element is a relationship and has a target
        if (element.$target) {
          try {
            element.target = extraElementsJMI2[element.$target]._id;
            element.$target = null;
          }
          catch (e) {
            // Target not found in db, throw an error
            throw new M.CustomError(`Target element ${element.target} not found.`, 404, 'warn');
          }
        }
      });

      return Element.insertMany(elementObjects, { rawResult: true });
    })
    .then((createdElements) => {
      const promises = [];
      const createdIDs = createdElements.ops.map(e => e._id);
      // Find elements in batches
      for (let i = 0; i < createdIDs.length / 50000; i++) {
        // Split elementIDs list into batches of 50000
        const tmpQuery = { _id: { $in: createdIDs.slice(i * 50000, i * 50000 + 50000) } };

        // If the lean option is supplied
        if (validOptions.lean) {
          // Add find operation to promises array
          promises.push(Element.find(tmpQuery, validOptions.fieldsString)
          .populate(validOptions.populateString || 'contains').lean()
          .then((_foundElements) => {
            populatedElements = populatedElements.concat(_foundElements);
          }));
        }
        else {
          // Add find operation to promises array
          promises.push(Element.find(tmpQuery, validOptions.fieldsString)
          .populate(validOptions.populateString || 'contains')
          .then((_foundElements) => {
            populatedElements = populatedElements.concat(_foundElements);
          }));
        }
      }

      // Return when all elements have been found
      return Promise.all(promises);
    })
    .then(() => {
      // Emit the event elements-created
      EventEmitter.emit('elements-created', populatedElements);

      return resolve(populatedElements);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function updates one or many elements. Multiple fields on
 * multiple elements can be updated as long as they are valid. If changing an
 * elements parent, only one element can be updated at a time. If updating the
 * custom data on an element, and key/value pairs that exist in the update
 * object don't exist in the current custom data, the key/value pair will be
 * added. If the key/value pairs do exist, the value will be changed. If an
 * element is archived, it must first be unarchived before any other updates
 * occur. The user must have write permissions on a project or be a system-wide
 * admin to update elements.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to update elements on.
 * @param {(Object|Object[])} elements - Either an array of objects containing
 * updates to elements, or a single object containing updates.
 * @param {string} elements.id - The ID of the element being updated. Field
 * cannot be updated but is required to find element.
 * @param {string} [elements.name] - The updated name of the element.
 * @param {string} [elements.parent] - The ID of the new elements parent. Cannot
 * update element parents in bulk.
 * @param {string} [elements.source] - The ID of the source element.
 * @param {Object} [elements.sourceNamespace] - The optional namespace of the
 * source element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.target] - The ID of the target element.
 * @param {Object} [elements.targetNamespace] - The optional namespace of the
 * target element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.documentation] - The updated documentation of the
 * element.
 * @param {string} [elements.type] - An optional type string.
 * @param {Object} [elements.custom] - The new custom data object. Please note,
 * updating the custom data object completely replaces the old custom data
 * object.
 * @param {boolean} [elements.archived = false] - The updated archived field. If true,
 * the element will not be able to be found until unarchived.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id, id, and contains. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of updated element objects
 *
 * @example
 * update({User}, 'orgID', 'projID', 'branch', [{Elem1}, {Elem22}...], { populate: 'parent' })
 * .then(function(elements) {
 *   // Do something with the newly updated elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function update(requestingUser, organizationID, projectID, branch, elements, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');
      assert.ok(typeof elements === 'object', 'Elements parameter is not an object.');
      assert.ok(elements !== null, 'Elements parameter cannot be null.');
      // If elements is an array, ensure each item inside is an object
      if (Array.isArray(elements)) {
        assert.ok(elements.every(e => typeof e === 'object'), 'Every item in elements is not an'
          + ' object.');
        assert.ok(elements.every(e => e !== null), 'One or more items in elements is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const saniElements = sani.mongo(JSON.parse(JSON.stringify(elements)));
    let foundElements = [];
    let foundProject = {};
    let elementsToUpdate = [];
    let searchQuery = {};
    let sourceTargetQuery = {};
    const duplicateCheck = {};
    let foundUpdatedElements = [];
    const arrIDs = [];
    const sourceTargetIDs = [];

    // Initialize and ensure options are valid
    const validOptions = utils.validateOptions(options, ['populate', 'fields',
      'lean'], Element);

    // Find the project
    Project.findOne({ _id: utils.createID(orgID, projID) }).lean()
    .then((_foundProject) => {
      foundProject = _foundProject;
      // Check that the project was found
      if (!foundProject) {
        throw new M.CustomError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 404, 'warn');
      }

      // Verify user has write permissions on the project
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.CustomError('User does not have permission to update'
          + ` elements on the project [${utils.parseID(foundProject._id).pop()}].`, 403, 'warn');
      }

      // Check the type of the elements parameter
      if (Array.isArray(saniElements)) {
        // elements is an array, update many elements
        elementsToUpdate = saniElements;

        // Ensure element keys are valid to update in bulk
        const validBulkFields = Element.getValidBulkUpdateFields();
        validBulkFields.push('id');
        // For each element
        elementsToUpdate.forEach((e) => {
          // For each key
          Object.keys(e).forEach((key) => {
            // If it can't be updated in bulk,throw an error
            if (!validBulkFields.includes(key)) {
              throw new M.CustomError(`Cannot update the field ${key} in bulk.`, 400, 'warn');
            }
          });
        });
      }
      else if (typeof saniElements === 'object') {
        // elements is an object, update a single element
        elementsToUpdate = [saniElements];
        // If updating parent, ensure it won't cause a circular reference
        if (saniElements.hasOwnProperty('parent')) {
          // Turn parent ID into a name-spaced ID
          saniElements.parent = utils.createID(orgID, projID, saniElements.parent);
          // Find if a circular reference exists
          return moveElementCheck(orgID, projID, branch, saniElements);
        }
      }
      else {
        throw new M.CustomError('Invalid input for updating elements.', 400, 'warn');
      }
    })
    .then(() => {
      // Create list of ids
      try {
        let index = 1;
        elementsToUpdate.forEach((elem) => {
          // Ensure each element has an id and that its a string
          assert.ok(elem.hasOwnProperty('id'), `Element #${index} does not have an id.`);
          assert.ok(typeof elem.id === 'string', `Element #${index}'s id is not a string.`);
          elem.id = utils.createID(orgID, projID, elem.id);
          // If a duplicate ID, throw an error
          if (duplicateCheck[elem.id]) {
            throw new M.CustomError(`Multiple objects with the same ID [${elem.id}] exist in the`
              + ' update.', 400, 'warn');
          }
          else {
            duplicateCheck[elem.id] = elem.id;
          }
          arrIDs.push(elem.id);
          elem._id = elem.id;

          // If updating source, add ID to sourceTargetIDs
          if (elem.source) {
            elem.source = utils.createID(orgID, projID, elem.source);
            sourceTargetIDs.push(elem.source);
          }

          // If the element a sourceNamespace section, ensure it contains the proper fields
          if (elem.hasOwnProperty('sourceNamespace')) {
            assert.ok(elem.hasOwnProperty('source'), `Element #${index} is missing a source id.`);

            // Ensure the object contains an org, project and branch field
            assert.ok(elem.sourceNamespace.hasOwnProperty('org'), 'Element'
              + ` #${index}'s sourceNamespace is missing an org.`);
            assert.ok(elem.sourceNamespace.hasOwnProperty('project'), 'Element'
              + ` #${index}'s sourceNamespace is missing a project.`);
            assert.ok(elem.sourceNamespace.hasOwnProperty('branch'), 'Element'
              + ` #${index}'s sourceNamespace is missing a branch.`);

            // Ensure the sourceNamespace org is the same org
            assert.ok(elem.sourceNamespace.org === orgID, `Element #${index}'s `
              + 'source cannot reference elements outside its org.');
            // Ensure the project is in the projectReferences array
            const tmpProj = utils.createID(elem.sourceNamespace.org, elem.sourceNamespace.project);
            assert.ok(foundProject.projectReferences.includes(tmpProj),
              `The project [${elem.sourceNamespace.project}] is not in the `
              + 'projectReferences list.');

            // Reset the elem source with new project
            const tmpSource = utils.parseID(elem.source).pop();
            elem.source = utils.createID(elem.sourceNamespace.org,
              elem.sourceNamespace.project, tmpSource);

            // Remove the last source which has the wrong project
            sourceTargetIDs.pop();
            sourceTargetIDs.push(elem.source);

            // Delete sourceNamespace, it does not get stored in the database
            delete elem.sourceNamespace;
          }

          // If updating target, add ID to sourceTargetIDs
          if (elem.target) {
            elem.target = utils.createID(orgID, projID, elem.target);
            sourceTargetIDs.push(elem.target);
          }

          // If the element a targetNamespace section, ensure it contains the proper fields
          if (elem.hasOwnProperty('targetNamespace')) {
            assert.ok(elem.hasOwnProperty('target'), `Element #${index} is missing a target id.`);

            // Ensure the object contains an org, project and branch field
            assert.ok(elem.targetNamespace.hasOwnProperty('org'), 'Element'
              + ` #${index}'s targetNamespace is missing an org.`);
            assert.ok(elem.targetNamespace.hasOwnProperty('project'), 'Element'
              + ` #${index}'s targetNamespace is missing a project.`);
            assert.ok(elem.targetNamespace.hasOwnProperty('branch'), 'Element'
              + ` #${index}'s targetNamespace is missing a branch.`);

            // Ensure the targetNamespace org is the same org
            assert.ok(elem.targetNamespace.org === orgID, `Element #${index}'s `
              + 'target cannot reference elements outside its org.');
            // Ensure the project is in the projectReferences array
            const tmpProj = utils.createID(elem.targetNamespace.org, elem.targetNamespace.project);
            assert.ok(foundProject.projectReferences.includes(tmpProj),
              `The project [${elem.targetNamespace.project}] is not in the `
                + 'projectReferences list.');

            // Reset the elem target with new project
            const tmpTarget = utils.parseID(elem.target).pop();
            elem.target = utils.createID(elem.targetNamespace.org,
              elem.targetNamespace.project, tmpTarget);

            // Remove the last target which has the wrong project
            sourceTargetIDs.pop();
            sourceTargetIDs.push(elem.target);

            // Delete targetNamespace, it does not get stored in the database
            delete elem.targetNamespace;
          }

          index++;
        });
      }
      catch (err) {
        throw new M.CustomError(err.message, 403, 'warn');
      }

      const promises = [];
      searchQuery = { project: utils.createID(orgID, projID) };
      sourceTargetQuery = { _id: { $in: sourceTargetIDs } };

      // Find elements in batches
      for (let i = 0; i < elementsToUpdate.length / 50000; i++) {
        // Split elementIDs list into batches of 50000
        searchQuery._id = elementsToUpdate.slice(i * 50000, i * 50000 + 50000);

        // Add find operation to promises array
        promises.push(Element.find(searchQuery).lean()
        .then((_foundElements) => {
          foundElements = foundElements.concat(_foundElements);
        }));
      }

      // Return when all elements have been found
      return Promise.all(promises);
    })
    .then(() => {
      // Verify the same number of elements are found as desired
      if (foundElements.length !== arrIDs.length) {
        const foundIDs = foundElements.map(e => e._id);
        const notFound = arrIDs.filter(e => !foundIDs.includes(e))
        .map(e => utils.parseID(e).pop());
        throw new M.CustomError(
          `The following elements were not found: [${notFound.toString()}].`, 404, 'warn'
        );
      }

      return Element.find(sourceTargetQuery).lean();
    })
    .then((foundSourceTarget) => {
      // Convert elementsToUpdate to JMI type 2
      const jmiType2 = jmi.convertJMI(1, 2, elementsToUpdate);
      // Convert foundSourceTarget to JMI type 2
      const sourceTargetJMI2 = jmi.convertJMI(1, 2, foundSourceTarget);
      const bulkArray = [];
      // Get array of editable parameters
      const validFields = Element.getValidUpdateFields();

      // For each found element
      foundElements.forEach((element) => {
        const updateElement = jmiType2[element._id];
        // Remove id and _id field from update object
        delete updateElement.id;
        delete updateElement._id;

        // Error Check: if element is currently archived, it must first be unarchived
        if (element.archived && updateElement.archived !== false) {
          throw new M.CustomError(`Element [${utils.parseID(element._id).pop()}]`
              + ' is archived. Archived objects cannot be modified.', 403, 'warn');
        }

        // For each key in the updated object
        Object.keys(updateElement).forEach((key) => {
          // Check if the field is valid to update
          if (!validFields.includes(key)) {
            throw new M.CustomError(`Element property [${key}] cannot `
                + 'be changed.', 400, 'warn');
          }

          // Get validator for field if one exists
          if (validators.element.hasOwnProperty(key)) {
            // If validation fails, throw error
            if (!RegExp(validators.element[key]).test(updateElement[key])) {
              throw new M.CustomError(
                `Invalid ${key}: [${updateElement[key]}]`, 403, 'warn'
              );
            }
          }

          // If updating the source or target
          if (key === 'source' || key === 'target') {
            // If the source/target is the element id, throw error
            if (updateElement[key] === element._id) {
              throw new M.CustomError(`Element's ${key} cannot be self`
                + ` [${utils.parseID(element._id).pop()}].`, 403, 'warn');
            }

            // If source/target does not exist, throw error
            if (!sourceTargetJMI2[updateElement[key]] && updateElement[key] !== null) {
              throw new M.CustomError(`The ${key} element `
                + `[${utils.parseID(updateElement[key]).pop()}] was not found `
                + `in the project [${utils.parseID(updateElement[key])[1]}].`, 404, 'warn');
            }

            // If no target exists and is not being updated, throw error
            if (key === 'source' && !(updateElement.target || element.target)) {
              throw new M.CustomError(`Element [${utils.parseID(element._id).pop()}]`
                + ' target is required if source is provided.', 403, 'warn');
            }

            // If no source exists and is not being updated, throw error
            if (key === 'target' && !(updateElement.source || element.source)) {
              throw new M.CustomError(`Element [${utils.parseID(element._id).pop()}]`
                + ' source is required if target is provided.', 403, 'warn');
            }
          }

          // Set archivedBy if archived field is being changed
          if (key === 'archived') {
            const elemID = utils.parseID(element._id).pop();
            // Error Check: ensure user cannot archive root elements
            if (Element.getValidRootElements().includes(elemID)) {
              throw new M.CustomError(
                `User cannot archive the root element: ${elemID}.`, 403, 'warn'
              );
            }

            // If the element is being archived
            if (updateElement[key] && !element[key]) {
              updateElement.archivedBy = reqUser._id;
              updateElement.archivedOn = Date.now();
            }
            // If the element is being unarchived
            else if (!updateElement[key] && element[key]) {
              updateElement.archivedBy = null;
              updateElement.archivedOn = null;
            }
          }
        });

        // Update lastModifiedBy field and updatedOn
        updateElement.lastModifiedBy = reqUser._id;
        updateElement.updatedOn = Date.now();

        // Update the element
        bulkArray.push({
          updateOne: {
            filter: { _id: element._id },
            update: updateElement
          }
        });
      });

      // Update all elements through a bulk write to the database
      return Element.bulkWrite(bulkArray);
    })
    .then(() => {
      const promises2 = [];
      // Find elements in batches
      for (let i = 0; i < arrIDs.length / 50000; i++) {
        // Split arrIDs list into batches of 50000
        searchQuery._id = arrIDs.slice(i * 50000, i * 50000 + 50000);

        // If the lean option is supplied
        if (validOptions.lean) {
          // Add find operation to promises array
          promises2.push(Element.find(searchQuery, validOptions.fieldsString)
          .populate(validOptions.populateString || 'contains').lean()
          .then((_foundElements) => {
            foundUpdatedElements = foundUpdatedElements.concat(_foundElements);
          }));
        }
        else {
          // Add find operation to promises array
          promises2.push(Element.find(searchQuery, validOptions.fieldsString)
          .populate(validOptions.populateString || 'contains')
          .then((_foundElements) => {
            foundUpdatedElements = foundUpdatedElements.concat(_foundElements);
          }));
        }
      }

      // Return when all elements have been found
      return Promise.all(promises2);
    })
    .then(() => {
      // Emit the event elements-updated
      EventEmitter.emit('elements-updated', foundUpdatedElements);

      return resolve(foundUpdatedElements);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function creates or replaces one or many elements. If the
 * element already exists, it is replaced with the provided data. NOTE: This
 * function is reserved for system-wide admins ONLY.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to add elements to.
 * @param {(Object|Object[])} elements - Either an array of objects containing
 * element data or a single object containing element data to create/replace.
 * @param {string} elements.id - The ID of the element being created/replaced.
 * @param {string} [elements.name] - The name of the element.
 * @param {string} [elements.parent = 'model'] - The ID of the parent of the
 * element.
 * @param {string} [elements.source] - The ID of the source element. If
 * provided, the parameter target is required.
 * @param {Object} [elements.sourceNamespace] - The optional namespace of the
 * source element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.target] - The ID of the target element. If
 * provided, the parameter source is required.
 * @param {Object} [elements.targetNamespace] - The optional namespace of the
 * target element, if the element is not part of the project. Must include the
 * key/value pairs 'org', 'project' and 'branch'. The organization must be the
 * same as relationships org.
 * @param {string} [elements.documentation] - Any additional text
 * documentation about an element.
 * @param {string} [elements.type] - An optional type string.
 * @param {Object} [elements.custom] - Any additional key/value pairs for an
 * object. Must be proper JSON form.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return
 * of the found objects. By default, no fields are populated.
 * @param {string[]} [options.fields] - An array of fields to return. By default
 * includes the _id, id, and contains. To NOT include a field, provide a '-' in
 * front.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 *
 * @return {Promise} Array of created/replaced element objects
 *
 * @example
 * createOrReplace({User}, 'orgID', 'projID', 'branch', [{Elem1}, {Elem2}, ...])
 * .then(function(elements) {
 *   // Do something with the newly created/replaced elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function createOrReplace(requestingUser, organizationID, projectID, branch, elements, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(requestingUser.admin === true, 'User does not have permissions'
        + 'to replace elements.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');
      assert.ok(typeof elements === 'object', 'Elements parameter is not an object.');
      assert.ok(elements !== null, 'Elements parameter cannot be null.');
      // If elements is an array, ensure each item inside is an object
      if (Array.isArray(elements)) {
        assert.ok(elements.every(e => typeof e === 'object'), 'Every item in elements is not an'
          + ' object.');
        assert.ok(elements.every(e => e !== null), 'One or more items in elements is null.');
      }
      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const saniElements = sani.mongo(JSON.parse(JSON.stringify(elements)));
    const duplicateCheck = {};
    let foundElements = [];
    let elementsToLookup = [];
    let createdElements = [];
    let foundElementIDs = [];
    const ts = Date.now();

    // Find the project
    Project.findOne({ _id: utils.createID(orgID, projID) }).lean()
    .then((foundProject) => {
      // Check that the project was found
      if (!foundProject) {
        throw new M.CustomError(`Project [${projID}] not found in the `
          + `organization [${orgID}].`, 404, 'warn');
      }

      // Check the type of the elements parameter
      if (Array.isArray(saniElements)) {
        // elements is an array, create/replace many elements
        elementsToLookup = saniElements;
      }
      else if (typeof saniElements === 'object') {
        // elements is an object, create/replace a single element
        elementsToLookup = [saniElements];
      }
      else {
        throw new M.CustomError('Invalid input for creating/replacing'
          + ' elements.', 400, 'warn');
      }

      // Create list of ids
      const arrIDs = [];
      try {
        let index = 1;
        elementsToLookup.forEach((elem) => {
          // Ensure each element has an id and that its a string
          assert.ok(elem.hasOwnProperty('id'), `Element #${index} does not have an id.`);
          assert.ok(typeof elem.id === 'string', `Element #${index}'s id is not a string.`);
          const tmpID = utils.createID(orgID, projID, elem.id);
          // If a duplicate ID, throw an error
          if (duplicateCheck[tmpID]) {
            throw new M.CustomError(`Multiple objects with the same ID [${elem.id}] exist in the`
              + ' update.', 400, 'warn');
          }
          else {
            duplicateCheck[tmpID] = tmpID;
          }
          arrIDs.push(tmpID);
          index++;
        });
      }
      catch (err) {
        throw new M.CustomError(err.message, 403, 'warn');
      }

      const promises = [];
      const searchQuery = { project: utils.createID(orgID, projID) };

      // Find elements in batches
      for (let i = 0; i < arrIDs.length / 50000; i++) {
        // Split arrIDs list into batches of 50000
        searchQuery._id = arrIDs.slice(i * 50000, i * 50000 + 50000);

        // Add find operation to promises array
        promises.push(Element.find(searchQuery).lean()
        .then((_foundElements) => {
          foundElements = foundElements.concat(_foundElements);
        }));
      }

      // Return when all elements have been found
      return Promise.all(promises);
    })
    .then(() => {
      foundElementIDs = foundElements.map(e => e._id);

      // Error Check: ensure user cannot replace root element
      foundElementIDs.forEach((id) => {
        if (Element.getValidRootElements().includes(utils.parseID(id).pop())) {
          throw new M.CustomError(
            `User cannot replace root element: ${utils.parseID(id).pop()}.`, 403, 'warn'
          );
        }
      });

      // Create temporary element data
      // If data directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data'))) {
        fs.mkdirSync(path.join(M.root, 'data'));
      }

      // If org directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data', orgID))) {
        fs.mkdirSync(path.join(M.root, 'data', orgID));
      }

      // If project directory doesn't exist, create it
      if (!fs.existsSync(path.join(M.root, 'data', orgID, projID))) {
        fs.mkdirSync(path.join(M.root, 'data', orgID, projID));
      }

      // Write contents to temporary file
      return new Promise(function(res, rej) {
        fs.writeFile(path.join(M.root, 'data', orgID, projID, `PUT-backup-elements-${ts}.json`),
          JSON.stringify(foundElements), function(err) {
            if (err) rej(err);
            else res();
          });
      });
    })
    // Delete elements from database
    .then(() => Element.deleteMany({ _id: foundElementIDs }).lean())
    .then(() => {
      // Emit the event elements-deleted
      EventEmitter.emit('elements-deleted', foundElements);

      // Create new elements
      return create(requestingUser, orgID, projID, branch, elementsToLookup, options);
    })
    .then((_createdElements) => {
      createdElements = _createdElements;
      const filePath = path.join(M.root, 'data', orgID, projID, `PUT-backup-elements-${ts}.json`);
      // Delete the temporary file.
      if (fs.existsSync(filePath)) {
        return new Promise(function(res, rej) {
          fs.unlink(filePath, function(err) {
            if (err) rej(err);
            else res();
          });
        });
      }
    })
    .then(() => {
      // Read all of the files in the project directory
      const existingProjFiles = fs.readdirSync(path.join(M.root, 'data', orgID, projID));

      // If no files exist in the directory, delete it
      if (existingProjFiles.length === 0) {
        fs.rmdirSync(path.join(M.root, 'data', orgID, projID));
      }

      // Read all of the files in the org directory
      const existingOrgFiles = fs.readdirSync(path.join(M.root, 'data', orgID));

      // If no files exist in the directory, delete it
      if (existingOrgFiles.length === 0) {
        fs.rmdirSync(path.join(M.root, 'data', orgID));
      }

      return resolve(createdElements);
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description This function removes one or many elements as well as the
 * subtree under those elements. Once the elements are deleted, the IDs of the
 * deleted elements are returned.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to remove elements from.
 * @param {(string|string[])} elements - The elements to remove. Can either be
 * an array of element ids or a single element id.
 * @param {Object} [options] - A parameter that provides supported options.
 * Currently there are no supported options.
 *
 * @return {Promise} Array of deleted element ids
 *
 * @example
 * remove({User}, 'orgID', 'projID', 'branch', ['elem1', 'elem2'])
 * .then(function(elements) {
 *   // Do something with the deleted elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function remove(requestingUser, organizationID, projectID, branch, elements, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');

      const elementsTypes = ['object', 'string'];
      const optionsTypes = ['undefined', 'object'];
      assert.ok(elementsTypes.includes(typeof elements), 'Elements parameter is an invalid type.');
      // If elements is an object, ensure it's an array of strings
      if (typeof elements === 'object') {
        assert.ok(Array.isArray(elements), 'Elements is an object, but not an array.');
        assert.ok(elements.every(e => typeof e === 'string'), 'Elements is not an array of'
          + ' strings.');
      }
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const saniElements = sani.mongo(JSON.parse(JSON.stringify(elements)));
    let elementsToFind = [];
    let foundIDs = [];

    // Check the type of the elements parameter
    if (Array.isArray(saniElements) && saniElements.length !== 0) {
      // An array of element ids, remove all
      elementsToFind = saniElements.map(e => utils.createID(orgID, projID, e));
    }
    else if (typeof saniElements === 'string') {
      // A single element id, remove one
      elementsToFind = [utils.createID(orgID, projID, saniElements)];
    }
    else {
      // Invalid parameter, throw an error
      throw new M.CustomError('Invalid input for removing elements.', 400, 'warn');
    }

    // Find the project to verify permissions
    Project.findOne({ _id: utils.createID(orgID, projID) })
    .then((foundProject) => {
      // Verify the project was found or exists
      if (foundProject === null) {
        throw new M.CustomError(`The project [${projID}] was not found.`, 404, 'warn');
      }

      // Verify the requesting user has at least project write permissions
      if (!reqUser.admin && (!foundProject.permissions[reqUser._id]
        || !foundProject.permissions[reqUser._id].includes('write'))) {
        throw new M.CustomError('User does not have permission to delete'
          + ` elements on the project [${projID}].`, 403, 'warn');
      }

      // Find the elements to delete
      return Element.find({ _id: { $in: elementsToFind } }).lean();
    })
    .then((foundElements) => {
      const foundElementIDs = foundElements.map(e => e._id);

      // Check if all elements were found
      const notFoundIDs = elementsToFind.filter(e => !foundElementIDs.includes(e));
      // Some elements not found, throw an error
      if (notFoundIDs.length > 0) {
        throw new M.CustomError('The following elements were not found: '
          + `[${notFoundIDs.map(e => utils.parseID(e)
          .pop())}].`, 404, 'warn');
      }

      // Find all element IDs and their subtree IDs
      return findElementTree(orgID, projID, 'master', elementsToFind);
    })
    .then((_foundIDs) => {
      foundIDs = _foundIDs;
      const promises = [];
      // Error Check: ensure user cannot delete root elements
      foundIDs.forEach((id) => {
        const elemID = utils.parseID(id).pop();
        if (Element.getValidRootElements().includes(elemID)) {
          throw new M.CustomError(
            `User cannot delete root element: ${elemID}.`, 403, 'warn'
          );
        }
      });

      // Split elements into batches of 50000 or less
      for (let i = 0; i < foundIDs.length / 50000; i++) {
        const batchIDs = foundIDs.slice(i * 50000, i * 50000 + 50000);
        // Delete batch
        promises.push(Element.deleteMany({ _id: { $in: batchIDs } }).lean());
      }
      // Return when all deletes have completed
      return Promise.all(promises);
    })
    .then(() => {
      const uniqueIDs = {};

      // Parse foundIDs and only return unique ones
      foundIDs.forEach((id) => {
        if (!uniqueIDs[id]) {
          uniqueIDs[id] = id;
        }
      });

      // Emit the event elements-deleted
      EventEmitter.emit('elements-deleted', Object.keys(uniqueIDs));

      // Return just the unique ids
      return resolve(Object.keys(uniqueIDs));
    })
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}

/**
 * @description A non-exposed helper function which finds the subtree of given
 * elements.
 *
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to find elements from.
 * @param {string[]} elementIDs - The elements whose subtrees are being found.
 *
 * @return {Promise} Array of found element ids
 *
 * @example
 * findElementTree('orgID', 'projID', 'branch', ['elem1', 'elem2',...])
 * .then(function(elementIDs) {
 *   // Do something with the found element IDs
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function findElementTree(organizationID, projectID, branch, elementIDs) {
  // Ensure elementIDs is an array
  if (!Array.isArray(elementIDs)) {
    throw new M.CustomError('ElementIDs array is not an array.', 400, 'warn');
  }

  // Set the foundElements array to initial element IDs
  let foundElements = elementIDs;

  // If no elements provided, find all elements in project
  if (foundElements.length === 0) {
    foundElements = [utils.createID(organizationID, projectID, 'model')];
  }

  // Define nested helper function
  function findElementTreeHelper(ids) {
    return new Promise((resolve, reject) => {
      // Find all elements whose parent is in the list of given ids
      Element.find({ parent: { $in: ids } }, '_id').lean()
      .then(elements => {
        // Get a list of element ids
        const foundIDs = elements.map(e => e._id);
        // Add these elements to the global list of found elements
        foundElements = foundElements.concat(foundIDs);

        // If no elements were found, exit the recursive function
        if (foundIDs.length === 0) {
          return '';
        }

        // Recursively find the sub-children of the found elements in batches of 50000 or less
        for (let i = 0; i < foundIDs.length / 50000; i++) {
          const tmpIDs = foundIDs.slice(i * 50000, i * 50000 + 50000);
          return findElementTreeHelper(tmpIDs);
        }
      })
      .then(() => resolve())
      .catch((error) => reject(M.CustomError.parseCustomError(error)));
    });
  }

  return new Promise((resolve, reject) => {
    const promises = [];

    // If initial batch of ids is greater than 50000, split up in batches
    for (let i = 0; i < foundElements.length / 50000; i++) {
      const tmpIDs = foundElements.slice(i * 50000, i * 50000 + 50000);
      // Find elements subtree
      promises.push(findElementTreeHelper(tmpIDs));
    }

    Promise.all(promises)
    .then(() => resolve(foundElements))
    .catch((error) => reject(error));
  });
}

/**
 * @description A non-exposed helper function that throws an error if the new
 * elements parent is in the given elements subtree.
 *
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to find elements from.
 * @param {Object} element - The element whose parent is being checked. The
 * .parent parameter should be the new, desired parent.
 *
 * @return {Promise} Resolved promise to verify element parent.
 *
 * @example
 * moveElementCheck('orgID', 'projID', 'branch', {Elem1})
 * .then(function() {
 *   // Continue with normal process
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function moveElementCheck(organizationID, projectID, branch, element) {
  return new Promise((resolve, reject) => {
    // Create the name-spaced ID
    const elementID = utils.createID(organizationID, projectID, element.id);

    // Error Check: ensure elements parent is not self
    if (element.parent === elementID) {
      throw new M.CustomError('Elements parent cannot be self.', 403, 'warn');
    }

    // Error Check: ensure the root elements is not being moved
    if (Element.getValidRootElements().includes(element.id)) {
      throw new M.CustomError(
        `Cannot move the root element: ${element.id}.`, 403, 'warn'
      );
    }

    // Define nested helper function
    function findElementParentRecursive(e) {
      return new Promise((res, rej) => {
        Element.findOne({ _id: e.parent }).lean()
        .then((foundElement) => {
          // If foundElement is null, reject with error
          if (!foundElement) {
            throw new M.CustomError('Parent element '
              + `[${utils.parseID(e.parent).pop()}] not found.`, 404, 'warn');
          }

          // If element.parent is root, resolve... there is no conflict
          if (foundElement.parent === null
            || utils.parseID(foundElement.parent).pop() === 'model') {
            return '';
          }

          // If elementID is equal to foundElement.id, a circular reference would
          // exist, reject with an error
          if (elementID === foundElement.id) {
            throw new M.CustomError('A circular reference exists in the model,'
              + ' element cannot be moved.', 400, 'warn');
          }
          else {
            // Find the parents parent
            return findElementParentRecursive(foundElement);
          }
        })
        .then(() => resolve())
        .catch((error) => rej(M.CustomError.parseCustomError(error)));
      });
    }

    // Call the recursive find function
    findElementParentRecursive(element)
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description A function which searches elements within a certain project
 * using mongo's built in text search. Returns any elements that match the text
 * search, in order of the best matches to the worst. Searches the _id, name,
 * documentation, parent, source and target fields.
 *
 * @param {User} requestingUser - The object containing the requesting user.
 * @param {string} organizationID - The ID of the owning organization.
 * @param {string} projectID - The ID of the owning project.
 * @param {string} branch - The ID of the branch to find elements from.
 * @param {string} query - The text-based query to search the database for.
 * @param {Object} [options] - A parameter that provides supported options.
 * @param {string[]} [options.populate] - A list of fields to populate on return of
 * the found objects. By default, no fields are populated.
 * @param {boolean} [options.archived = false] - If true, find results will include
 * archived objects.
 * @param {number} [options.limit = 0] - A number that specifies the maximum
 * number of documents to be returned to the user. A limit of 0 is equivalent to
 * setting no limit.
 * @param {number} [options.skip = 0] - A non-negative number that specifies the
 * number of documents to skip returning. For example, if 10 documents are found
 * and skip is 5, the first 5 documents will NOT be returned.
 * @param {boolean} [options.lean = false] - A boolean value that if true
 * returns raw JSON instead of converting the data to objects.
 * @param {string} [options.parent] - Search for elements with a specific
 * parent.
 * @param {string} [options.source] - Search for elements with a specific
 * source.
 * @param {string} [options.target] - Search for elements with a specific
 * target.
 * @param {string} [options.type] - Search for elements with a specific type.
 * @param {string} [options.name] - Search for elements with a specific name.
 * @param {string} [options.createdBy] - Search for elements with a specific
 * createdBy value.
 * @param {string} [options.lastModifiedBy] - Search for elements with a
 * specific lastModifiedBy value.
 * @param {string} [options.archivedBy] - Search for elements with a specific
 * archivedBy value.
 * @param {string} [options.custom....] - Search for any key in custom data. Use
 * dot notation for the keys. Ex: custom.hello = 'world'
 *
 * @return {Promise} An array of found elements.
 *
 * @example
 * search({User}, 'orgID', 'projID', 'branch', 'find these elements')
 * .then(function(elements) {
 *   // Do something with the found elements
 * })
 * .catch(function(error) {
 *   M.log.error(error);
 * });
 */
function search(requestingUser, organizationID, projectID, branch, query, options) {
  return new Promise((resolve, reject) => {
    // Ensure input parameters are correct type
    try {
      assert.ok(typeof requestingUser === 'object', 'Requesting user is not an object.');
      assert.ok(requestingUser !== null, 'Requesting user cannot be null.');
      // Ensure that requesting user has an _id field
      assert.ok(requestingUser._id, 'Requesting user is not populated.');
      assert.ok(typeof organizationID === 'string', 'Organization ID is not a string.');
      assert.ok(typeof projectID === 'string', 'Project ID is not a string.');
      assert.ok(typeof branch === 'string', 'Branch ID is not a string.');
      assert.ok(typeof query === 'string', 'Query is not a string.');
      // Ensure user is on the master branch
      assert.ok(branch === 'master', 'User must be on the master branch.');

      const optionsTypes = ['undefined', 'object'];
      assert.ok(optionsTypes.includes(typeof options), 'Options parameter is an invalid type.');
    }
    catch (err) {
      throw new M.CustomError(err.message, 400, 'warn');
    }

    // Sanitize input parameters and create function-wide variables
    const reqUser = JSON.parse(JSON.stringify(requestingUser));
    const orgID = sani.mongo(organizationID);
    const projID = sani.mongo(projectID);
    const searchQuery = { project: utils.createID(orgID, projID), archived: false };

    // Initialize valid options
    let validOptions = {};

    // Validate and set the options
    validOptions = utils.validateOptions(options, ['populate', 'archived',
      'limit', 'skip', 'lean'], Element);

    // Ensure options are valid
    if (options) {
      // Create array of valid search options
      const validSearchOptions = ['parent', 'source', 'target', 'type', 'name',
        'createdBy', 'lastModifiedBy', 'archivedBy'];

      // Loop through provided options
      Object.keys(options).forEach((o) => {
        // If the provided option is a valid search option
        if (validSearchOptions.includes(o) || o.startsWith('custom.')) {
          // Ensure the search option is a string
          if (typeof options[o] !== 'string') {
            throw new M.CustomError(`The option '${o}' is not a string.`, 400, 'warn');
          }

          // If the search option is an element reference
          if (['parent', 'source', 'target'].includes(o)) {
            // Make value the concatenated ID
            options[o] = utils.createID(orgID, projID, options[o]);
          }

          // Add the search option to the searchQuery
          searchQuery[o] = sani.mongo(options[o]);
        }
      });
    }

    // Ensure the project exists
    Project.findOne({ _id: utils.createID(orgID, projID) }).lean()
    .then((project) => {
      // Ensure the project was found
      if (project === null) {
        throw new M.CustomError(`The project [${projID}] on the org ${orgID} `
          + 'was not found.', 404, 'warn');
      }

      // Verify the user has read permissions on the project
      if (!reqUser.admin && (!project.permissions[reqUser._id]
        || !project.permissions[reqUser._id].includes('read'))) {
        throw new M.CustomError('User does not have permission to get'
          + ` elements on the project ${utils.parseID(project._id).pop()}.`, 403, 'warn');
      }

      searchQuery.$text = { $search: query };
      // If the archived field is true, remove it from the query
      if (validOptions.archived) {
        delete searchQuery.archived;
      }

      // If the lean option is supplied
      if (validOptions.lean) {
        // Search for the elements
        return Element.find(searchQuery, { score: { $meta: 'textScore' } },
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort({ score: { $meta: 'textScore' } })
        .populate(validOptions.populateString || 'contains').lean();
      }
      else {
        // Search for the elements
        return Element.find(searchQuery, { score: { $meta: 'textScore' } },
          { limit: validOptions.limit, skip: validOptions.skip })
        .sort({ score: { $meta: 'textScore' } })
        .populate(validOptions.populateString || 'contains');
      }
    })
    .then((foundElements) => resolve(foundElements))
    .catch((error) => reject(M.CustomError.parseCustomError(error)));
  });
}
