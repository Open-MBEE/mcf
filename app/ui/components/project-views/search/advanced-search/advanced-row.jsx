/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.components.project-views.search.advanced-search.advanced-row
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders an advanced search row.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */

// React Modules
import React, { Component } from 'react';
import { Button, Col, Input, InputGroup } from 'reactstrap';

/* eslint-enable no-unused-vars */

class AdvancedRow extends Component {

  constructor(props) {
    super(props);
    this.removeRow = this.removeRow.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
  }

  onInputChange(e) {
    this.props.handleChange(this.props.idx, e);
  }

  removeRow() {
    this.props.deleteRow(this.props.idx);
  }

  render() {
    const btnDeleteRow = (this.props.idx !== 0)
      ? <Button close className='adv-row-del' onClick={this.removeRow}/>
      : <Button close className='adv-row-del' disabled={true} style={ { color: 'transparent' } }/>;
    return (
      <div key={this.props.idx} className='adv-search-row'>
        <InputGroup className='adv-search-input-group'>
          <Col className='adv-col' md={3}>
            <Input type='select' name='criteria'
                   className='adv-search-select'
                   value={this.props.criteria}
                   onChange={this.onInputChange}>
              { this.props.options }
            </Input>
          </Col>
          <Input placeholder={this.props.criteria}
                 className='adv-input-field'
                 name='value'
                 value={this.props.val}
                 onChange={this.onInputChange}>
          </Input>
          { btnDeleteRow }
        </InputGroup>
      </div>
    );
  }

}

export default AdvancedRow;
