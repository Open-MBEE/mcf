/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.ApiClientProvider
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the api client class.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { createContext, useContext } from 'react';

// MBEE modules
import AuthService from '../api-client/AuthService.js';
import UserService from '../api-client/UserService.js';
import OrgService from '../api-client/OrgService.js';
import ProjectService from '../api-client/ProjectService.js';
import BranchService from '../api-client/BranchService.js';
import ArtifactService from '../api-client/ArtifactService.js';
import ElementService from '../api-client/ElementService.js';
import { useAuth } from './AuthProvider.js';


const apiClientContext = createContext();

export function ApiClientProvider(props) {
  const authContext = useAuth();
  const authService = new AuthService(authContext);
  const userService = new UserService(authContext);
  const orgService = new OrgService(authContext);
  const projectService = new ProjectService(authContext);
  const branchService = new BranchService(authContext);
  const artifactService = new ArtifactService(authContext);
  const elementService = new ElementService(authContext);

  const value = {
    authService,
    userService,
    orgService,
    projectService,
    branchService,
    artifactService,
    elementService
  };
  return <apiClientContext.Provider value={value} {...props}/>;
}

export function useApiClient() {
  const context = useContext(apiClientContext);
  if (!context) throw new Error('');
  return context;
}
