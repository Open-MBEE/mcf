/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.BranchService
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the branch service.
 */

// MBEE modules
import ApiClient from './ApiClient.js';

class BranchService extends ApiClient {

  constructor(authContext) {
    super(authContext, '/api/orgs');
  }

  get(orgID, projID, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches`;
    return super.get(options, url);
  }

  post(orgID, projID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches`;
    return super.post(data, options, url);
  }

  patch(orgID, projID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches`;
    return super.patch(data, options, url);
  }

  delete(orgID, projID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches`;
    return super.delete(data, options, url);
  }

}

export default BranchService;
