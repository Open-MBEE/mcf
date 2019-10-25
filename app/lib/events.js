/**
 * @classification UNCLASSIFIED
 *
 * @module lib.events
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Austin Bieber
 *
 * @author Austin Bieber
 *
 * @description Defines the global event emitter.
 */

// Node modules
const EventEmitter = require('events');

// Initialize the event emitter
const emitter = new EventEmitter();

// Export the emitter
module.exports = emitter;
