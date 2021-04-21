/* eslint-disable jsdoc/require-description-complete-sentence */
// Disabled to allow html in description
/**
 * @classification UNCLASSIFIED
 *
 * @module models.webhook
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description
 * <p>This module defines the webhook model. Webhooks can be used for a wide range of purposes
 * that fall under the category of automating responses to specific events. Webhook documents store
 * triggers and a response for asynchronous events and api calls within the server. For example, an
 * outgoing webhook may be triggered by a project creation event, and notify the admins of that
 * organization through an HTTP request stored in the webhook's response field. Conversely,
 * an incoming webhook may be triggered by a request to the api endpoint
 * /api/webhooks/trigger/:encodedid. The triggered webhook will then emit the events stored in its
 * triggers field with the data contained in the request body.</p>
 *
 * <h4>Type</h4>
 * <p>The type of the webhook specifies outgoing or incoming.  An outgoing webhook will only react
 * to events that originate from within the server, while an incoming webhook will only react to
 * external requests to a specific api endpoint tied to the base 64 encoding of its _id.</p>
 *
 * <h4>Triggers</h4>
 * <p>The triggers field is an array of strings that refer to specific events that can trigger an
 * outgoing webhook or the events an incoming webhook will emit.</p>
 *
 * <h4>Url</h4>
 * <p>The response field is an object that contains fields required to send a request: url, method,
 * headers, token, ca, and data. Only outgoing webhooks have a response field. The url is the
 * only required field, while the method defaults to POST and the headers to
 * {'Content-Type': 'application/json'}. The token field allows for extra security with token
 * verification by external recipients of the request, and the ca field allows space for a
 * certificate authority. The data field allows the user to specify custom data that gets sent
 * with every request.</p>
 *
 * <h4>Token</h4>
 * <p>The token is a string used to verify permissions for external HTTP requests to trigger a
 * webhook. External requests must contain a matching token in order to trigger the webhook.</p>
 *
 * <h4>TokenLocation</h4>
 * <p>The tokenLocation is a dot-delimited string used to find the token in the request object
 * sent to trigger a webhook. For example, a tokenLocation of "body.secret_token" would look for
 * a secret_token field in the body of the request.</p>
 *
 * <h4>Reference</h4>
 * <p>A webhook can be registered at one of four levels: server, org, project, and branch.  A
 * server-level webhook can listen for server-wide events, such as user creation, while the scope
 * gets progressively narrower at the org, project, and branch level. The server level is
 * represented by an empty string, while the other levels are represented by their _ids.</p>
 *
 * <h4>Custom Data</h4>
 * <p>Custom data is designed to store any arbitrary JSON meta-data. Custom data is stored in an
 * object, and can contain any valid JSON the user desires. Only users with admin permissions
 * at the respective level of the webhook can update the webhook's custom data. The field
 * "custom" is common to all models, and is added through the extensions plugin.</p>
 */

// NPM modules
const axios = require('axios');

// MBEE modules
const db = M.require('db');
const validators = M.require('lib.validators');
const extensions = M.require('models.plugin.extensions');

/* ---------------------------( Webhook Schemas )---------------------------- */

/**
 * @namespace
 *
 * @description Defines the Webhook Schema
 *
 * @property {string} _id - The webhook's unique ID. Webhook IDs are different from the rest
 * of the models in that they are intended to be UUIDs. Users are not permitted to chose a
 * webhook id through normal channels; the Webhook Controller generates a new random UUID
 * every time a webhook is created.
 * @property {string} name - The webhook's name.
 * @property {string} type - The webhook's type, either incoming or outgoing.
 * @property {string} description - An optional field to provide a description for the webhook.
 * @property {string[]} triggers - The events that trigger the webhook or that the webhook emits.
 * @property {string} url - The url to send a request to.
 * @property {string} token - The token to validate incoming requests against.
 * @property {string} tokenLocation - The location of the token in the external request.
 * @property {string} reference - The _id of the org, project, or branch the webhook is registered
 * to. An empty string denotes a server-level webhook.
 */
const WebhookSchema = new db.Schema({
  _id: {
    type: 'String',
    required: true
  },
  name: {
    type: 'String'
  },
  type: {
    type: 'String',
    required: true,
    enum: ['Outgoing', 'Incoming'],
    immutable: true,
    validate: [{
      validator: validators.webhook.type.outgoing,
      message: props => 'An outgoing webhook must have a url field and '
        + 'cannot have a tokenLocation.'
    },
    {
      validator: validators.webhook.type.incoming,
      message: props => 'An incoming webhook must have a token and a '
        + 'tokenLocation and cannot have a url field.'
    }]
  },
  description: {
    type: 'String'
  },
  triggers: {
    type: 'Object',
    required: true,
    validate: [{
      validator: validators.webhook.triggers,
      message: props => 'The triggers field must be an array of strings.'
    }]
  },
  url: {
    type: 'String',
    validate: [{
      validator: validators.webhook.url,
      message: props => 'The url field must be a string.'
    }]
  },
  token: {
    type: 'String',
    validate: [{
      validator: validators.webhook.token,
      message: props => 'A token must be a string.'
    }]
  },
  tokenLocation: {
    type: 'String',
    validate: [{
      validator: validators.webhook.tokenLocation,
      message: props => 'A tokenLocation must be a string.'
    }]
  },
  reference: {
    type: 'String',
    immutabe: true,
    validate: [{
      validator: validators.webhook.reference,
      message: props => `Invalid reference id ${props.value}: reference must `
        + 'either be an empty string or match an org, project, or branch id.'
    }],
    default: ''
  }
});


/* ----------------------------( Model Plugin )------------------------------ */

// Use extensions model plugin;
WebhookSchema.plugin(extensions);


/* ----------------------------( Webhook Methods )-----------------------------*/

/**
 * @description Send the requests stored in the webhook.
 * @memberOf WebhookSchema
 */
WebhookSchema.static('sendRequest', async function(webhook, data) {
  const options = {
    url: webhook.url,
    headers: { 'Content-Type': 'application/json' },
    method: webhook.method || 'post',
    data: data || undefined
  };

  if (options.data) options.json = true;
  if (webhook.token) options.token = webhook.token;
  try {
    await axios(options);
  }
  catch (err) {
    M.log.warn(`Webhook ${webhook._id} request error: ${err.message}`);
  }
});

/**
 * @description Validates the token sent for an incoming webhook.
 * @memberOf WebhookSchema
 */
WebhookSchema.static('verifyAuthority', function(webhook, value) {
  if (!(webhook.type === 'Incoming' && webhook.token === value)) {
    throw new M.AuthorizationError('Token received from request does not match stored token.', 'warn');
  }
});

/**
 * @description Returns webhook fields that can be changed
 * @memberOf WebhookSchema
 */
WebhookSchema.static('getValidUpdateFields', function() {
  return ['name', 'description', 'triggers', 'url', 'token', 'tokenLocation',
    'archived', 'custom'];
});

/**
 * @description Returns a list of fields a requesting user can populate
 * @memberOf WebhookSchema
 */
WebhookSchema.static('getValidPopulateFields', function() {
  return ['archivedBy', 'lastModifiedBy', 'createdBy'];
});


/* ------------------------( Webhook Schema Export )------------------------- */

module.exports = new db.Model('Webhook', WebhookSchema, 'webhooks');
