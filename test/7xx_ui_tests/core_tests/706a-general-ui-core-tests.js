/**
 * @classification UNCLASSIFIED
 *
 * @module test.7xx_ui_tests.706-general-ui-core-tests
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This tests that the general component mount
 * and render.
 */
/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// NPM modules
import React from 'react';
import { shallow } from 'enzyme';
import chai from 'chai';

// MBEE components
import List from '../../../app/ui/components/general/list/list.jsx';
import ListItem from '../../../app/ui/components/general/list/list-item.jsx';
import KeyData from '../../../app/ui/components/general/custom-data/key-data.jsx';
import Divider from '../../../app/ui/components/general/sidebar/divider.jsx';
import SidebarHeader from '../../../app/ui/components/general/sidebar/sidebar-header.jsx';

/* eslint-enable no-unused-vars */

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */

describe(M.getModuleName(module.filename), () => {
  it('Renders the list component', listRender);
  it('Renders the list item component', listItemRender);
  it('Renders the key data component', keyDataRender);
  it('Renders the divider component', dividerRender);
  it('Renders the sidebar header component', sidebarHeaderRender);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Mount the list component to verify
 * component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function listRender(done) {
  // Render list component
  const wrapper = shallow(<List/>);
  // Expect component to be in DOM
  chai.expect(wrapper.exists()).to.equal(true);
  done();
}

/**
 * @description Mount the list item component to verify
 * component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function listItemRender(done) {
  // Render list item component
  const wrapper = shallow(<ListItem />);
  // Expect component to be in DOM
  chai.expect(wrapper.exists()).to.equal(true);
  done();
}

/**
 * @description Mount the key data component to verify
 * component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function keyDataRender(done) {
  // Render key data component
  const wrapper = shallow(<KeyData />);
  // Expect component to be in DOM
  chai.expect(wrapper.exists()).to.equal(true);
  done();
}

/**
 * @description Mount the divider component to verify
 * component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function dividerRender(done) {
  // Render key data component
  const wrapper = shallow(<Divider />);
  // Expect component to be in DOM
  chai.expect(wrapper.exists()).to.equal(true);
  done();
}

/**
 * @description Mount the sidebar header component to
 * verify component renders correctly.
 *
 * @param {Function} done - The mocha callback.
 */
function sidebarHeaderRender(done) {
  // Render sidebar header component
  const wrapper = shallow(<SidebarHeader />);
  // Expect component to be in DOM
  chai.expect(wrapper.exists()).to.equal(true);
  done();
}
