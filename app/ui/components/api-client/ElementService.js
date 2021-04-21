/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.ElementService
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the element service.
 */

// MBEE modules
import ApiClient from './ApiClient.js';

class ElementService extends ApiClient {

  constructor(authContext) {
    super(authContext, '/api/orgs');
  }

  get(orgID, projID, branchID, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.get(options, url);
  }

  post(orgID, projID, branchID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.post(data, options, url);
  }

  patch(orgID, projID, branchID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.patch(data, options, url);
  }

  put(orgID, projID, branchID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.put(data, options, url);
  }

  delete(orgID, projID, branchID, data, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.delete(data, options, url);
  }

  search(orgID, projID, branchID, query, options) {
    const url = `${this.url}/${orgID}/projects/${projID}/branches/${branchID}/elements`;
    return super.search(query, options, url);
  }

}

export default ElementService;
