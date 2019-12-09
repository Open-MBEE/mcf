/**
 * @classification UNCLASSIFIED
 *
 * @module db.mongoose-mongodb-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description This file defines the schema strategy for using MBEE with Mongoose
 * and MongoDB.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

/**
 * @description Create connection to database.
 *
 * @returns {Promise} Resolved promise.
 */
function connect() {
  return new Promise((resolve, reject) => {
    // Declare variables for mongoose connection
    const dbName = M.config.db.name;
    const url = M.config.db.url;
    const dbPort = M.config.db.port;
    const dbUsername = M.config.db.username;
    const dbPassword = M.config.db.password;
    let connectURL = 'mongodb://';

    // If username/password provided
    if (dbUsername !== '' && dbPassword !== '' && dbUsername && dbPassword) {
      // Append username/password to connection URL
      connectURL = `${connectURL + dbUsername}:${dbPassword}@`;
    }
    connectURL = `${connectURL + url}:${dbPort}/${dbName}`;

    const options = {};

    // Configure an SSL connection
    if (M.config.db.ssl) {
      connectURL += '?ssl=true';
      // Retrieve CA file
      const caPath = path.join(M.root, M.config.db.ca);
      options.sslCA = fs.readFileSync(caPath, 'utf8');
    }

    // Remove mongoose deprecation warnings
    mongoose.set('useFindAndModify', false);
    mongoose.set('useNewUrlParser', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useUnifiedTopology', true);

    // Database debug logs
    // Additional arguments may provide too much information
    mongoose.set('debug', function(collectionName, methodName, arg1, arg2, arg3) {
      M.log.debug(`DB OPERATION: ${collectionName}, ${methodName}`);
    });

    // Connect to database
    mongoose.connect(connectURL, options, (err) => {
      if (err) {
        // If error, reject it
        return reject(err);
      }
      return resolve();
    });
  });
}

/**
 * @description Closes connection to database.
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
function disconnect() {
  return new Promise((resolve, reject) => {
    mongoose.connection.close()
    .then(() => resolve())
    .catch((error) => reject(error));
  });
}

/**
 * @description Clears all contents from the database, equivalent to starting
 * from scratch. Used in 000 and 999 tests, which SHOULD NOT BE RUN IN PRODUCTION.
 * @async
 *
 * @returns {Promise} Resolves an empty promise upon completion.
 */
async function clear() {
  return mongoose.connection.db.dropDatabase();
}

/**
 * @description Sanitizes data which will be used in queries and inserted into
 * the database. If the data contains a $, which is a MongoDB reserved
 * character, the object key/value pair will be deleted.
 *
 * @param {*} data - User input to be sanitized. May be in any data format.
 *
 * @returns {*} Sanitized user input.
 */
function sanitize(data) {
  if (Array.isArray(data)) {
    return data.map((value) => this.sanitize(value));
  }
  else if (data instanceof Object) {
    // Check for '$' in each key parameter of userInput
    Object.keys(data).forEach((key) => {
      // If '$' in key, remove key from userInput
      if (/^\$/.test(key)) {
        delete data[key];
      }
      // If the value is an object
      else if (typeof data[key] === 'object' && data[key] !== null) {
        // Recursively call function on value
        this.sanitize(data[key]);
      }
    });
  }
  // Return modified userInput
  return data;
}

class Schema extends mongoose.Schema {

  constructor(definition, options = {}) {
    // Set the minimize option to false, allowing for empty objects to be stored in the database
    options.minimize = false;

    super(definition, options);

    // Required for virtual getters
    this.set('toJSON', { virtuals: true });
    this.set('toObject', { virtuals: true });
  }

  /**
   * @description Overrides the mongoose.Schema add function to properly handle
   * the special mongoose types.
   *
   * @param {object|Schema} obj - Plain object with paths to add, or another
   * schema.
   * @param {string} [prefix] - Path to prefix the newly added paths with.
   *
   * @returns {Promise} Resolves an empty promise upon completion.
   */
  add(obj, prefix) {
    /**
     * @description Change each type to the mongoose defined type.
     *
     * @param {object} object - Object with paths to add, or another schema.
     */
    function changeType(object) {
      Object.keys(object).forEach((k) => {
        // If a nested schema, handle each nested parameter
        if (Array.isArray(object[k])) {
          // Call recursively
          object[k].forEach((j) => changeType(j));
        }
        else {
          // If not an object, use mongoose defined type
          switch (object[k].type) {
            case 'String': object[k].type = String; break;
            case 'Number': object[k].type = Number; break;
            case 'Boolean': object[k].type = Boolean; break;
            case 'Date': object[k].type = Date; break;
            case 'Object': object[k].type = mongoose.Schema.Types.Mixed; break;
            default: object[k].type = String;
          }
        }
      });
    }

    // Call changeType()
    changeType(obj);

    // Call parent add
    return super.add(obj, prefix);
  }

}

class Model {

  /**
   * @description Class constructor. Initializes the mongoose model and stores
   * it in a variable called "model", in addition to the schema and model name.
   * Adds static functions from schema onto class.
   *
   * @param {string} name - The name of the model being created. This name is
   * used to create the collection name in the database.
   * @param {Schema} schema - The schema which is being turned into a model.
   * Should be an instance of the Schema class.
   * @param {string} [collection] - Optional name of the collection in the
   * database, if not provided the name should be used.
   */
  constructor(name, schema, collection) {
    // Instantiate the mongoose model
    this.model = mongoose.model(name, schema, collection);
    this.modelName = name;
    this.schema = schema;

    // Add static functions to the model
    Object.keys(schema.statics).forEach((f) => {
      this[f] = schema.statics[f];
    });
  }

  /**
   * @description Ensures all indexes are created.
   * @async
   *
   * @returns {Promise} Returns empty promise upon completion.
   */
  async init() {
    await this.model.ensureIndexes();
  }

  /**
   * @description Performs a large write operation on a collection. Can create,
   * update, or delete multiple documents. Calls the mongoose bulkWrite()
   * function.
   * @async
   *
   * @param {object[]} ops - An array of objects detailing what operations to
   * perform the data required for those operations.
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
   *   }
   * ]);
   *
   * @returns {Promise<object>} Result of the bulkWrite operation.
   */
  async bulkWrite(ops, options) {
    return this.model.bulkWrite(ops, options);
  }

  /**
   * @description Counts the number of documents that matches a filter. Calls
   * the mongoose countDocuments() function.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   *
   * @returns {Promise<number>} The number of documents which matched the filter.
   */
  async countDocuments(filter) {
    // Validate the query
    this.validateQuery(filter);

    return this.model.countDocuments(filter);
  }

  /**
   * @description Deletes the specified index from the database. Calls the
   * mongoose collection.dropIndex() function.
   * @async
   *
   * @param {string} name - The name of the index.
   *
   * @returns {Promise} Returns an empty promise upon completion.
   */
  async deleteIndex(name) {
    return this.model.collection.dropIndex(name);
  }

  /**
   * @description Deletes any documents that match the provided filter. Calls
   * the mongoose deleteMany() function.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by, and thus delete documents by.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object>} An object denoting the success of the delete
   * operation.
   */
  async deleteMany(filter, options) {
    // Validate the query
    this.validateQuery(filter);

    return this.model.deleteMany(filter, options);
  }

  /**
   * @description Finds multiple documents based on the filter provided. Calls
   * the mongoose find() function.
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
   * populate of return of a document. Only fields that reference other
   * documents can be populated. Populating a field returns the entire
   * referenced document instead of that document's ID. If no document exists,
   * null is returned.
   *
   * @returns {Promise<object[]>} An array containing the found documents, if
   * any.
   */
  async find(filter, projection, options) {
    // Validate the query
    this.validateQuery(filter);

    // Set lean option to true
    if (!options) {
      options = { lean: true }; // eslint-disable-line no-param-reassign
    }
    else {
      options.lean = true;
    }

    // If options.sort is not defined, set it to $natural
    if (!options.sort) {
      options.sort = { $natural: 1 };
    }

    // Handle text search
    if (Object.keys(filter).includes('$text')) {
      // Modify to user proper mongoDB format, { $text: { $search: 'query-string' } }
      filter.$text = { $search: filter.$text };

      // If there is already a projection defined
      if (projection) {
        const newProj = {};
        // Split the projection on spaces
        const keys = projection.split(' ');
        // For each key in the projection
        keys.forEach((k) => {
          // If it starts with a '-', we want to remove it from the document on return
          if (k.startsWith('-')) {
            newProj[k] = -1;
          }
          else {
            newProj[k] = 1;
          }
        });

        projection = newProj; // eslint-disable-line no-param-reassign
      }
      else {
        // Make projection an object
        projection = {}; // eslint-disable-line no-param-reassign
      }

      // Add the text search specific fields to the projection
      projection.score = {};
      projection.score.$meta = 'textScore';

      // Delete the $natural sort option
      delete options.sort.$natural;
      // Add the text search specific sorting
      options.sort.score = { $meta: 'textScore' };
    }

    // Call model.find()
    return this.model.find(filter, projection, options);
  }

  /**
   * @description Finds a single document based on the filter provided. Calls
   * the mongoose findOne() function.
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
   * @returns {Promise<object>} The found document, if any.
   */
  async findOne(filter, projection, options) {
    // Validate the query
    this.validateQuery(filter);

    // Set lean option to true
    if (!options) {
      options = { lean: true }; // eslint-disable-line no-param-reassign
    }
    else {
      options.lean = true;
    }

    // Call model.findOne()
    return this.model.findOne(filter, projection, options);
  }

  /**
   * @description Returns an array of indexes for the given model. Calls the
   * mongoose collection.indexes() function.
   * @async
   *
   * @returns {Promise<object[]>} Array of index objects.
   */
  async getIndexes() {
    return this.model.collection.indexes();
  }

  /**
   * @description Inserts any number of documents into the database. Calls the
   * mongoose insertMany() function.
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
    let useCollection = false;

    // Define the rawResult option
    if (!options) {
      options = { rawResult: true }; // eslint-disable-line no-param-reassign
    }
    else {
      options.rawResult = true;
    }

    // Set useCollection if skipValidation is true
    if (options && options.skipValidation) {
      useCollection = true;
      delete options.skipValidation;
    }

    let responseQuery = {};

    // If useCollection is true, use the MongoDB function directly
    if (useCollection) {
      responseQuery = await this.model.collection.insertMany(docs);
    }
    else {
      // Insert the documents
      responseQuery = await this.model.insertMany(docs, options);
    }

    // Return responseQuery.ops, the array of inserted documents
    return responseQuery.ops;
  }

  /**
   * @description Updates multiple documents matched by the filter with the same
   * changes in the provided doc. Calls the mongoose updateMany() function.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {object} doc - The object containing updates to the found documents.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object[]>} The updated objects.
   */
  async updateMany(filter, doc, options) {
    // Validate the query
    this.validateQuery(filter);

    return this.model.updateMany(filter, doc, options);
  }

  /**
   * @description Updates a single document which is matched by the filter, and
   * is updated with the doc provided. Calls the mongoose updateOne() function.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {object} doc - The object containing updates to the found document.
   * @param {object} [options] - An object containing options.
   *
   * @returns {Promise<object>} The updated document.
   */
  async updateOne(filter, doc, options) {
    // Validate the query
    this.validateQuery(filter);

    return this.model.updateOne(filter, doc, options);
  }

  /**
   * @description Validates a query to ensure it is not using any illegal,
   * mongo specific keys.
   *
   * @param {object} query - The query to validate.
   *
   * @throws {ServerError}
   */
  validateQuery(query) {
    // Loop over all keys in the query
    Object.keys(query).forEach((k) => {
      // If the value is an object, call recursively
      if (typeof query[k] === 'object' && query[k] !== null) {
        this.validateQuery(query[k]);
      }

      const validKeys = ['$in', '$text', '$all'];
      // If the key starts with '$' and is not in the validKeys array, throw an error
      if (k.startsWith('$') && !validKeys.includes(k)) {
        throw new M.ServerError(`The mongo keyword ${k} is no longer supported`
           + ' after implementation of the database abstraction.', 'critical');
      }
    });
  }

}

class Store extends MongoStore {

  /**
   * @description Calls the parent constructor to initialize the store.
   */
  constructor() {
    super({ mongooseConnection: mongoose.connection });
  }

}

module.exports = {
  connect,
  disconnect,
  clear,
  sanitize,
  Schema,
  Model,
  Store
};
