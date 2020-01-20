/**
 * @classification UNCLASSIFIED
 *
 * @module test.700-setup
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This file creates a fake virtual DOM
 * and configures the enzyme adaptor for UI testing.
 */

// Node modules
const fs = require('fs');
const path = require('path');

// NPM modules
const { JSDOM } = require('jsdom');
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
const jquery = fs.readFileSync(path.join(M.root, 'node_modules', 'jquery', 'dist', 'jquery.min.js'), { encoding: 'utf-8' });
const jqueryUI = fs.readFileSync(path.join(M.root, 'node_modules', 'jquery-ui-dist', 'jquery-ui.min.js'), { encoding: 'utf-8' });

// MBEE modules
const mbee = fs.readFileSync(path.join(M.root, 'app', 'ui', 'js', 'mbee.js'), { encoding: 'utf-8' });
const url = M.config.test.url;

// Simulate window if we're running in Node.js
if (!global.window && !global.document) {
  // Initialize JSDOM
  const options = {
    pretendToBeVisual: false,
    url: url,
    resources: 'usable',
    runScripts: 'dangerously',
    userAgent: 'mocha'
  };
  const html = '<!doctype html>'
    + '<html lang="en">'
    + '<head>'
    + '  <meta charset="utf-8">'
    + '  <title></title>'
    + '</head>'
    + '<body>'
    + '  <div id="main"></div>'
    + '</body>'
    + '</html>';
  const jsdom = new JSDOM(html, options);
  const { window } = jsdom;

  // Adding necessary scripts to jsdom
  const scriptJQuery = window.document.createElement('script');
  scriptJQuery.textContent = jquery;
  window.document.body.appendChild(scriptJQuery);
  const scriptJQueryUI = window.document.createElement('script');
  scriptJQueryUI.textContent = jqueryUI;
  window.document.body.appendChild(scriptJQueryUI);
  const scriptMBEE = window.document.createElement('script');
  scriptMBEE.textContent = mbee;
  window.document.body.appendChild(scriptMBEE);
  const app = window.document.createElement('div');
  app.id = 'main';
  window.document.body.appendChild(app);

  // Globally defining jquery, window, and document
  global.window = window;
  global.document = window.document;

  // Exposing global properties if undefined
  const exposedProperties = ['window', 'document'];
  Object.keys(document.defaultView).forEach((property) => {
    if (typeof global[property] === 'undefined') {
      exposedProperties.push(property);
      global[property] = document.defaultView[property];
    }
  });

  global.navigator = {
    userAgent: 'node.js'
  };

  // Setting timeout for animation frame
  global.requestAnimationFrame = function(callback) {
    return setTimeout(callback, 0);
  };

  // Clearing timeout for animation frame
  global.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };

  Object.defineProperties(window, {
    ...Object.getOwnPropertyDescriptors(global),
    ...Object.getOwnPropertyDescriptors(window)
  });
}

// Configure enzyme adaptor
configure({ adapter: new Adapter() });
