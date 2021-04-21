/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.ElementProvider
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description This file exports a React Provider component and a consumer
 * function that helps to simplify management of the state of the element tree.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

import React, { createContext, useContext, useState } from 'react';

const elementContext = createContext([null, () => {}]);

/**
 * @description Creates a Provider component that makes available the ID of the element in
 * focus on the element tree.
 *
 * @param {object} props - React props.
 * @returns {Function} The provider component.
 */
function ElementProvider(props) {
  const [elementID, setElementID] = useState(null);
  const [providedElement, setProvidedElement] = useState(null);

  const value = {
    elementID,
    setElementID,
    providedElement,
    setProvidedElement
  };

  return <elementContext.Provider value={value} {...props}/>;
}

/**
 * @description A function that allows child components to access the value of the provider.
 * @returns {object} The react context.
 */
function useElementContext() {
  const context = useContext(elementContext);
  if (context === undefined) throw new Error('Element context is not defined');
  return context;
}

export { ElementProvider, useElementContext };
