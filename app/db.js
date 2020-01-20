/**
 * @classification UNCLASSIFIED
 *
 * @module db
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Connor Doyle
 *
 * @author Austin Bieber
 *
 * @description The database abstraction layer. Defines functions and classes
 * which must be implemented by all database strategies.
 */

// Node modules
const events = require('events');

// MBEE modules
const DBModule = M.require(`db.${M.config.db.strategy}.${M.config.db.strategy}`);

const requiredFunctions = ['connect', 'disconnect', 'clear', 'sanitize',
  'Schema', 'Model', 'Store'];

// Error Check - Verify DBModule is imported and implements required functions/classes
requiredFunctions.forEach((fxn) => {
  if (!DBModule.hasOwnProperty(fxn)) {
    M.log.critical(`Error: DB Strategy (${M.config.db.strategy}) does not implement ${fxn}.`);
    process.exit(1);
  }
});

/**
 * @description Connects to the database.
 * @async
 *
 * @returns {Promise} Resolves on successful completion of promise.
 */
async function connect() {
  try {
    return await DBModule.connect();
  }
  catch (error) {
    throw new M.DatabaseError(error.message, 'critical');
  }
}

/**
 * @description Disconnects from the database.
 * @async
 *
 * @returns {Promise} Resolves on successful completion of promise.
 */
async function disconnect() {
  try {
    return await DBModule.disconnect();
  }
  catch (error) {
    throw new M.DatabaseError(error.message, 'critical');
  }
}

/**
 * @description Clears all contents from the database, equivalent to starting
 * from scratch. Used in 000 and 999 tests, which SHOULD NOT BE RUN IN PRODUCTION.
 * @async
 *
 * @returns {Promise} Resolves on successful completion of promise.
 */
async function clear() {
  try {
    return await DBModule.clear();
  }
  catch (error) {
    throw new M.DatabaseError(error.message, 'critical');
  }
}

/**
 * @description Sanitizes data which will be used in queries and inserted into
 * the database. As each database has different special characters and keywords,
 * this function should sanitize the data to protect against any injections or
 * retrieval of data by unprivileged users.
 *
 * @param {*} data - User input to be sanitized. May be in any data format.
 *
 * @returns {*} Sanitized user input.
 */
function sanitize(data) {
  try {
    return DBModule.sanitize(data);
  }
  catch (error) {
    throw new M.DatabaseError(error.message, 'error');
  }
}

/**
 * @description Defines the Schema class. Schemas define the properties and
 * methods that each instance of a document should have, as well as the static
 * functions which belong on a model. The Schema class is closely based on the
 * mongoose.js Schema class {@link https://mongoosejs.com/docs/api/schema.html}.
 */
class Schema extends DBModule.Schema {

  /**
   * @description Class constructor. Calls the parent constructor and ensures
   * that the parent class defines the required functions.
   *
   * @param {object} definition - The parameters and functions which define the
   * schema.
   * @param {object} [options] - A object containing valid options.
   */
  constructor(definition, options) {
    // Call parent constructor
    super(definition, options);

    // Check that expected functions are defined
    const expectedFunctions = ['add', 'plugin', 'index', 'virtual', 'static'];
    expectedFunctions.forEach((f) => {
      // Ensure the parameter is defined
      if (!(f in this)) {
        M.log.critical(`The Schema function ${f} is not defined!`);
        process.exit(1);
      }
      // Ensure it is a function
      if (typeof this[f] !== 'function') {
        M.log.critical(`The Schema function ${f} is not a function!`);
        process.exit(1);
      }
    });
  }

  /**
   * @description Adds an object/schema to the current schema.
   *
   * @param {(object|Schema)} obj - The object or schema to add to the current
   * schema.
   * @param {string} [prefix] - The optional prefix to add to the paths in obj.
   *
   * @returns {Schema} The modified Schema.
   */
  add(obj, prefix) {
    return super.add(obj, prefix);
  }

  /**
   * @description Registers a plugin for the schema.
   *
   * @param {Function} cb - A callback function to run.
   * @param {object} [options] - An object containing options.
   */
  plugin(cb, options) {
    super.plugin(cb, options);
  }

  /**
   * @description Defines an index for the schema. Can support adding compound
   * or text indexes.
   *
   * @param {object} fields - A object containing the key/values pairs where the
   * keys are the fields to add indexes to, and the values define the index type
   * where 1 defines an ascending index, -1 a descending index, and 'text'
   * defines a text index.
   * @param {object} [options] - An object containing options.
   */
  index(fields, options) {
    super.index(fields, options);
  }

  /**
   * @description Defines a virtual field for the schema. Virtuals are not
   * stored in the database and rather are calculated post-find. Virtuals
   * generally will require a second request to retrieve referenced documents.
   * Populated virtuals contains a localField and foreignField which must match
   * for a document to be added to the virtual collection. For example, the
   * organization Schema contains a virtual called "projects". This virtual
   * returns all projects whose "org" field matches the organizations "_id".
   *
   * @param {string} name - The name of the field to be added to the schema
   * post-find.
   * @param {object} [options] - An object containing options.
   * @param {(string|Model)} [options.ref] - The name of the model which the
   * virtual references.
   * @param {(string|Function)} [options.localField] - The field on the current
   * schema which is being used to match the foreignField.
   * @param {(string|Function)} [options.foreignField] - The field on the
   * referenced schema which is being used to match the localField.
   * @param {(boolean|Function)} [options.justOne] - If true, the virtual should
   * only return a single document. If false, the virtual will be an array of
   * documents.
   *
   * @returns {Function} Calls super on the virtual function of the implemented
   * database strategy's schema.
   */
  virtual(name, options) {
    return super.virtual(name, options);
  }

  /**
   * @description Adds a static method to the schema. This method should later
   * be an accessible static method on the model.
   *
   * @param {string} name - The name of the static function.
   * @param {Function} fn - The function to be added to the model.
   */
  static(name, fn) {
    super.static(name, fn);
  }

}

/**
 * @description Defines the Model class. Models are used to create documents and
 * to directly manipulate the database. Operations should be defined to perform
 * all basic CRUD operations on the database. The Model class requirements are
 * closely based on the Mongoose.js Model class
 * {@link https://mongoosejs.com/docs/api/model.html} with an important
 * exception, the constructor creates an instance of the model, not a document.
 */
class Model extends DBModule.Model {

  /**
   * @description Class constructor. Calls parent constructor, and ensures that
   * each of the required functions are defined in the parent class.
   *
   * @param {string} name - The name of the model being created. This name is
   * used to create the collection name in the database.
   * @param {Schema} schema - The schema which is being turned into a model.
   * Should be an instance of the Schema class.
   * @param {string} [collection] - Optional name of the collection in the
   * database, if not provided the name should be used.
   */
  constructor(name, schema, collection) {
    // Call parent constructor
    super(name, schema, collection);

    // Check that expected functions are defined
    const expectedFunctions = ['bulkWrite', 'countDocuments', 'deleteIndex',
      'deleteMany', 'find', 'findOne', 'getIndexes', 'insertMany', 'updateMany',
      'updateOne', 'init'];
    expectedFunctions.forEach((f) => {
      // Ensure the parameter is defined
      if (!(f in this)) {
        M.log.critical(`The Model function ${f} is not defined!`);
        process.exit(1);
      }
      // Ensure it is a function
      if (typeof this[f] !== 'function') {
        M.log.critical(`The Model function ${f} is not a function!`);
        process.exit(1);
      }
    });
  }

  /**
   * @description Runs any asynchronous initialization functions that could not
   * be run in the constructor.
   * @async
   *
   * @returns {Promise} Returns an empty promise upon completion.
   */
  async init() {
    return super.init();
  }

  /**
   * @description Performs a large write operation on a collection. Can create,
   * update, replace, or delete multiple documents.
   * @async
   *
   * @param {object[]} ops - An array of objects detailing what operations to
   * perform and the data required for those operations.
   * @param {object} [ops.insertOne] - Specified an insertOne operation.
   * @param {object} [ops.insertOne.document] - The document to create, for
   * insertOne.
   * @param {object} [ops.updateOne] - Specifies an updateOne operation.
   * @param {object} [ops.updateOne.filter] - An object containing parameters to
   * filter the find query by, for updateOne.
   * @param {object} [ops.updateOne.update] - An object containing updates to
   * the matched document from the updateOne filter.
   * @param {object} [ops.deleteOne] - Specifies a deleteOne operation.
   * @param {object} [ops.deleteOne.filter] - An object containing parameters to
   * filter the find query by, for deleteOne.
   * @param {object} [ops.deleteMany] - Specifies a deleteMany operation.
   * @param {object} [ops.deleteMany.filter] - An object containing parameters
   * to filter the find query by, for deleteMany.
   * @param {object} [ops.replaceOne] - Specifies a replace operation.
   * @param {object} [ops.replaceOne.filter] - An object containing parameters
   * to filter the find query by, for replaceOne.
   * @param {object} [ops.replaceOne.replacement] - The document to replace the
   * found document with.
   * @param {object} [options] - An object containing options.
   *
   * @example
   * await bulkWrite([
   *   {
   *     insertOne: {
   *       document: {
   *         name: 'Sample Name',
   *       }
   *     }
   *   },
   *   {
   *     updateOne: {
   *       filter: { _id: 'sample-id' },
   *       update: { name: 'Sample Name Updated' }
   *     }
   *   },
   *   {
   *     deleteOne: {
   *       filter: { _id: 'sample-id-to-delete' }
   *     }
   *   },
   *   {
   *     replaceOne: {
   *       filter: { _id: 'sample-id-to-replace' },
   *       replacement: {
   *         _id: 'sample-id-to-replace',
   *         name: 'Sample Name'
   *       }
   *     }
   *   }
   * ]);
   *
   * @returns {Promise<object>} Result of the bulkWrite operation. This result
   * should contain the number of documents inserted (insertedCount), the number
   * of documents updated (matchedCount), the number of documents deleted
   * (deletedCount) and the success of the operation (result), with 1 being
   * success and 0 being failure.
   */
  async bulkWrite(ops, options) {
    return super.bulkWrite(ops, options);
  }

  /**
   * @description Counts the number of documents that matches a filter.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   *
   * @returns {Promise<number>} The number of documents which matched the
   * filter.
   */
  async countDocuments(filter) {
    return super.countDocuments(filter);
  }

  /**
   * @description Deletes the specified index from the database.
   * @async
   *
   * @param {string} name - The name of the index.
   *
   * @returns {Promise} Returns an empty promise upon completion.
   */
  async deleteIndex(name) {
    return super.deleteIndex(name);
  }

  /**
   * @description Deletes any documents that match the provided filter.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by, and thus delete documents by.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object>} An object denoting the success of the delete
   * operation. The object should contain the key "n" which is the number of
   * documents deleted and the key "ok" which is either 1 for success or 0 for
   * failure.
   */
  async deleteMany(filter, options) {
    return super.deleteMany(filter, options);
  }

  /**
   * @description Finds multiple documents based on the filter provided.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {(string|null)} [projection] - Specifies the fields to return in
   * the documents that match the filter. To return all fields, omit this
   * parameter.
   * @param {object} [options] - An object containing options.
   * @param {object} [options.sort] - An object specifying the order by which
   * to sort and return the documents. Keys are fields by which to sort, and
   * values are the sort order where 1 is ascending and -1 is descending. It is
   * possible to sort by metadata by providing the key $meta and a non-numerical
   * value. This is used primarily for text based search.
   * @param {number} [options.limit] - Limits the number of documents returned.
   * A limit of 0 is equivalent to setting no limit and a negative limit is not
   * supported.
   * @param {number} [options.skip] - Skips a specified number of documents that
   * matched the query. Given 10 documents match with a skip of 5, only the
   * final 5 documents would be returned. A skip value of 0 is equivalent to not
   * skipping any documents. A negative skip value is not supported.
   * @param {string} [options.populate] - A space separated list of fields to
   * populate on return of a document. Only fields that reference other
   * documents can be populated. Populating a field returns the entire
   * referenced document instead of that document's ID. If no document exists,
   * null is returned.
   *
   * @returns {Promise<object[]>} An array containing the found documents, if
   * any.
   */
  async find(filter, projection, options) {
    return super.find(filter, projection, options);
  }

  /**
   * @description Finds a single document based on the filter provided.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the find
   * query by.
   * @param {(string|null)} [projection] - Specifies the fields to return in
   * the document that matches the filter. To return all fields, omit this
   * parameter.
   * @param {object} [options] - An object containing options.
   * @param {string} [options.populate] - A space separated list of fields to
   * populate of return of a document. Only fields that reference other
   * documents can be populated. Populating a field returns the entire
   * referenced document instead of that document's ID. If no document exists,
   * null is returned.
   *
   * @returns {Promise<(object|null)>} The found document, if any otherwise
   * null.
   */
  async findOne(filter, projection, options) {
    return super.findOne(filter, projection, options);
  }

  /**
   * @description Returns an array of indexes for the given model.
   * @async
   *
   * @returns {Promise<object[]>} Array of index objects.
   */
  async getIndexes() {
    return super.getIndexes();
  }

  /**
   * @description Inserts any number of documents into the database.
   * @async
   *
   * @param {object[]} docs - An array of documents to insert.
   * @param {object} [options] - An object containing options.
   * @param {boolean} [options.skipValidation] - If true, will not validate
   * the documents which are being created.
   *
   * @returns {Promise<object[]>} The created documents.
   */
  async insertMany(docs, options) {
    return super.insertMany(docs, options);
  }

  /**
   * @description Updates multiple documents matched by the filter with the same
   * changes in the provided doc.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {object} doc - The object containing updates to the found documents.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object>} An object denoting the success of the operation.
   * It should contain two keys, "n" which is the number of documents matched
   * and "nModified" which is the number of documents updated.
   */
  async updateMany(filter, doc, options) {
    return super.updateMany(filter, doc, options);
  }

  /**
   * @description Updates a single document which is matched by the filter, and
   * is updated with the doc provided.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {object} doc - The object containing updates to the found document.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object>} An object denoting the success of the operation.
   * It should contain two keys, "n" which is the number of documents matched
   * and "nModified" which is the number of documents updated.
   */
  async updateOne(filter, doc, options) {
    return super.updateOne(filter, doc, options);
  }

}

/**
 * @description Defines the Store class. The Store class is used along with
 * express-session to manage sessions. The class MUST extend node's built
 * in EventEmitter class. Please review the express-session documentation at
 * {@link https://github.com/expressjs/session#session-store-implementation}
 * to learn more about the Store implementation. There are many libraries
 * available that support different databases, and a list of those are also
 * available at the link above.
 */
class Store extends DBModule.Store {

  /**
   * @description Calls the parent constructor.
   *
   * @param {object} options - An object containing valid options.
   */
  constructor(options) {
    super(options);

    // Ensure that the parent class extends node's EventEmitter class
    if (!(this instanceof events)) {
      M.log.critical('The Store class must extend the Node.js EventEmitter '
      + 'class!');
      process.exit(1);
    }

    // Check that expected functions are defined
    const expectedFunctions = ['destroy', 'get', 'set'];
    expectedFunctions.forEach((f) => {
      // Ensure the parameter is defined
      if (!(f in this)) {
        M.log.critical(`The Store function ${f} is not defined!`);
        process.exit(1);
      }
      // Ensure it is a function
      if (typeof this[f] !== 'function') {
        M.log.critical(`The Store function ${f} is not a function!`);
        process.exit(1);
      }
    });
  }

  /**
   * @description An optional function used to get all sessions in the store
   * as an array.
   *
   * @param {Function} cb - The callback to run, should be called as
   * cb(error, sessions).
   *
   * @returns {Promise<object[]>} An array of all the sessions in the store.
   */
  all(cb) {
    return super.all(cb);
  }

  /**
   * @description A required function which deletes a given session from the
   * store.
   *
   * @param {string} sid - The ID of the session to delete.
   * @param {Function} cb - The callback to run, should be called as cb(error).
   *
   * @returns {Promise} Resolves an empty promise upon completion.
   */
  destroy(sid, cb) {
    return super.destroy(sid, cb);
  }

  /**
   * @description An optional function which deletes all sessions from the
   * store.
   *
   * @param {Function} cb - The callback to run, should be called as cb(error).
   *
   * @returns {Promise} Resolves an empty promise upon completion.
   */
  clear(cb) {
    return super.clear(cb);
  }

  /**
   * @description An optional function which gets the count of all session in
   * the store.
   *
   * @param {Function} cb - The callback to run, should be called as
   * cb(error, len).
   *
   * @returns {Promise<number>} The number of sessions in the store.
   */
  length(cb) {
    return super.length(cb);
  }

  /**
   * @description A required function which gets the specified session from the
   * store.
   *
   * @param {string} sid - The ID of the session to retrieve.
   * @param {Function} cb - The callback to run, should be called as
   * cb(error, session). The session argument should be the session if found,
   * otherwise null or undefined if not found.
   *
   * @returns {Promise<object>} The specified session from the store.
   */
  get(sid, cb) {
    return super.get(sid, cb);
  }

  /**
   * @description A required function which upserts a given session into the
   * store.
   *
   * @param {string} sid - The ID of the session to upsert.
   * @param {object} session - The session object to upsert.
   * @param {Function} cb - The callback to run, should be called as cb(error).
   *
   * @returns {Promise} Resolves an empty promise upon completion.
   */
  set(sid, session, cb) {
    return super.set(sid, session, cb);
  }

  /**
   * @description An optional yet recommended function which "touches" a given
   * session. This function is used to reset the idle timer on an active session
   * which may be potentially deleted.
   *
   * @param {string} sid - The ID of the session to "touch".
   * @param {object} session - The session to "touch".
   * @param {Function} cb - The callback to run, should be called as cb(error).
   *
   * @returns {Promise} Resolves an empty promise upon completion.
   */
  touch(sid, session, cb) {
    return super.touch(sid, session, cb);
  }

}

// Export different classes and functions
module.exports = {
  connect,
  disconnect,
  clear,
  sanitize,
  Schema,
  Model,
  Store
};
