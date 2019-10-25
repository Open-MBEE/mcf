/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.profile-views.profile-home
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders a user's profile home page.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// MBEE modules
import Sidebar from '../general/sidebar/sidebar.jsx';
import SidebarLink from '../general/sidebar/sidebar-link.jsx';
import Profile from '../profile-views/profile.jsx';

// Define component
class ProfileHome extends Component {

  /* eslint-enable no-unused-vars */

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      user: null,
      otherUser: null,
      error: null
    };
  }

  componentDidMount() {
    // eslint-disable-next-line no-undef
    mbeeWhoAmI((err, data) => {
      if (err) {
        this.setState({ error: err.responseText });
      }
      else {
        this.setState({ user: data });

        const username = this.props.match.params.username;
        if (username && (username !== 'projects') && (username !== 'orgs')) {
          const url = `/api/users/${username}`;
          $.ajax({
            method: 'GET',
            url: `${url}?minified=true&includeArchived=true`,
            statusCode: {
              200: (otherUser) => {
                // Set states
                this.setState({ otherUser: otherUser });
              },
              401: (error) => {
                // Throw error and set state
                this.setState({ error: error.responseText });
              },
              404: (error) => {
                this.setState({ error: error.responseText });
              }
            }
          });
        }
      }
    });
  }

  render() {
    let title = 'Loading ...';
    let routerLink = '/profile';
    const otherUser = this.state.otherUser;
    const user = this.state.user;

    if (otherUser !== null) {
      routerLink = `/profile/${otherUser.username}`;
      if (otherUser.preferredName) {
        title = `${otherUser.preferredName}'s Profile`;
      }
      else if (otherUser.fname) {
        title = `${otherUser.fname}'s Profile`;
      }
      else {
        title = `${this.state.user.username}'s Profile`;
      }
    }
    else if (user && user.preferredName) {
      title = `${user.preferredName}'s Profile`;
    }
    else if (user && user.fname) {
      title = `${user.fname}'s Profile`;
    }
    else if (user) {
      title = `${user.username}'s Profile`;
    }

    // Return user page
    return (
      <Router>
        <div id='container'>
          { /* Create the sidebar with sidebar links */ }
          <Sidebar title={title}>
            <SidebarLink id='Information'
                         title='Information'
                         icon='fas fa-info'
                         routerLink={routerLink} />
          </Sidebar>
          { /* Verify user data exists */ }
          { // Display loading page or error page if user data is loading or failed to load
            (!user)
              ? <div id='view' className="loading"> {this.state.error || 'Loading information...'}</div>
              : (
                <Switch>
                  {/* Verify if user is view their own profile, then return their info  */}
                  {(otherUser === null)
                    ? (<Route exact path="/profile" render={(props) => <Profile {...props}
                                                                  admin={true}
                                                                  user={this.state.user} /> } />)
                    : (<Route path={`/profile/${this.props.match.params.username}`}
                              render={(props) => <Profile {...props}
                                                          admin={user.admin}
                                                          viewingUser={user}
                                                          user={otherUser} /> } />)

                  }
                </Switch>
              )
          }
        </div>
      </Router>
    );
  }

}

export default ProfileHome;
