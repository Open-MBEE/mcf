/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.search.advanced-search.advanced-row
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner James Eckstein
 *
 * @author James Eckstein
 *
 * @description This renders an advanced search row.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import { Button, Container, Row, Col, Input, InputGroup, Form } from 'reactstrap';

/* eslint-enable no-unused-vars */

function AdvancedRow(props) {
  // Show delete button if there's more than 1 row
  const btnDeleteRow = (props.idx !== 0)
    ? <Button close className='adv-row-del' onClick={() => props.deleteRow(props.idx)}/>
    : <Button close className='adv-row-del' disabled={true} style={ { color: 'transparent' } }/>;

  return (
    <Row key={props.idx} className='adv-search-row'>
      <Col md={3}>
        <Input type='select' name='criteria'
               className='adv-search-select'
               value={props.criteria}
               onChange={(event) => props.handleChange(props.idx, event)}>
          { props.options }
        </Input>
      </Col>
      <Col className='adv-col'>
        <Input placeholder={props.criteria}
               className='adv-input-field'
               name='value'
               value={props.val}
               onChange={(event) => props.handleChange(props.idx, event)}
               onKeyDown={props.onKeyDown}
        >
        </Input>
        { btnDeleteRow }
      </Col>
    </Row>
  );
}

export default AdvancedRow;
