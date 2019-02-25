/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.stats
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the stat list.
 */
import React, { Component } from 'react';

class StatsList extends Component {
    constructor(props) {
        super(props);

        this.ref = React.createRef();

        this.handleResize = this.handleResize.bind(this);
        this.setChildWidth = this.setChildWidth.bind(this);

        this.state = {
            width: null
        };
    }

    handleResize() {
        this.setState({ width: this.ref.current.clientWidth })
    }

    setChildWidth(title, width) {
        this.setState({[`stat-${title}`]: width})
    }

    render() {
        let statsItems = [];

        if (this.state.width) {
            let totalStatsWidth = 0;
            statsItems = React.Children.map(this.props.children, child => {
                const statWidth = this.state[`stat-${child.props.title}`];
                if (totalStatsWidth + statWidth <= this.state.width ) {
                    totalStatsWidth += statWidth;
                    return React.cloneElement(child, {setChildWidth: this.setChildWidth});
                }
            });
        }
        else {
            statsItems = React.Children.map(this.props.children, child =>
                React.cloneElement(child, {setChildWidth: this.setChildWidth})
            );
        }

        return(
            <div className='stats-list' ref={this.ref}>
                {statsItems}
            </div>
        );
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }
}

export default StatsList;
