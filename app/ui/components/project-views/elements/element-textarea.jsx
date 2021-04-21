/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-textarea
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Danny Chiu
 *
 * @author Danny Chiu
 *
 * @description This renders the text area input.
 */

/* Modified ESLint rules for React. */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */

// React modules
import React from 'react';
import {
  FormGroup,
  Label,
  Input,
  Col
} from 'reactstrap';

/* eslint-enable no-unused-vars */

function ElementTextarea(props) {
  const { name, label, value, id, placeholder, onChange, invalid } = props;
  const _invalid = (invalid.length > 0 && name === 'customData');
  return (
    <React.Fragment>
      <Col sm={2} style={{ paddingRight: 1 }}>
        <Label for={id} style={{ fontSize: 13, margin: 0 }}>
          {label}
        </Label>
      </Col>
      <Col sm={10} style={{ paddingLeft: 0 }}>
        <Input
          type="textarea"
          name={name}
          value={value}
          id={id}
          placeholder={placeholder}
          onChange={onChange}
          invalid={_invalid}
          style={{ fontSize: 14, height: 150 }}/>
      </Col>
    </React.Fragment>
  );
}

export default ElementTextarea;
