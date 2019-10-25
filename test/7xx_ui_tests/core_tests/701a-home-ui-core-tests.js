/**
 * @classification UNCLASSIFIED
 *
 * @module test.7xx_ui_tests.701-home-ui-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This tests the app of the home to
 * verify the render works correctly.
 */
/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// NPM modules
import React from 'react';
import chai from 'chai';
import { mount } from 'enzyme';
import sinon from 'sinon';

// MBEE components
import Home from '../../../app/ui/components/home-views/home.jsx';

/* eslint-enable no-unused-vars */

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  let stub;

  beforeEach(function() {
    // Create stub for ajax call
    stub = sinon.stub($, 'ajax');
  });

  afterEach(function() {
    // Restore ajax calls
    stub.restore();
  });

  it('Renders the home component', homeRender);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Mount the home component to verify
 * component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function homeRender(done) {
  // Render home component
  const wrapper = mount(<Home />);
  // Expect component to be in DOM
  chai.expect(wrapper.find(Home).length).to.equal(1);
  done();
}
