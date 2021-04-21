/**
 * @classification UNCLASSIFIED
 *
 * @module controllers.ui-controller
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 * @author Josh Kaplan
 * @author Jake Ursetta
 *
 * @description This implements the behavior and logic for the user interface.
 * All UI routes map to this controller which in turn uses other controllers to
 * handle other object behaviors.
 */

// Expose UI controller functions
// Note: The export is being done before the import to solve the issues of
// circular references between controllers.
module.exports = {
  flightManual,
  swaggerDoc,
  notFound
};

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const swaggerJSDoc = require('swagger-jsdoc');

// MBEE modules
const utils = M.require('lib.utils');

/**
 * @description Renders the flight manual.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 */
function flightManual(req, res) {
  // Read the flight manual sections from the doc directory
  fs.readdir(`${M.root}/build/fm`, (err, files) => {
    if (err) {
      M.log.error(err);
      return res.status(500).send('Internal Server Error.');
    }

    // Turn the file names into section IDs and titles
    const sections = [];
    files.filter(fname => fname.endsWith('.html')).forEach(section => {
      const sectionID = section.replace('.html', '');
      const sectionTitle = sectionID.replace(/-/g, ' ');
      sections.push({
        id: sectionID.replace(/\./g, '-').replace(':', ''),
        title: utils.toTitleCase(sectionTitle, true),
        content: fs.readFileSync(`${M.root}/build/fm/${section}`)
      });
    });
    // Render the flight manual
    return utils.render(req, res, 'flight-manual', {
      sections: sections
    });
  });
}

/**
 * @description Generates the Swagger specification based on the Swagger JSDoc
 * in the API routes file.
 *
 * @returns {Function} The swaggerJSDoc function.
 */
function swaggerSpec() {
  return swaggerJSDoc({
    swaggerDefinition: {
      info: {
        title: 'MBEE API Documentation',       // Title (required)
        version: M.version                     // Version (required)
      }
    },
    apis: [
      path.join(M.root, 'app', 'api-routes.js') // Path to the API docs
    ]
  });
}

/**
 * @description Renders the swagger doc.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function swaggerDoc(req, res) {
  return utils.render(req, res, 'swagger', {
    swagger: swaggerSpec(),
    title: 'API Documentation | Model-Based Engineering Environment'
  });
}

/**
 * @description This is  for pages that were not found.
 *
 * @param {object} req - Request express object.
 * @param {object} res - Response express object.
 *
 * @returns {Function} The response express object's render function.
 */
function notFound(req, res) {
  // render the 404 not found page
  return utils.render(req, res, '404');
}
