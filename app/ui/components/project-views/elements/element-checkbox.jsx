/**
 * @classification UNCLASSIFIED
 *
 * @module ui.components.project-views.elements.element-checkbox
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Danny Chiu
 *
 * @author Danny Chiu
 *
 * @description This renders the checkbox.
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
function ElementCheckbox(props) {
  const { name, label, id, checked, onChange } = props;
  return (
    <FormGroup check style={{ paddingLeft: 35 }}>
      <Label check for={id} style={{ fontSize: 13, margin: 0 }}>
        <Input type="checkbox"
               name={name}
               id={id}
               checked={checked}
               value={checked}
               onChange={onChange}/>
        {label}
      </Label>
    </FormGroup>
  );
}

export default ElementCheckbox;
