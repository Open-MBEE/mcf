/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.migrations.1.0.3
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Migration script for version 1.0.3.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// MBEE modules
const Webhook = M.require('models.webhook');

/**
 * @description Handles the database migration from 1.0.2 to 1.0.3.
 */
module.exports.up = async function() {
  await webhookHelper();
};

/**
 * @description Helper function for 1.0.2 to 1.0.3 migration. Handles all
 * updates to the webhook collection.
 * @async
 *
 * @returns {Promise} Returns an empty promise upon completion.
 */
async function webhookHelper() {
  const numWebhooks = await Webhook.countDocuments({});

  if (numWebhooks > 0) {
    // Create data directory if it does not exist
    if (!fs.existsSync(path.join(M.root, 'data'))) {
      fs.mkdirSync(path.join(M.root, 'data'));
    }

    const batchLimit = 5000;
    let batchSkip = 0;

    // Process batch of 5000 webhooks
    for (let i = 0; i < numWebhooks / batchLimit; i++) {
      batchSkip = i * 5000;

      // eslint-disable-next-line no-await-in-loop
      const webhooks = await Webhook.find({}, null, { skip: batchSkip, limit: batchLimit });

      // Save all webhooks to a JSON file in the data directory
      fs.writeFileSync(path.join(M.root, 'data', `webhooks-103-${i}.json`), JSON.stringify(webhooks));

      const bulkWrite = [];
      // Add url field to all outgoing webhooks and remove the response field.
      // If the response field had a token, add it to the token field.
      webhooks.forEach((webhook) => {
        if (webhook.type === 'Outgoing' && webhook.hasOwnProperty('response')) {
          webhook.url = webhook.response.url;
          if (webhook.response.hasOwnProperty('token')) webhook.token = webhook.response.token;
          delete webhook.response;
          bulkWrite.push({
            replaceOne: {
              filter: { _id: webhook._id },
              replacement: webhook
            }
          });
        }
      });

      // Update all webhooks
      await Webhook.bulkWrite(bulkWrite); // eslint-disable-line no-await-in-loop

      // If the backup file exists, remove it
      if (fs.existsSync(path.join(M.root, 'data', `webhooks-103-${i}.json`))) {
        fs.unlinkSync(path.join(M.root, 'data', `webhooks-103-${i}.json`));
      }
    }
  }
}
