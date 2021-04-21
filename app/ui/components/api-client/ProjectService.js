/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.api-client.ProjectService
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Connor Doyle
 *
 * @description Defines the project service.
 */

// MBEE modules
import ApiClient from './ApiClient.js';

class ProjectService extends ApiClient {

  constructor(authContext) {
    super(authContext, '/api/orgs');
  }

  get(orgid, options) {
    const url = `${this.url}/${orgid}/projects`;
    return super.get(options, url);
  }

  post(orgid, data, options) {
    const url = `${this.url}/${orgid}/projects`;
    return super.post(data, options, url);
  }

  patch(orgid, data, options) {
    const url = `${this.url}/${orgid}/projects`;
    return super.patch(data, options, url);
  }

  put(orgid, data, options) {
    const url = `${this.url}/${orgid}/projects`;
    return super.put(data, options, url);
  }

  delete(orgid, data, options) {
    const url = `${this.url}/${orgid}/projects`;
    return super.delete(data, options, url);
  }

}

export default ProjectService;
