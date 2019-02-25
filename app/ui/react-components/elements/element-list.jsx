/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.elements
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders the element tree in the project's page.
 */
import React, { Component } from 'react';
import { getRequest } from "../helper-functions/getRequest";
import List from '../general-components/list/list.jsx';
import ListItem from '../general-components/list/list-item.jsx';

class ElementList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            elementChildren: null
        }

        this.constructListItem = this.constructListItem.bind(this);
    }

    constructListItem(item) {
        return new Promise((resolve, reject) => {
            const url = this.props.url;

            getRequest(`${url}/branches/master/elements/${item}`)
                .then(containedElement => {
                    const promises = [];
                    const listItems = [];

                    if (containedElement.contains.length > 0) {
                        for (let i = 0; i < containedElement.contains.length; i++) {
                            promises.push(this.constructListItem(containedElement.contains[i])
                                .then((listItem) => {
                                    listItems.push(listItem);
                                })
                                .catch((err) => console.log(err))
                            )
                        }

                        Promise.all(promises)
                        .then(() => {
                            return resolve(
                                <List>
                                    <ListItem element={containedElement}/>
                                    <List className='guideline'>
                                        {listItems}
                                    </List>
                                </List>
                            );
                        })
                        .catch(err => {
                            console.log(err);
                        })
                    }
                    else {
                        return resolve(
                            <List>
                                <ListItem key={item} element={containedElement}/>
                            </List>
                        );
                    }
                })
                .catch(err => {
                    console.log(err);
                    return reject(err);
                })
        })
    }

    componentDidMount() {
        const element = this.props.element;

        const promises = [];
        const listItems = [];

        for (let i = 0; i < element.contains.length; i++) {
            promises.push(this.constructListItem(element.contains[i])
                .then((listItem) => {
                    listItems.push(listItem);
                })
                .catch((err) => console.log(err))
            )
        }

        Promise.all(promises)
        .then(() => {
            this.setState({ elementChildren: listItems})
        })
        .catch(err => {
            console.log(err);
        })
    }



    render() {
        return (
            <List className='guideline'>
                {this.state.elementChildren}
            </List>
        )
    }
}



export default ElementList
