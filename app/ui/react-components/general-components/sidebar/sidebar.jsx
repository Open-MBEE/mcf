/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.sidebar
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the sidebar.
 */
import React, { Component } from 'react';
import SidebarLink from './sidebar-link.jsx';

class Sidebar extends Component {
    constructor(props) {
        super(props);

        this.handleResize = this.handleResize.bind(this);
        this.toggle = this.toggle.bind(this);

        this.state = {
            isExpanded: false,
            forceClosed: false,
            windowWidth: 0
        };
    }

    componentDidMount() {
        document.getElementById('main').classList.add('main-sidebar');
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    componentWillUnmount() {
        document.getElementById('root').classList.remove('root-sidebar');
        window.removeEventListener('resize', this.handleResize);
    }

    handleResize() {
        if (!this.state.forceClosed){
            if (this.state.windowWidth < 1200 && window.innerWidth >= 1200 && !this.state.isExpanded) {
                this.toggle()
            }
            if (this.state.windowWidth >= 1200 && window.innerWidth < 1200 && this.state.isExpanded) {
                this.toggle()
            }
        }

        this.setState({ windowWidth: window.innerWidth })
    }

    toggle(event) {
        document.getElementById('sidebar').classList.toggle('sidebar-expanded');
        if (event) {
            if (window.innerWidth >= 1200 && this.state.isExpanded) {
                this.setState({forceClosed: true});
            }
            else {
                this.setState({forceClosed: false});
            }
        }
        this.setState({isExpanded: !this.state.isExpanded});
    }

    render() {

        const sidebarLink = React.Children.map(this.props.children, child => {
            return (child.type === SidebarLink)
                ? React.cloneElement(child, {isExpanded: this.state.isExpanded})
                : child;
        });

        return (
            <div id='sidebar' className='sidebar'>
                <div className='sidebar-links'>
                    {sidebarLink}
                </div>
                <div className='sidebar-collapse'>
                    <hr/>
                    <SidebarLink title='Collapse'
                                 icon='fas fa-angle-right'
                                 tooltip='Expand Sidebar'
                                 onClick={this.toggle}
                                 isExpanded={this.state.isExpanded}/>
                </div>
            </div>
        );
    }
}

export default Sidebar;
