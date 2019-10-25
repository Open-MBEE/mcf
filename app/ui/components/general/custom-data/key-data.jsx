/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.general.custom-data.key-data
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner James Eckstein
 *
 * @author Leah De Laurell
 *
 * @description This renders the custom data keys and value pairs.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React modules
import React, { Component } from 'react';
/* eslint-enable no-unused-vars */

class KeyData extends Component {

  constructor(props) {
    // Initialize parent props
    super(props);

    // Initialize state props
    this.state = {
      keyName: this.props.keyName,
      data: this.props.data,
      keyDataDisplay: false
    };

    // Bind component functions
    this.toggleData = this.toggleData.bind(this);
  }

  toggleData() {
    // Toggle the display of the value
    this.setState({ keyDataDisplay: !this.state.keyDataDisplay });
  }

  componentDidUpdate(prevProps) {
    // Verify if props were updated
    if (this.props.data !== prevProps.data) {
      // Update state with new props
      this.setState({ keyDataDisplay: false });
      this.setState({ data: this.props.data });
      this.setState({ keyName: this.props.keyName });
    }
  }

  render() {
    // Initialize variables
    const custom = this.state.data;
    let nestedData;
    let displayIcon;

    // Verify if data is displayed
    if (!this.state.keyDataDisplay) {
      displayIcon = 'plus-square';
    }
    else {
      displayIcon = 'minus-square';
    }

    // Verify if data is an array
    if (Array.isArray(custom)) {
      // Loop through array
      nestedData = custom.map((data) => {
        // Initialize variables
        const nests = [];

        // Verify type of data
        if (typeof data === 'object' && data) {
          // Loop through data for recursive call
          nestedData = Object.keys(data).map((key) => nests.push(<KeyData key={`key-${key}`} keyName={key} data={data[key]}/>));
        }
        else if (!data) {
          nests.push(<span className='last-element'>{'null'}</span>);
        }
        else {
          // Display the data
          /* eslint-disable-next-line no-undef */
          nests.push(<span className='last-element'>{decodeHTML(data)}</span>);
        }

        // Return the array
        return nests;
      });
      // custom =
    }
    // Verify type is object
    else if (typeof custom === 'object' && custom) {
      // Loop through object for recursive call
      nestedData = Object.keys(custom).map((key) => <KeyData key={`key-${key}`} keyName={key} data={custom[key]}/>);
    }
    // Verify if type if boolean
    else if (typeof custom === 'boolean') {
      nestedData = (custom)
        ? (<span className='last-element'>true</span>)
        : (<span className='last-element'>false</span>);
    }
    else if (!custom) {
      nestedData = (<span className='last-element'>{'null'}</span>);
    }
    else {
      /* eslint-disable-next-line no-undef */
      nestedData = (<span className='last-element'>{decodeHTML(custom)}</span>);
    }

    return (
      <React.Fragment>
        <div className='custom-key'>
          {/* Icon for drop down */}
          <i className={`fas fa-${displayIcon}`}
             onClick={this.toggleData}>
          </i>
          {/* Key Name */}
          <span className='key-name'>
            {this.state.keyName} :
          </span>
        </div>
        {/* Verify if data should be displayed */}
        {(!this.state.keyDataDisplay)
          ? ''
          // Display data
          : (<div className='custom-key-info'>
              <span> {nestedData} </span>
             </div>)
        }
      </React.Fragment>
    );
  }

}

export default KeyData;
