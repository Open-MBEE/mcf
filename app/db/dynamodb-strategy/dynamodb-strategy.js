/**
 * @classification UNCLASSIFIED
 *
 * @module db.dynamodb-strategy.dynamodb-strategy
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description This file defines the schema strategy for using MBEE with the
 * database DynamoDB.
 */

// NPM modules
const AWS = require('aws-sdk');
const DynamoDBStore = require('dynamodb-store');

// MBEE modules
const errors = M.require('lib.errors');
const utils = M.require('lib.utils');

// Define a function wide variable models, which stores each model when it gets created
// This is later used for population of documents across models
const models = {};

/**
 * @description Creates the connection to the DynamoDB instance. View the
 * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property DynamoDB}
 * documentation for more information on the DynamoDB constructor. This function
 * does not NEED to be async, but the requirements of the database abstraction
 * layer expect it to be.
 *
 * @returns {Promise<object>} The DynamoDB connection object.
 */
async function connect() {
  // Create database connection
  return new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    endpoint: `${M.config.db.url}:${M.config.db.port}`,
    accessKeyId: M.config.db.accessKeyId,
    secretAccessKey: M.config.db.secretAccessKey,
    region: M.config.db.region,
    sslEnabled: M.config.db.ssl,
    httpOptions: (M.config.db.proxy) ? { proxy: M.config.db.proxy } : undefined
  });
}

/**
 * @description Returns an AWS DocumentClient instance, used for simplifying
 * specific requests to the database. The DocumentClient supports similar
 * functions as the base DynamoDB client, but accepts raw JSON as input rather
 * than JSON formatted specifically for the DynamoDB client. View the
 * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#constructor-property DocumentClient constructor}
 * for more information.
 * @async
 *
 * @returns {Promise<object>} The AWS DynamoDB DocumentClient instance.
 */
async function connectDocument() {
  try {
    // Get a standard DynamoDB connection object
    const conn = await connect();

    // Return an instance of the DocumentClient, using the connection object as a base
    return new AWS.DynamoDB.DocumentClient({
      service: conn
    });
  }
  catch (error) {
    M.log.verbose('Failed to connect to the DocumentClient.');
    throw errors.captureError(error);
  }
}

/**
 * @description Disconnects from the database. This function is not necessary
 * for DynamoDB, but is required for the database abstraction layer.
 * @async
 *
 * @returns {Promise} Resolves every time.
 */
async function disconnect() {
  // Do nothing, not needed for DynamoDB
}

/**
 * @description Deletes all tables, documents and indexes from the database.
 * @async
 *
 * @returns {Promise} Resolves upon completion.
 */
async function clear() {
  try {
    // Create the connection to the database
    const conn = await connect();
    // List all of the tables in the database
    const tables = await conn.listTables({}).promise();

    const promises = [];
    // For each existing table
    tables.TableNames.forEach((table) => {
      // Delete the table
      promises.push(conn.deleteTable({ TableName: table }).promise());
    });

    // Wait for all promises to complete
    await Promise.all(promises);
  }
  catch (error) {
    throw errors.captureError(error);
  }
}

/**
 * @description Sanitizes the data to protect against database injections or
 * unauthorized access to data.
 *
 * @param {*} data - The data to be sanitized.
 *
 * @returns {*} The sanitized data.
 */
function sanitize(data) {
  return data;
}

class Schema {

  /**
   * @description The Schema constructor. Accepts a definition object and
   * options and converts the definition into a DynamoDB friendly schema. Stores
   * hooks, methods, statics and fields that can be populated on the definition.
   *
   * @param {object} definition - The schema definition object. Specifies fields
   * which can be defined on a document, indexes on those fields, validators
   * and other properties on each field.
   * @param {object} options - An object containing schema options.
   */
  constructor(definition, options) {
    // Define the main schema. The _id field is the unique identifier of each
    // document, and therefore is included in the KeySchema
    this.schema = {
      AttributeDefinitions: [{
        AttributeName: '_id',
        AttributeType: 'S'
      }],
      KeySchema: [{
        AttributeName: '_id',
        KeyType: 'HASH'
      }],
      GlobalSecondaryIndexes: []
    };

    // Define the definition, populate object and immutables array
    this.definition = definition;
    this.definition.populate = {};
    this.definition.immutables = [];
    this.add(definition);

    // Define statics and text indexes
    this.definition.statics = [];
    this.definition.text = [];

    // Remove GlobalSecondaryIndex array if empty, meaning there are no additional indexes
    if (this.schema.GlobalSecondaryIndexes.length === 0) {
      delete this.schema.GlobalSecondaryIndexes;
    }
  }

  /**
   * @description Adds an object/schema to the current schema.
   *
   * @param {(object|Schema)} obj - The object or schema to add to the current
   * schema.
   * @param {string} [prefix] - The optional prefix to add to the paths in obj.
   */
  add(obj, prefix) {
    // For each field defined in the object
    Object.keys(obj).forEach((key) => {
      // If the field has not already been added to the definition, add it
      if (!this.definition.hasOwnProperty(key)) {
        this.definition[key] = obj[key];
      }

      // Set the correct DynamoDB type based on the type provided
      switch (obj[key].type) {
        case 'S':
        case 'String': this.definition[key].type = 'S'; break;
        case 'N':
        case 'Number': this.definition[key].type = 'N'; break;
        case 'M':
        case 'Object': this.definition[key].type = 'M'; break;
        case 'Date': this.definition[key].type = 'N'; break;
        case 'BOOL':
        case 'Boolean': this.definition[key].type = 'BOOL'; break;
        // Default type is a string
        default: this.definition[key].type = 'S';
      }

      // If the field has an index defined
      if (obj[key].hasOwnProperty('index') && obj[key].index === true) {
        // Create attribute object
        const attributeObj = {
          AttributeName: key,
          AttributeType: obj[key].type
        };
        // Add the schema AttributeDefinitions
        this.schema.AttributeDefinitions.push(attributeObj);

        // Create index object
        const indexObj = {
          IndexName: `${key}_1`, // Append _1, this is similar to MongoDB
          KeySchema: [
            {
              AttributeName: key,
              KeyType: (obj[key].type === 'S') ? 'HASH' : 'RANGE'
            }
          ],
          Projection: {
            NonKeyAttributes: ['_id'],
            ProjectionType: 'INCLUDE'
          }
        };
        // Add to the schema GlobalSecondaryIndexes
        this.schema.GlobalSecondaryIndexes.push(indexObj);
      }

      // If the field references a document in another model
      if (obj[key].hasOwnProperty('ref')) {
        // Add reference object to the schema populate object
        // References allow for population
        this.definition.populate[key] = {
          ref: obj[key].ref,
          localField: key,
          foreignField: '_id',
          justOne: true
        };
      }

      // If the property is immutable
      if (obj[key].hasOwnProperty('immutable') && obj[key].immutable === true) {
        // Add the the immutables array
        this.definition.immutables.push(key);
      }
    });
  }

  /**
   * @description Registers a plugin for the schema.
   *
   * @param {Function} cb - A callback function to run.
   * @param {object} [options] - A object containing options.
   */
  plugin(cb, options) {
    this.cb = cb;
    // Call the plugin, passing in "this" as the only parameter
    this.cb(this);
    // Remove the plugin from this
    delete this.cb;
  }

  /**
   * @description Defines an index for the schema. Can support adding compound
   * or text indexes.
   *
   * @param {object} fields - An object containing the key/value pairs where the
   * keys are the fields to add indexes to, and the values define the index type
   * where 1 defines an ascending index, -1 a descending index, and 'text'
   * defines a text index.
   * @param {object} [options] - An object containing options.
   */
  index(fields, options) {
    // If every value is text, we have a text index
    if (Object.values(fields).every(v => v === 'text')) {
      // Add keys to the text array, only 1 text index per schema so no worry of duplicate keys
      this.definition.text = Object.keys(fields);
    }
  }

  /**
   * @description Defines a virtual field for the schema.
   *
   * @param {string} name - The name of the field to be added to the document
   * post-find.
   * @param {object} [options] - An object containing options.
   * @param {string} [options.ref] - The name of the model which the virtual
   * references.
   * @param {Function} [options.localField] - The field on the current schema
   * which is being used to match the foreignField.
   * @param {string} [options.foreignField] - The field on the referenced schema
   * which is being used to match the localField.
   * @param {boolean} [options.justOne] - If true, the virtual should only
   * return a single document. If false, the virtual will be an array of
   * documents.
   */
  virtual(name, options) {
    // Add virtual to populate object
    this.definition.populate[name] = options;
    // Remove default, it's not needed
    delete this.definition.populate[name].default;
  }

  /**
   * @description Adds a static method to the schema. This method should later
   * be an accessible static method on the model. For example, Model.myFunc().
   *
   * @param {string} name - The name of the static function.
   * @param {Function} fn - The function to be added to the model.
   */
  static(name, fn) {
    // Add the static function onto the schema statics array
    this.definition.statics.push({ [name]: fn });
  }

}

/** Class for formatting DynamoDB queries. */
class Query {

  /**
   * @description Creates a new instance of the Query class. The Query class has
   * multiple built-in functions for returning queries formatted for DynamoDB.
   *
   * @param {Model} model - The model which is using the queries.
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * @description A helper function formats a key to be used in some
   * object's ExpressionAttributeNames. Returns the formatted key and modifies
   * the object by reference.
   *
   * @param {object} obj - A query object which contains an ExpressionAttributeNames
   * object. This object is modified by reference.
   * @param {string} key - The key to format for the ExpressionAttributeNames
   * object.
   *
   * @returns {string} The formatted key.
   */
  parseExpressionAttributeNames(obj, key) { // eslint-disable-line class-methods-use-this
    // Handle special case where key name starts with an underscore
    let keyName = (key.startsWith('_')) ? key.slice(1) : key;

    // Handle case where the key includes a '.'
    // This would occur if querying a nested object
    if (keyName.includes('.')) {
      const split = keyName.split('.');
      // Handle each piece of the key separately
      split.forEach((s) => {
        const kName = (s.startsWith('_')) ? s.slice(1) : s;
        // Add key to ExpressionAttributeNames
        obj.ExpressionAttributeNames[`#${kName}`] = s;
      });
      keyName = split.join('.#');
    }
    else {
      // Add key to ExpressionAttributeNames
      obj.ExpressionAttributeNames[`#${keyName}`] = key;
    }

    return keyName;
  }

  /**
   * @description Formats a JSON object properly for DynamoDB. Changes all null
   * values to strings. Since DynamoDB's DocumentClient is being used, the rest
   * of the JSON does not need to be modified for use in DynamoDB.
   *
   * @param {object} obj - The JSON object to format.
   *
   * @returns {object} The formatted object, with all null values changed to the
   * string "null".
   */
  formatJSON(obj) {
    // If the value is an object
    if (typeof obj === 'object') {
      // If null, return the string "null" since in DynamoDB you cannot store null in a string field
      if (obj === null) {
        return 'null';
      }
      // If an array or object
      else {
        // Recursively call this function to fix null
        Object.keys(obj).forEach((k) => {
          obj[k] = this.formatJSON(obj[k]);
        });
      }
    }
    return obj;
  }

  /**
   * @description Creates and returns an array of queries, properly formatted to
   * be used in DynamoDB's DocumentClient.batchGet(). Please view the following
   * links for more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDBhtml#batchGetItem-property batchGetItem()}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchGet-property DocumentClient.batchGet()}.
   *
   * @param {object} filter - The filter to parse and form into batchGet
   * queries.
   *
   * @returns {object[]} - An array of properly formatted batchGet() queries.
   */
  batchGet(filter) {
    const base = {};
    const inVals = {};
    const keys = [];
    const queries = [];
    const baseFindQuery = {
      RequestItems: {
        [this.model.TableName]: { Keys: [] }
      }
    };

    // For each key in the query
    Object.keys(filter).forEach((key) => {
      // If the value is an object, and the first key is $in, handle it separately
      if (typeof filter[key] === 'object' && filter[key] !== null
        && Object.keys(filter[key])[0] === '$in') {
        // Convert to Set and back to array to remove any duplicates
        inVals[key] = Array.from(new Set(Object.values(filter[key])[0]));
      }
      else {
        base[key] = this.formatJSON(filter[key]);
      }
    });

    // If no $in exists in the query, return the base query
    if (Object.keys(inVals).length === 0) {
      keys.push(base);
    }
    else {
      // For each in_val
      Object.keys(inVals).forEach((k) => {
        // For each item in the array to search through
        inVals[k].forEach((i) => {
          base[k] = i;

          // Add on query, using JSON parse/stringify
          keys.push(JSON.parse(JSON.stringify(base)));
        });
      });
    }

    // Loop over the number of keys
    for (let i = 0; i < keys.length / 25; i++) {
      // Grab in batches of 25, this is the max number for DynamoDB
      baseFindQuery.RequestItems[this.model.TableName].Keys = keys
      .slice(i * 25, i * 25 + 25);

      // Add query to array, copying the object to avoid modifying
      // the base query by reference
      queries.push(JSON.parse(JSON.stringify(baseFindQuery)));
    }

    return queries;
  }

  /**
   * @description Creates and returns an array of queries, properly formatted to
   * be used in DynamoDB's DocumentClient.batchWrite(). Please view the
   * following links for more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#batchWriteItem-property batchWriteItem()}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#batchWrite-property DocumentClient.batchWrite()}.
   *
   * @param {object[]} docs - An array of documents to be inserted/deleted.
   * @param {string} operation - The operation being preformed, can either be
   * 'insert' or 'delete'; batchWrite() supports both operations but the queries
   * are formatted differently for each.
   *
   * @returns {object[]} - An array of properly formatted batchWrite() queries.
   */
  batchWrite(docs, operation) {
    const queries = [];
    const baseObj = {
      RequestItems: {
        [this.model.TableName]: []
      }
    };

    // Determine if array of PutRequests or DeleteRequests
    const op = (operation === 'insert') ? 'PutRequest' : 'DeleteRequest';

    // Perform in batches of 25, the max number per request
    for (let i = 0; i < docs.length / 25; i++) {
      const batch = docs.slice(i * 25, i * 25 + 25);
      const tmpQuery = JSON.parse(JSON.stringify(baseObj));

      // For each document in the batch of no more than 25
      batch.forEach((doc) => {
        // If performing an insert
        if (op === 'PutRequest') {
          const putObj = {
            PutRequest: {
              Item: {}
            }
          };
          putObj.PutRequest.Item = this.formatJSON(doc);
          tmpQuery.RequestItems[this.model.TableName].push(putObj);
        }
        // If performing a deletion
        else {
          const deleteObj = {
            DeleteRequest: {
              Key: { _id: doc._id }
            }
          };
          tmpQuery.RequestItems[this.model.TableName].push(deleteObj);
        }
      });

      queries.push(tmpQuery);
    }

    return queries;
  }

  /**
   * @description Creates and returns a query, properly formatted to be used
   * in DynamoDB's DocumentClient.get(). Please view the following links for
   * more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#getItem-property getItem()}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#get-property DocumentClient.get()}.
   *
   * @param {object} filter - The query to parse and use in the get() query.
   *
   * @returns {object} - The properly formatted get() query.
   */
  getItem(filter) {
    // Return a query where the Key is the first key/value from the filter
    return {
      TableName: this.model.TableName,
      Key: {
        [Object.keys(filter)[0]]: String(Object.values(filter)[0])
      }
    };
  }

  /**
   * @description Creates and returns a query, properly formatted to be used
   * in DynamoDB's DocumentClient.put(). Please view the following links for
   * more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property putItem()}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#put-property DocumentClient.put()}.
   *
   * @param {object} doc - The document to properly format for a put operation.
   *
   * @returns {object} - The properly formatted put() query.
   */
  put(doc) {
    return {
      TableName: this.model.TableName,
      Item: this.formatJSON(doc)
    };
  }

  /**
   * @description Creates and returns a query, properly formatted to be used
   * in DynamoDB's DocumentClient.scan(). Please view the following links for
   * more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#scan-property scan}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#scan-property DocumentClient.scan()}.
   *
   * @param {object} query - The query to parse and format for use in scan().
   * @param {object} [options={}] - An optional object containing valid options.
   *
   * @returns {object} - The properly formatted scan() query.
   */
  scan(query, options = {}) {
    const findQuery = {
      TableName: this.model.TableName,
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      FilterExpression: ''
    };

    // If the query is not empty
    if (Object.keys(query).length !== 0) {
      // Handle the FilterExpression
      Object.keys(query).forEach((k) => {
        const keyName = this.parseExpressionAttributeNames(findQuery, k);
        const valueKey = (k.includes('.')) ? k.split('.').join('_') : k;
        let filterString = '';

        // Handle the special $in case
        if (typeof query[k] === 'object' && query[k] !== null
          && Object.keys(query[k])[0] === '$in') {
          const arr = Object.values(query[k])[0];

          if (arr.length > 0) {
            // Loop over each item in arr
            for (let i = 0; i < arr.length; i++) {
              // Add value to ExpressionAttributeValues
              findQuery.ExpressionAttributeValues[`:${valueKey}${i}`] = arr[i];

              // If FilterExpression is empty, init it
              if (!findQuery.FilterExpression && !filterString) {
                filterString = `( #${keyName} = :${valueKey}${i}`;
              }
              else if (!filterString) {
                filterString = ` AND ( #${keyName} = :${valueKey}${i}`;
              }
              else {
                filterString += ` OR #${keyName} = :${valueKey}${i}`;
              }
            }

            filterString += ' )';
            findQuery.FilterExpression += filterString;
          }
        }
        // Handle the special $all case
        else if (typeof query[k] === 'object' && query[k] !== null
          && Object.keys(query[k])[0] === '$all') {
          const arr = Object.values(query[k])[0];

          // Loop over each item in arr
          for (let i = 0; i < arr.length; i++) {
            // Add value to ExpressionAttributeValues
            findQuery.ExpressionAttributeValues[`:${valueKey}${i}`] = arr[i];

            // If FilterExpression is empty, init it
            if (!findQuery.FilterExpression && !filterString) {
              filterString = `contains (#${keyName}, :${valueKey}${i})`;
            }
            else {
              filterString += ` AND contains (#${keyName}, :${valueKey}${i})`;
            }
          }

          findQuery.FilterExpression += filterString;
        }
        else {
          findQuery.ExpressionAttributeValues[`:${valueKey}`] = this.formatJSON(query[k]);
          filterString = `#${keyName} = :${valueKey}`;
          // Set the FilterExpression
          findQuery.FilterExpression = (!findQuery.FilterExpression)
            ? filterString
            : `${findQuery.FilterExpression} AND ${filterString}`;
        }
      });

      // If the filterExpression is empty, delete ExpressionAttributeNames
      // ExpressionAttributeValues and FilterExpression. This may happen if
      // using $in with an empty array
      if (!findQuery.FilterExpression) {
        delete findQuery.ExpressionAttributeNames;
        delete findQuery.ExpressionAttributeValues;
        delete findQuery.FilterExpression;
      }
    }
    // Nothing is being filtered on
    else {
      // Delete ExpressionAttributeNames, ExpressionAttributeValues and
      // FilterExpression from the query. These cannot be empty if provided
      delete findQuery.ExpressionAttributeNames;
      delete findQuery.ExpressionAttributeValues;
      delete findQuery.FilterExpression;
    }

    // If the limit option is provided and is greater than 0
    if (options.limit && options.limit > 0) {
      findQuery.Limit = options.limit;
    }

    // If the option LastEvaluatedKey is provided, set it for pagination
    if (options.LastEvaluatedKey) {
      findQuery.LastEvaluatedKey = options.LastEvaluatedKey;
    }

    return findQuery;
  }

  /**
   * @description Creates and returns a query, properly formatted to be used
   * in DynamoDB's DocumentClient.update(). Please view the following links for
   * more information:
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateItem-property updateItem()}
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#update-property DocumentClient.update()}.
   *
   * @param {object} filter - The filter to parse, used to find the document to
   * update.
   * @param {object} doc - An object containing the updates to be made to the
   * found document.
   *
   * @returns {object} - The properly formatted update() query.
   */
  update(filter, doc) {
    // Init the update query
    const updateQuery = {
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      UpdateExpression: '',
      TableName: this.model.TableName,
      ReturnValues: 'ALL_NEW', // Return the entire modified document
      Key: {
        [Object.keys(filter)[0]]: String(Object.values(filter)[0]) // Set the key to filter on
      }
    };

    // If the update document is not empty
    if (Object.keys(doc).length !== 0) {
      const removeKeys = [];
      // Handle the UpdateExpression
      Object.keys(doc).forEach((k) => {
        // Get the properly formatted key/value
        const key = this.parseExpressionAttributeNames(updateQuery, k);
        const value = (k.includes('.')) ? k.split('.').join('_') : k;

        // If the value is not a blank string, update the field
        if (this.formatJSON(doc[k]) !== '') {
          // Perform operation based on the type of parameter being updated
          updateQuery.ExpressionAttributeValues[`:${value}`] = this.formatJSON(doc[k]);

          // If UpdateExpression is not defined yet, define it, else append condition
          updateQuery.UpdateExpression = (!updateQuery.UpdateExpression)
            ? `SET #${key} = :${value}`
            : `${updateQuery.UpdateExpression}, #${key} = :${value}`;
        }
        // If blank string, remove the property from the document. Blank strings
        // are not allowed in the DynamoDB
        else {
          removeKeys.push(`#${key}`);
        }
      });

      // Add remove piece to UpdateExpression
      if (removeKeys.length > 0) {
        // If UpdateExpression is not defined yet, define it, else append condition
        updateQuery.UpdateExpression = (!updateQuery.UpdateExpression)
          ? `REMOVE ${removeKeys.join(', ')}`
          : `${updateQuery.UpdateExpression} REMOVE ${removeKeys.join(', ')}`;
      }
    }
    // No updates are actually being preformed. This should rarely/never happen
    else {
      // Delete ExpressionAttributeNames, ExpressionAttributeValues and
      // UpdateExpression from the query. These cannot be empty if provided
      delete updateQuery.ExpressionAttributeNames;
      delete updateQuery.ExpressionAttributeValues;
      delete updateQuery.UpdateExpression;
    }

    return updateQuery;
  }

}


class Model {

  /**
   * @description Class constructor. Sets class variables, defines indexes and
   * adds the class static methods defined in the Schema onto the Model class.
   *
   * @param {string} name - The name of the model being created. This name is
   * used to create the collection name in the database.
   * @param {Schema} schema - The schema which is being turned into a model.
   * Should be an instance of the Schema class.
   * @param {string} [collection] - Optional name of the collection in the
   * database, if not provided the name should be used instead.
   */
  constructor(name, schema, collection) {
    this.schema = schema.schema;
    this.definition = schema.definition;
    this.TableName = collection || name;
    this.modelName = name;
    // Create a new query object
    this.query = new Query(this);

    // Create a list of indexed fields on the schema, splitting off the _1
    this.indexes = (schema.schema.GlobalSecondaryIndexes) ? schema.schema.GlobalSecondaryIndexes
    .map(i => i.IndexName.substr(0, i.IndexName.length - 2)) : [];
    this.indexes.push('_id');

    // Add on statics
    if (Array.isArray(this.definition.statics)) {
      // For each static defined
      this.definition.statics.forEach((method) => {
        // Add method to the Model class
        this[Object.keys(method)[0]] = Object.values(method)[0]; // eslint-disable-line
      });
    }
  }

  /**
   * @description Creates a table if it does not already exist in the database.
   * If the table does already exist, it is updated with any new indexes. Please
   * see the
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#createTable-property createTable}
   * documentation for more information.
   * @async
   *
   * @returns {Promise} Resolves upon completion.
   */
  async init() {
    // Create connection to the database
    const conn = await connect();
    // Grab all existing tables
    const tables = await this.listTables();
    // If the table does not currently exist
    if (!tables.TableNames.includes(this.TableName)) {
      // Set the TableName and BillingMode
      this.schema.TableName = this.TableName;
      this.schema.BillingMode = M.config.db.billingMode;

      M.log.debug(`DB OPERATION: ${this.TableName} createTable`);
      // Create the actual table
      await conn.createTable(this.schema).promise();
    }

    // Add the model to the file-wide model object
    // This is used later for population
    models[this.modelName] = this;
  }

  /**
   * @description Finds and returns an object containing a list of existing
   * table's names in the database. See the
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#listTables-property listTables}
   * documentation for more information.
   *
   * @returns {Promise<object>} An object containing table names. The single key
   * in the object is TableNames and the value is an array of strings.
   */
  async listTables() {
    try {
      M.log.debug('DB OPERATION: listTables');
      // Connect to the database
      const conn = await connect();
      // Find all tables
      return conn.listTables().promise();
    }
    catch (error) {
      M.log.verbose(`Failed to ${this.modelName}.findTables().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Formats documents to return them in the proper format
   * expected in the controllers.
   * @async
   *
   * @param {object[]} documents -  The documents to properly format.
   * @param {string|null} [projection] - A space separated string containing a
   * list of fields to return (or not return).
   * @param {object} [options={}] - The options supplied to the function.
   *
   * @returns {object[]} - An array of properly formatted documents.
   */
  async formatDocuments(documents, projection, options = {}) {
    // Loop through each document
    const promises = [];
    for (let i = 0; i < documents.length; i++) {
      promises.push(this.formatDocument(documents[i], projection, options)
      .then((doc) => {
        documents[i] = doc;
      }));
    }

    // Wait for all promises to complete
    await Promise.all(promises);

    // If the sort option is provided
    if (options.sort) {
      const order = Object.values(options.sort)[0];
      const key = Object.keys(options.sort)[0];

      // Sort the documents using custom sort function
      documents.sort((a, b) => a[key] > b[key]);

      // If sorting in reverse order, reverse the sorted array
      if (order === -1) {
        documents.reverse();
      }
    }

    // Return modified documents
    return documents;
  }

  /**
   * @description Formats a single document and returns it in the proper format
   * expected in the controllers.
   * @async
   *
   * @param {object} document -  The document to properly format.
   * @param {string|null} [projection] - A space separated string containing a
   * list of fields to return (or not return).
   * @param {object} [options={}] - The options supplied to the function.
   * @param {boolean} [recurse=false] - A boolean value which if true, specifies
   * that this function was called recursively.
   *
   * @returns {object} - The properly formatted document.
   */
  async formatDocument(document, projection, options = {}, recurse = false) {
    const promises = [];
    // For each field in the document
    Object.keys(document).forEach((field) => {
      // If the string null, convert back to null
      if (document[field] === 'null') {
        document[field] = null;
      }
      // If an object, recursively call this function on the object
      else if (typeof document[field] === 'object') {
        promises.push(this.formatDocument(document[field], null, {}, true)
        .then((retDoc) => {
          document[field] = retDoc;
        }));
      }
    });

    // Wait for any recursive portions to complete
    await Promise.all(promises);

    if (!recurse) {
      // Populate any fields specified in the options object
      await this.populate(document, options);
    }

    // If the top level, and not a recursive call of this function
    if (!recurse && !projection) {
      // Loop through all keys in definition
      Object.keys(this.definition).forEach((k) => {
        // If the key is not in the document
        if (!document.hasOwnProperty(k)) {
          // If the key has a default, set it
          if (this.definition[k].hasOwnProperty('default')) {
            document[k] = this.definition[k].default;
          }
        }
      });
    }
    // If a projection is specified
    else if (!recurse && projection) {
      const fields = projection.split(' ');

      // Exclude certain fields from the document
      if (fields.every(s => s.startsWith('-'))) {
        fields.forEach((f) => {
          // Remove leading '-'
          const key = f.slice(1);
          delete document[key];
        });
      }
      // Include only specified fields
      else {
        // Ensure _id is added to fields
        if (!fields.includes('_id')) {
          fields.push('_id');
        }

        // For each field on the document
        Object.keys(document).forEach((f) => {
          // If the field is not desired, delete it
          if (!fields.includes(f)) {
            delete document[f];
          }
        });
      }
    }

    return document;
  }

  /**
   * @description Performs a large write operation on a collection. Can create,
   * update, or delete multiple documents.
   * @async
   *
   * @param {object[]} ops - An array of objects detailing what operations to
   * perform and the data required for those operations.
   * @param {object} [ops.insertOne] - Specifies an insertOne operation.
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
   * @returns {Promise<object>} An object specifying the number of documents
   * inserted (insertedCount), the number updated (modifiedCount), the number
   * deleted (deletedCount) and the result of the operation (result: 1|0).
   */
  async bulkWrite(ops, options) {
    const promises = [];
    let modifiedCount = 0;

    // Connect to the DocumentClient
    const conn = await connectDocument();

    // For each operation in the ops array
    ops.forEach((op) => {
      // If it is an updateOne operation
      if (Object.keys(op)[0] === 'updateOne') {
        // Grab the filter and update object
        const filter = Object.values(op)[0].filter;
        const update = Object.values(op)[0].update;

        // Perform the updateOne operation
        promises.push(this.updateOne(filter, update, options)
        .then(() => {
          modifiedCount += 1;
        }));
      }
      // If it is a replaceOne operation
      else if (Object.keys(op)[0] === 'replaceOne') {
        // Get a properly formatted put query
        const putQuery = this.query.put(Object.values(op)[0].replacement);

        // Perform the put operation
        promises.push(conn.put(putQuery).promise()
        .then(() => {
          modifiedCount += 1;
        }));
      }
    });

    // Wait for promises to complete
    await Promise.all(promises);

    return { modifiedCount: modifiedCount, result: 1 };
  }

  /**
   * @description Counts the number of documents that match a filter.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   *
   * @returns {Promise<number>} The number of documents which matched the
   * filter.
   */
  async countDocuments(filter) {
    try {
      // Get a formatted scan query
      const scanObj = this.query.scan(filter);

      // Tell the query to only return the count
      scanObj.Select = 'COUNT';

      // Connect to the database
      const conn = await connectDocument();

      // Perform the scan query and return the count
      M.log.debug(`DB OPERATION: ${this.TableName} countDocuments`);
      const data = await conn.scan(scanObj).promise();
      return data.Count;
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.countDocuments().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Deletes the specified index from the database.
   * @async
   *
   * @param {string} name - The name of the index.
   */
  async deleteIndex(name) {
    try {
      // Connect to the database
      const conn = await connect();

      // Get the table information
      const tableInfo = await conn.describeTable({ TableName: this.TableName }).promise();

      // Get an array of active index names
      const indexNames = (tableInfo.Table.GlobalSecondaryIndexes)
        ? tableInfo.Table.GlobalSecondaryIndexes.map(i => i.IndexName)
        : [];

      // If the index exists
      if (indexNames.includes(name)) {
        // Create update object
        const updateObj = {
          TableName: this.TableName,
          GlobalSecondaryIndexUpdates: [{
            Delete: {
              IndexName: name
            }
          }]
        };

        // Update the table and delete the index
        const result = await conn.updateTable(updateObj).promise();

        // If the result does not show the index is deleting, throw an error
        const deletedIndex = result.TableDescription.GlobalSecondaryIndexes
        .filter(f => f.IndexName === name)[0];
        if (deletedIndex.IndexStatus !== 'DELETING') {
          throw new M.DatabaseError(`Index ${name} was NOT successfully deleted.`);
        }
      }
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.deleteIndex().`);
      throw errors.captureError(error);
    }
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
   * operation.
   */
  async deleteMany(filter, options) {
    try {
      let docs = [];
      let more = true;
      // Connect to the DocumentClient
      const conn = await connectDocument();

      // Find all documents which match the provided filter
      while (more) {
        // Get the formatted scan query
        const scanObj = this.query.scan(filter, options);

        // If there is no filter, block from finding all documents to delete
        if (!scanObj.hasOwnProperty('FilterExpression') && Object.keys(filter).length !== 0) {
          more = false;
        }
        else {
          M.log.debug(`DB OPERATION: ${this.TableName} scan`);
          // Find the documents
          const result = await conn.scan(scanObj).promise(); // eslint-disable-line no-await-in-loop
          docs = docs.concat(result.Items);

          // If there are no more documents to find, exit loop
          if (!result.LastEvaluatedKey) {
            more = false;
          }
          else {
            // Set LastEvaluatedKey, used to paginate
            options.LastEvaluatedKey = result.LastEvaluatedKey;
          }
        }
      }

      // Format the documents
      docs = await this.formatDocuments(docs, null, options);

      // Get the formatted batchWrite query, used for deletion
      const deleteQueries = this.query.batchWrite(docs, 'delete');

      const promises = [];

      // For each delete query
      deleteQueries.forEach((q) => {
        // Perform the batchWrite operation
        promises.push(conn.batchWrite(q, options).promise());
      });

      // Wait for all batchWrite operations to complete
      await Promise.all(promises);

      // Return an object specifying the success of the delete operation
      return { n: docs.length, ok: 1 };
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.deleteMany().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Finds multiple documents based on the filter provided.
   * @async
   *
   * @param {object} filter - An object containing parameters to filter the
   * find query by.
   * @param {(object|string)} [projection] - Specifies the fields to return in
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
   * @param {boolean} [options.lean] - If false (by default), every document
   * returned will contain methods that were declared in the Schema. If true,
   * just the raw JSON will be returned from the database.
   *
   * @returns {Promise<object[]>} An array containing the found documents, if
   * any. Defaults to an empty array if no documents are found.
   */
  async find(filter, projection, options) {
    try {
      // If $text in query, performing a text search
      if (Object.keys(filter).includes('$text')) {
        return await this.textSearch(filter, projection, options);
      }

      let docs = [];
      let limit;
      let skip;
      if (options) {
        limit = options.limit;
        skip = options.skip;
        delete options.limit;
        delete options.skip;
      }
      else {
        options = {}; // eslint-disable-line no-param-reassign
      }

      // Connect to the DocumentClient
      const conn = await connectDocument();

      // Use batchGet iff the only parameter being searched is the _id
      if (Object.keys(filter).length === 1 && Object.keys(filter)[0] === '_id') {
        // Get an array of properly formatted batchGet queries
        const queriesToMake = this.query.batchGet(filter);

        const promises = [];
        // For each query
        queriesToMake.forEach((q) => {
          // Log the database operation
          M.log.debug(`DB OPERATION: ${this.TableName} batchGet`);
          // Append operation to promises array
          promises.push(
            // Make the batchGet request
            conn.batchGet(q).promise()
            .then((found) => {
              // Append the found documents to the function-global array
              docs = docs.concat(found.Responses[this.TableName]);
            })
          );
        });

        // Wait for completion of all promises
        await Promise.all(promises);
      }
      else {
        let more = true;

        // Find all documents which match the query
        while (more) {
          // Get the formatted scan query
          const scanObj = this.query.scan(filter, options);

          M.log.debug(`DB OPERATION: ${this.TableName} scan`);
          // Find the documents
          const result = await conn.scan(scanObj).promise(); // eslint-disable-line

          // Append found documents to the running array
          docs = docs.concat(result.Items);

          // If the skip and/or limit options are provided
          if (limit || skip) {
            // If only the skip option is provided
            if (skip && !limit) {
              // If all of the documents have been found
              if (!result.LastEvaluatedKey) {
                // Remove the first documents, equal to number of options.skip
                docs = docs.slice(skip);
                more = false;
              }
            }
            // If only the limit option is provided
            else if (limit && !skip) {
              // If the correct number or all documents found
              if (docs.length >= limit || !result.LastEvaluatedKey) {
                docs = docs.slice(0, limit);
                more = false;
              }
            }
            // Both the limit and skip options provided
            else if (skip + limit <= docs.length || !result.LastEvaluatedKey) {
              docs = docs.slice(skip).slice(0, limit);
              more = false;
            }
          }
          // If there are no more documents to find, exit loop
          else if (!result.LastEvaluatedKey) {
            more = false;
          }

          // Set LastEvaluatedKey, used to paginate
          options.LastEvaluatedKey = result.LastEvaluatedKey;
        }
      }

      // Format and return the documents
      return await this.formatDocuments(docs, projection, options);
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.find().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Finds a single document based on the filter provided.
   * @async
   *
   * @param {object} conditions - An object containing parameters to filter the
   * find query by.
   * @param {(object|string)} [projection] - Specifies the fields to return in
   * the document that matches the filter. To return all fields, omit this
   * parameter.
   * @param {object} [options] - An object containing options.
   * @param {string} [options.populate] - A space separated list of fields to
   * populate on return of a document. Only fields that reference other
   * documents can be populated. Populating a field returns the entire
   * referenced document instead of that document's ID. If no document exists,
   * null is returned.
   * @param {boolean} [options.lean] - If false (by default), every document
   * returned will contain methods that were declared in the Schema. If true,
   * just the raw JSON will be returned from the database.
   *
   * @returns {Promise<object|null>} The found document, if any. Returns null if
   * no document is found.
   */
  async findOne(conditions, projection, options) {
    try {
      let allIndexed = true;
      let doc;
      // Loop through each field in the conditions object
      Object.keys(conditions).forEach((key) => {
        // If the field is not indexed, set allIndexed to false
        if ((!this.definition[key].hasOwnProperty('index')
          || this.definition[key].index === false)
          && key !== '_id') {
          allIndexed = false;
        }
      });

      // Connect to the DocumentClient
      const conn = await connectDocument();

      // If all fields are indexed, use getItem as it will be significantly faster
      if (allIndexed) {
        // Get a formatted getItem query
        const getObj = this.query.getItem(conditions);

        // Make the getItem request
        M.log.debug(`DB OPERATION: ${this.TableName} getItem`);
        const result = await conn.get(getObj).promise();

        // If document was found, set it
        if (Object.keys(result).length !== 0) {
          doc = result.Item;
        }
      }
      // Not all fields have indexes, use scan to find the document
      else {
        // Get the formatted scan query
        const scanObj = this.query.scan(conditions, options);

        // Make the scan request
        M.log.debug(`DB OPERATION: ${this.TableName} scan`);
        const result = await conn.scan(scanObj).promise();

        // If there were documents found, return the first one
        if (Array.isArray(result.Items) && result.Items.length !== 0) {
          doc = this.formatDocument(result.Items[0], projection, options);
        }
      }

      // Return the formatted document or null
      return (doc) ? this.formatDocument(doc, projection, options) : null;
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.findOne().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Returns an array of indexes for the given model. See the
   * {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#deleteTable-property describeTable}
   * documentation for more information.
   * @async
   *
   * @returns {Promise<object[]>} Array of index objects.
   */
  async getIndexes() {
    try {
      // Connect to the database
      const conn = await connect();

      // Get the table information, which includes indexes
      M.log.debug(`DB OPERATION: ${this.TableName} describeTable`);
      const table = await conn.describeTable({ TableName: this.TableName }).promise();
      // Return the index info
      return table.Table.KeySchema;
    }
    catch (error) {
      M.log.error(`Failed in ${this.modelName}.getIndexes().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Inserts any number of documents into the database.
   * @async
   *
   * @param {object[]} docs - An array of documents to insert.
   * @param {object} [options] - An object containing options.
   * @param {boolean} [options.lean] - If false (by default), every document
   * returned will contain methods that were declared in the Schema. If true,
   * just the raw JSON will be returned from the database.
   * @param {boolean} [options.skipValidation] - If true, will not validate
   * the documents which are being created.
   *
   * @returns {Promise<object[]>} The created documents.
   */
  async insertMany(docs, options) {
    try {
      // Use JSON parse/stringify to copy data to avoid modifying by reference
      docs = JSON.parse(JSON.stringify(docs)); // eslint-disable-line no-param-reassign

      // If only a single document, add to array
      if (!Array.isArray(docs)) {
        docs = [docs]; // eslint-disable-line no-param-reassign
      }
      // Format and validate documents
      const formattedDocs = docs.map(d => this.validate(d));

      // Create a query, searching for existing documents by _id
      const findQuery = { _id: { $in: docs.map(d => d._id) } };
      // Attempt to find any existing documents
      const conflictingDocs = await this.find(findQuery, null, options);

      // If documents with matching _ids exist, throw an error
      if (conflictingDocs.length > 0) {
        throw new M.PermissionError('Documents with the following _ids already'
          + ` exist: ${conflictingDocs.map(d => utils.parseID(d._id).pop())}.`, 'warn');
      }
      else {
        const promises = [];

        // Connect to the DocumentClient
        const conn = await connectDocument();

        // Get the formatted batchWrite queries
        const batchWriteQueries = this.query.batchWrite(formattedDocs, 'insert');

        // For each query
        batchWriteQueries.forEach((q) => {
          // Perform the batchWrite operation
          promises.push(conn.batchWrite(q).promise());
        });

        // Wait for batchWrite operations to complete
        await Promise.all(promises);
      }

      // Find and return the newly created documents
      return await this.find(findQuery, null, options);
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.insertMany().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Populates a single document with specified fields provided in
   * the options object.
   * @async
   *
   * @param {object} doc - The document to populate.
   * @param {object} options - The object containing the options.
   * @param {string} [options.populate] - A string of fields to populate,
   * separated by spaces.
   *
   * @returns {Promise<object>} The document, populated with the fields
   * specified in options.populate.
   */
  async populate(doc, options) {
    // If there are fields to populate
    if (options.populate) {
      // Get an array of the fields to populate
      const fieldsToPop = options.populate.split(' ');

      const promises = [];
      fieldsToPop.forEach((f) => {
        // Get the populate object, defined in the schema definition
        const popObj = this.definition.populate[f];

        // If the field to populate is defined
        if (popObj) {
          // Create the find query
          const query = {};
          query[popObj.foreignField] = doc[popObj.localField];

          // If justOne is true, use findOne
          if (popObj.justOne) {
            promises.push(models[popObj.ref].findOne(query, null, {})
            .then((objs) => { doc[f] = objs; }));
          }
          // findOne is false, find an array of matching documents
          else {
            promises.push(models[popObj.ref].find(query, null, {})
            .then((objs) => { doc[f] = objs; }));
          }
        }
      });

      // Wait for all promises to complete
      await Promise.all(promises);
    }
    return doc;
  }

  /**
   * @description Preforms a text search of fields which have a text index.
   * Please note that this function is very inefficient. Because of a lack of
   * support for text based search in DynamoDB, this function must use scan()
   * to find all documents, and perform parsing via regex post-find.
   *
   * @param {object} filter - The query to filter on.
   * @param {string} projection - A space delimited string containing the fields
   * to return or not return.
   * @param {object} options - An object containing valid options.
   *
   * @returns {Promise<object[]>} An array containing the found documents, if
   * any. Defaults to an empty array if no documents are found.
   */
  async textSearch(filter, projection, options) {
    try {
      // Get the text search and remove it from the filter
      const searchString = filter.$text;
      delete filter.$text;

      // Handle case where there is no query
      if (!searchString) {
        return [];
      }

      // Set the skip and limit options
      const skip = options.skip || 0;
      const limit = options.limit;
      delete options.skip;
      delete options.limit;

      // If double quotes are found, it's an exact match
      const exactMatch = searchString.includes('"');

      // Get an array of the base words to search;
      const baseWords = (exactMatch)
        ? searchString.replace(/"/g, '') // if "" included, it's an exact match
        : searchString.split(' ');  // Split string by space, these are all the words to search
      const regexString = (exactMatch)
        ? RegExp(`(${baseWords})`)
        : RegExp(`(${baseWords.join('|')})`, 'i');

      let matchingDocs = [];

      let more = true;

      // Connect to the DocumentClient
      const conn = await connectDocument();

      // Find all documents which match the query
      while (more) {
        // Get the formatted scan query
        const scanObj = this.query.scan(filter, options);

        M.log.debug(`DB OPERATION: ${this.TableName} scan`);
        // Find the documents
        const result = await conn.scan(scanObj).promise(); // eslint-disable-line
        const docs = result.Items;

        // For each document found
        docs.forEach((d) => { // eslint-disable-line no-loop-func
          let matched = false;
          // For each field in the text index
          this.definition.text.forEach((f) => {
            // If the field matches, set matched to true
            if (regexString.test(d[f])) matched = true;
          });
          // If matched is true, add the doc to the matchingDocs array
          if (matched) matchingDocs.push(d);
        });

        // If there are no more documents to find, exit loop
        if (!result.LastEvaluatedKey) {
          more = false;
        }

        // Set LastEvaluatedKey, used to paginate
        options.LastEvaluatedKey = result.LastEvaluatedKey;
      }

      // Count the number of matches in each document
      const matches = {};
      matchingDocs.forEach((d) => {
        matches[d._id] = 0;
        // For each field in the text index, add the number of matches
        this.definition.text.forEach((f) => {
          // If the field is defined
          if (d[f]) {
            const numMatches = d[f].match(regexString); // null if no matches
            if (numMatches) matches[d._id] += numMatches.length;
          }
        });
      });

      // Sort the matching documents
      matchingDocs.sort((a, b) => matches[a._id] < matches[b._id]);

      // Handle the limit and skip options
      if (limit || skip) {
        // Skip the specified number of documents
        matchingDocs = matchingDocs.slice(skip);

        // Limit the specified number of documents
        matchingDocs = matchingDocs.slice(0, limit);
      }

      // Format and return the documents
      return await this.formatDocuments(matchingDocs, projection, options);
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.textSearch().`);
      throw errors.captureError(error);
    }
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
   * @returns {object} Query containing information about the number of
   * documents which matched the filter (n) and the number of documents which
   * were modified (nModified).
   */
  async updateMany(filter, doc, options) {
    try {
      // Find each document which matches the filter
      const docs = await this.find(filter, null, options);

      const promises = [];
      // For each document found
      docs.forEach((d) => {
        // Create a query for find one, which should find a single document
        const q = { _id: d._id };
        // Update the document with the specified changes
        promises.push(this.updateOne(q, doc));
      });

      // Wait for all promises to complete
      await Promise.all(promises);

      // Return a query with update info
      return { n: docs.length, nModified: docs.length };
    }
    catch (error) {
      throw errors.captureError(error);
    }
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
   * @returns {Promise<object>} The updated document.
   */
  async updateOne(filter, doc, options) {
    try {
      // Ensure there are no immutable fields in the update
      Object.keys(doc).forEach((k) => {
        if (this.definition.immutables.includes(k)) {
          throw new M.OperationError(`${this.modelName} validation failed: `
            + `${k}: Path \`${k}\` is immutable and cannot be modified.`);
        }
      });

      // Get the properly formatted updateItem query
      const updateObj = this.query.update(filter, doc);

      // Connect to the database
      const conn = await connectDocument();

      M.log.debug(`DB OPERATION: ${this.TableName} updateItem`);
      // Update the single item
      const updatedItem = await conn.update(updateObj).promise();
      // Return the properly formatted, newly updated document
      return await this.formatDocument(updatedItem.Attributes, null, options);
    }
    catch (error) {
      M.log.verbose(`Failed in ${this.modelName}.updateOne().`);
      throw errors.captureError(error);
    }
  }

  /**
   * @description Validates a document which is to be inserted into the
   * database. Sets any default fields which are not provided in the original
   * document.
   *
   * @param {object} doc - The document to be inserted into the database.
   *
   * @returns {object} The validated document, with default values set if they
   * were not specified in the original document.
   */
  validate(doc) {
    const keys = Object.keys(doc);

    // Loop over each valid parameter in the definition
    Object.keys(this.definition).forEach((param) => {
      // If a default exists and the value isn't set, and no specific fields are provided
      if (this.definition[param].hasOwnProperty('default') && !keys.includes(param)) {
        // If the default is a function, call it
        if (typeof this.definition[param].default === 'function') {
          doc[param] = this.definition[param].default();
        }
        else if (this.definition[param].default === '') {
          // Do nothing, empty strings cannot be saved in DynamoDB
        }
        else {
          // Set the value equal to the default
          doc[param] = this.definition[param].default;
        }
      }

      // Parameter was defined on the document
      if (keys.includes(param)) {
        // Validate type
        let shouldBeType;
        switch (this.definition[param].type) {
          case 'S':
            shouldBeType = 'string'; break;
          case 'N':
            shouldBeType = 'number'; break;
          case 'M':
            shouldBeType = 'object'; break;
          case 'BOOL':
            shouldBeType = 'boolean'; break;
          default:
            throw new M.DataFormatError(`Invalid DynamoDB type: ${this.definition[param].type}`);
        }

        // If validators are defined on the field
        if (this.definition[param].hasOwnProperty('validate')) {
          // For each validator defined
          this.definition[param].validate.forEach((v) => {
            // Call the validator, binding the document to "this"
            if (!v.validator.call(doc, doc[param])) {
              // If the validator fails, throw an error
              throw new M.DataFormatError(`${this.modelName} validation failed: `
                + `${param}: ${v.message({ value: doc[param] })}`);
            }
          });
        }

        // If not the correct type, throw an error
        if (typeof doc[param] !== shouldBeType // eslint-disable-line valid-typeof
          && !(shouldBeType !== 'object' && doc[param] === null)) {
          throw new M.DataFormatError(`${this.modelName} validation failed: `
            + `${param}: Cast to ${utils.toTitleCase(shouldBeType)} failed `
            + `for value "${JSON.stringify(doc[param])}" at path "${param}"`);
        }

        // If an array of enums exists, and the value is not in it, throw an error
        if (this.definition[param].hasOwnProperty('enum')
          && !this.definition[param].enum.includes(doc[param])) {
          throw new M.DataFormatError(`${this.modelName} validation failed: `
            + `${param}: \`${doc[param]}\` is not a valid enum value for path`
            + ` \`${param}\`.`);
        }
      }
      // If the parameter is required and no default is provided, throw an error
      else if (this.definition[param].required
        && !this.definition[param].hasOwnProperty('default')) {
        let message = `Path \`${param}\` is required.`;
        // If required is an array, grab the error message (second entry)
        if (Array.isArray(this.definition[param].required)
          && this.definition[param].required.length === 2) {
          message = this.definition[param].required[1];
        }
        throw new M.DataFormatError(`${this.modelName} validation failed: `
          + `${param}: ${message}`);
      }
    });

    // Convert any instances of null to the string "null" after validators run to avoid conflicts
    Object.keys(this.definition).forEach((param) => {
      // Handle special case where the field should be a string, and defaults to null
      if (this.definition[param].hasOwnProperty('default')
        && this.definition[param].default === null && doc[param] === null) {
        doc[param] = 'null';
      }

      // If value is a blank string, delete key; blank strings are not allowed in DynamoDB
      if (doc[param] === '') delete doc[param];
    });

    return doc;
  }

}

class Store extends DynamoDBStore {

  /**
   * @description Creates the DynamoDB store object and calls the parent
   * constructor with the store object.
   *
   * @param {object} [options] - An object containing options.
   */
  constructor(options) {
    const obj = {
      dynamoConfig: {
        endpoint: `${M.config.db.url}:${M.config.db.port}`,
        accessKeyId: M.config.db.accessKeyId,
        secretAccessKey: M.config.db.secretAccessKey,
        region: M.config.db.region,
        sslEnabled: M.config.db.ssl,
        httpOptions: (M.config.db.proxy) ? { proxy: M.config.db.proxy } : undefined
      },
      ttl: utils.timeConversions[M.config.auth.session.units] * M.config.auth.session.expires
    };

    // Call parent constructor
    super(obj);
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
