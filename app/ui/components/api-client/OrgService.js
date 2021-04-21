/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.OrgService
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the organization service.
 */

// MBEE modules
import ApiClient from './ApiClient.js';

class OrgService extends ApiClient {

  constructor(authContext) {
    super(authContext, '/api/orgs');
  }

}

export default OrgService;
