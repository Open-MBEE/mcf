/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.project-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a project's home page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React, { useState, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import validators from '../../../../build/json/validators.json';

// MBEE modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import SidebarHeader from '../general/sidebar/sidebar-header.jsx';
import InformationPage from '../shared-views/information-page.jsx';
import MembersPage from '../shared-views/members/members-page.jsx';
import ProjectElements from '../project-views/elements/project-elements.jsx';
import ProjectArtifacts from '../project-views/artifacts/project-artifacts.jsx';
import Search from '../project-views/search/search.jsx';
import BranchesTags from '../project-views/branches/branches-tags.jsx';
import { useApiClient } from '../context/ApiClientProvider';
import { ElementProvider } from '../context/ElementProvider.js';

/* eslint-enable no-unused-vars */

function ProjectHome(props) {
  const { projectService } = useApiClient();
  const [project, setProject] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [error, setError] = useState(null);

  const refresh = () => {
    const orgId = props.match.params.orgid;
    const projId = props.match.params.projectid;

    // eslint-disable-next-line no-undef
    mbeeWhoAmI(async (err, user) => {
      // Verify if error returned
      if (err) {
        // Set error state
        setError(err.responseText);
      }
      else {
        // Set options for request
        const options = {
          ids: projId,
          includeArchived: true
        };

        // Request project data
        const [err2, projects] = await projectService.get(orgId, options);

        // Set the state
        if (err2) {
          setError(err2);
        }
        else if (projects) {
          const projectData = projects[0];
          const username = user.username;
          const perm = projectData.permissions[username];

          // Set state of admin status and user permissions
          if ((user.admin) || perm === 'admin') setAdmin(true);
          setPermissions(perm);

          // Set the project data unless the user isn't allowed to see it
          if (projectData.archived && !user.admin && (perm !== 'admin')) {
            setProject(null);
            setError(`Project [${projectData.id}] not found.`);
          }
          else {
            setProject(projectData);
          }
        }
      }
    });
  };

  // on mount and when the org or project id changes
  useEffect(() => {
    refresh();
  }, [props.match.params]);


  // Define branch, defaults to master
  let branch = 'master';

  // Get url path
  const currUrlPath = props.location.pathname;

  // Match branch id
  const branchMatched = currUrlPath.match('/branches/[w]*');

  // Check for match
  if (branchMatched) {
    // Extract branch substring
    const branchSubString = currUrlPath.substring(branchMatched.index);

    // Extract branch id
    const urlBranch = branchSubString.split('/')[2];

    // Validate id
    const validatorsBranchId = validators.branch.id.split(validators.ID_DELIMITER).pop();
    const maxLength = validators.branch.idLength - validators.project.idLength - 1;
    const branchLength = urlBranch.length;
    const validLen = (branchLength > 0 && branchLength <= maxLength);

    if (RegExp(validatorsBranchId).test(urlBranch) && validLen) {
      // Validated, set id
      branch = urlBranch;
    }
  }

  // Initialize variables
  let title;
  let displayPlugins = false;
  const plugins = [];

  // Verify if project exists
  if (project) {
    // Set the title for sidebar
    title = <h2> {project.name}</h2>;

    // Verify if plugins in project
    if (project.custom.integrations) {
      displayPlugins = true;
      plugins.push(<SidebarHeader title='Integrations'/>);
      project.custom.integrations.forEach((plugin) => {
        let icon = 'layer-group';
        let newTab = false;

        if (!plugin.hasOwnProperty('name') || !plugin.hasOwnProperty('url')) {
          return;
        }
        if (plugin.hasOwnProperty('icon')) {
          icon = plugin.icon;
        }
        if (plugin.hasOwnProperty('openNewTab')) {
          newTab = project.custom.integrations.openNewTab;
        }

        plugins.push(<SidebarLink id={`sidebar-${plugin.name}`}
                                  title={plugin.title}
                                  icon={`fas fa-${icon}`}
                                  openNewTab={newTab}
                                  link={`${plugin.url}`}/>);
      });
    }
  }

  // Return project page
  return (
    <div id='container'>
      { /* Create the sidebar with sidebar links */ }
      <Sidebar title={title}>
        {(displayPlugins)
          ? (<SidebarHeader title='Dashboard'/>)
          : ''
        }
        <SidebarLink id='Elements'
                     title='Model'
                     icon='fas fa-sitemap'
                     routerLink={`${props.match.url}/branches/${branch}/elements`}/>
        <SidebarLink id='Branches'
                     title='Branches/Tags'
                     icon='fas fa-code-branch'
                     routerLink={`${props.match.url}/branches`}/>
        <SidebarLink id='Artifacts'
                     title='Artifacts'
                     icon='fas fa-archive'
                     routerLink={`${props.match.url}/branches/${branch}/artifacts`}/>
        <SidebarLink id='Search'
                     title='Search'
                     icon='fas fa-search'
                     routerLink={`${props.match.url}/branches/${branch}/search`}/>
        <SidebarLink id='Members'
                     title='Members'
                     icon='fas fa-users'
                     routerLink={`${props.match.url}/users`}/>
        <SidebarLink id='Information'
                     title='Information'
                     icon='fas fa-info'
                     routerLink={`${props.match.url}/info`}/>
        {/* Verify plugins provided, display route in sidebar */}
        {(!displayPlugins)
          ? ''
          : (plugins)
        }
      </Sidebar>
      { /* Verify project and element data exists */ }
      { // Display loading page or error page if project is loading or failed to load
        (!project)
          ? <div id='view' className="loading"> {error || 'Loading your project...'} </div>
          : (
            <Switch>
              { /* Route to element page */ }
              <Route path={`${props.match.url}/branches/:branchid/elements`}
                     render={ (renderProps) => <ElementProvider {...renderProps}>
                                                 <ProjectElements {...renderProps}
                                                                  permissions={permissions}
                                                                  project={project}/>
                                               </ElementProvider> } />
              { /* Route to artifacts page */ }
              <Route exact path={`${props.match.url}/branches/:branchid/artifacts`}
                     render={ (renderProps) => <ProjectArtifacts {...renderProps}
                                                       permissions={permissions}
                                                       project={project}
                                                       branchID={branch}/> } />
              <Route path={`${props.match.url}/branches/:branchid/search`}
                     render={ (renderProps) => <Search {...renderProps}
                                                 project={project} /> } />
              <Route path={`${props.match.url}/branches/:branchid`}
                     render={ (renderProps) => <InformationPage {...renderProps}
                                                          orgID={project.org}
                                                          projectID={project.id}
                                                          branch={true}
                                                          refresh={refresh}/> } />
              <Route exact path={`${props.match.url}/branches`}
                     render={ (renderProps) => <BranchesTags {...renderProps}
                                                       permissions={permissions}
                                                       project={project}/> } />
              { /* Route to members page */ }
              <Route exact path={`${props.match.url}/users`}
                     render={ (renderProps) => <MembersPage {...renderProps}
                                                      project={project}
                                                      admin={admin}
                                                      refresh={refresh}/> } />
              { /* Route to project home page */ }
              <Route exact path={`${props.match.url}/info`}
                     render={ (renderProps) => <InformationPage {...renderProps}
                                                          permissions={permissions}
                                                          project={project}
                                                          refresh={refresh}/> } />
            </Switch>
          )
      }
    </div>
  );
}

export default ProjectHome;
