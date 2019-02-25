/**
 * Classification: UNCLASSIFIED
 *
 * @module ui.react-components.user
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This renders a user's home page.
 */
import React from 'react';

function UserHome(props) {
    const user = props.user;

    return (
        <div id='view' className='user-home'>
            <h2>{user.name}</h2>
            <hr />
            <table>
                <tr>
                    <th>Username:</th>
                    <td>{user.username}</td>
                </tr>
                <tr>
                    <th>Email:</th>
                    <td>{user.email}</td>
                </tr>
                <tr>
                    <th>Custom:</th>
                    <td>{JSON.stringify(user.custom, null, 2)}</td>
                </tr>
            </table>
        </div>
    )
}

export default UserHome
