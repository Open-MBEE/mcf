/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.home-page
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the homepage.
 */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

class HomePage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <React.Fragment>
                <div className="mbee-home">
                    <div className="row align-items-center">
                        <div className="col-md-2">
                        </div>
                        <div className="col-md-8" style={{'text-align': 'center'}}>
                            <div className="row align-items-center splash-row">
                                <div className="col-5" style={{'text-align': 'right'}}>
                                    <img src="/img/logo.png" height="180" alt=""
                                         style={{'margin-bottom': '20px'}} />
                                </div>
                                <div className="col-7" style={{'text-align': 'left'}}>
                                    <h1>MBEE</h1>
                                    <h2>Model-Based Engineering Environment</h2>
                                </div>
                            </div>
                            <div className="home-links">
                                <a href="/organizations" className="home-link">
                                    <div className="home-link-icon">
                                        <i className="fas fa-boxes"></i>
                                    </div>
                                    <div className="home-link-label">
                                        <p>Your Organizations</p>
                                    </div>
                                </a>
                                <a href="/projects" className="home-link">
                                    <div className="home-link-icon">
                                        <i className="fas fa-box"></i>
                                    </div>
                                    <div className="home-link-label">
                                        <p>Your Projects</p>
                                    </div>
                                </a>
                                <a href="/whoami" className="home-link">
                                    <div className="home-link-icon">
                                        <i className="fas fa-user-secret"></i>
                                    </div>
                                    <div className="home-link-label">
                                        <p>You</p>
                                    </div>
                                </a>
                            </div>
                        </div>
                        <div className="col-md-2">
                        </div>
                    </div>
                </div>
            </React.Fragment>

        );
    }
}

ReactDOM.render(<HomePage />, document.getElementById('view'));

