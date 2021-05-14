/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.context.AuthProvider
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
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, createContext, useContext } from 'react';

const authContext = createContext({});

export function AuthProvider(props) {
  const [auth, setAuth] = useState(Boolean(window.sessionStorage.getItem('mbee-user')));

  const value = {
    auth,
    setAuth
  };

  return <authContext.Provider value={value} {...props}/>;
}

export function useAuth() {
  const context = useContext(authContext);
  if (context === undefined) throw new Error('Auth context is not defined outside of AuthProvider');
  return context;
}
