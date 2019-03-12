/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.stats
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a stat.
 */
import React, { Component } from 'react';
import { UncontrolledTooltip } from 'reactstrap';

class Stat extends Component {
    constructor(props) {
        super(props);

        this.ref = React.createRef();
    }

    componentDidMount() {
        this.props.setChildWidth(this.props.title, this.ref.current.clientWidth)
    }

    render() {
        return (
            <div className='stats-item' ref={this.ref} id={this.props._key || this.props.title}>
                <i className={this.props.icon}/>
                <p>{isNaN(this.props.value)
                    ? '?'
                    : this.props.value
                }
                </p>
                <UncontrolledTooltip placement='top'
                                     target={this.props._key || this.props.title}
                                     delay={{
                                         show: 0,
                                         hide: 0
                                     }}
                                     boundariesElement='viewport'
                >
                    {this.props.title}
                </UncontrolledTooltip>
            </div>
        )
    }
}

export default Stat;
