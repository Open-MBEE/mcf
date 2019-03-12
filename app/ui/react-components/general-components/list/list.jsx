/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.general-components.list
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a list.
 */
import React from 'react';

function List(props) {
    const listItems = React.Children.map(props.children, (child, i) =>
        <React.Fragment>
            {child}
            {/*{(React.Children.count(props.children) - 1 === i) ? '' : <hr/>}*/}
        </React.Fragment>
    );

    let appliedClasses = 'list';
    if(props.className) {
        appliedClasses += ` ${props.className}`;
    }

    return (
        <div className={appliedClasses}>
            {listItems}
        </div>
    )
}


export default List
