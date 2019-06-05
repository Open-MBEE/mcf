## Tutorial: Creating a Plugin

In this tutorial, we will create a simple plugin that adds a mass roll-up 
capability for mechanical model elements. In this case, we will assume that
we have model elements that have a custom data field for storing mechanical
data about a component or part. 

For example, let's assume a model element that represents a mechanical part 
looks something like this:

```json
{
  "id": "part-00001",
  "name": "Fuel Pump",
  "custom": {
    "mech-part": true,
    "mech-data": {
      "mass": "100",
      "mass-unit": "kg"
    } 
  }
}
```

### Creating some test data

To generate a simple test model, we will first write a brief Python script
for adding the model to MBEE via the API. See "Section 4.0 Integrations" of
this document for more on writing API-based integrations.

```python
import json
import requests
server = 'http://localhost:9080'
creds = ('admin', 'Admin12345!')

# Load our element data from our data.json file
with open('data.json', 'r') as f:
    packages = json.loads(f.read()) 

# Create a project in the 'default' org
url = '{}/api/orgs/default/projects/demo-mass-rollup'.format(server)
r = requests.post(url, auth=creds, json={'name': 'Demo - Mass Rollup'})
if (r.status_code != 200):
    print('Project creation failed!')
    print(r.text)
    exit(1)
 
# Append to the previously defined projects URL
url = '{}/branches/master/elements'.format(url)

# POST our model elements
r = requests.post(url, auth=creds, json=packages)
if (r.status_code != 200):
    print('Element creation failed!')
    print(r.text)
    exit(1)

# Rename the model root
url = '{}/{}'.format(url, 'model')
r = requests.patch(url, auth=creds, json={"name": "Spacecraft Model"})
if (r.status_code != 200):
    print('Element modification failed!')
    print(r.text)
    exit(1)
```

We must also define our model as JSON in a file called `data.json`. 
This file should look as follows:

```json
[
    {
        "id": "02-systems-eng", 
        "parent": "model", 
        "name": "02 Systems Engineering"
    }, 
    {
        "id": "06-spacecraft", 
        "parent": "model", 
        "name": "06 Spacecraft"
    },
    {
        "parent": "02-systems-eng",  
        "id": "budgets", 
        "name": "Budgets"
    }, 
    {
        "parent": "budgets", 
        "id": "mass-budget", 
        "name": "Mass Budget"
    }, 
    {
        "id": "structures", 
        "parent": "06-spacecraft", 
        "name": "Structures and Mechanisms"
    },
    {
        "id": "propulsion", 
        "parent": "06-spacecraft", 
        "name": "Propulsion"
    }, 
    {
        "parent": "structures", 
        "id": "part-101", 
        "name": "Satellite Bus",
        "custom": {
            "mech-part": true,
            "mech-data": {
                "mass": "250",
                "mass-unit": "kg"
            }
        }
    },
    { 
        "parent": "structures", 
        "id": "part-102", 
        "name": "Nuts and Bolts",
        "custom": {
            "mech-part": true,
            "mech-data": {
                "mass": "50",
                "mass-unit": "kg"
            }
        }
    },
    { 
        "parent": "propulsion", 
        "id": "part-201", 
        "name": "Rocket Engine",
        "custom": {
            "mech-part": true,
            "mech-data": {
                "mass": "100",
                "mass-unit": "kg"
            }
        }
    },
    { 
        "parent": "propulsion",
        "id": "part-202", 
        "name": "Propellant Tank",
        "custom": {
            "mech-part": true,
            "mech-data": {
                "mass": "50",
                "mass-unit": "kg"
            }
        }
    },
    { 
        "parent": "propulsion",
        "id": "part-203", 
        "name": "Propellant",
        "custom": {
            "mech-part": true,
            "mech-data": {
                "mass": "550",
                "mass-unit": "kg",
                "wet-mass": true
            }
        }
    }
]
```
Now, run the Python script and you should be able to browse to the MBEE UI
to view the model tree and verify that the data was created.

### Starting an application

First we need to create a plugin. Navigate to an empty directory where you want
to develop your plugin. Ensure this code is NOT in your MBEE plugins directory
as the plugin will get cloned into that directory upon server startup. Run
`yarn init` and enter the following information:

```
question name (demo-mass-rollup): 
question version (1.0.0): 
question description: A sample MBEE plugin
question entry point (index.js): app.js
question repository url: 
question author: 
question license (MIT): MIT
question private: true
```

Now lets add this plugin to the MBEE configuration. Upon startup of the server,
the plugin is cloned from the `source` provided, which can be a local directory,
git repository, or link to tar/gz. Simply add the code below to the
`server.plugins` section of your running config, making sure to change
the source to the actual path of your plugin. Additionally, ensure enabled is
set to true.

```json
"plugins": [
  {
    "name": "demo-mass-rollup",
    "source": "PATH_TO_YOUR_PLUGIN",
    "title": "Demo Mass Rollup"
  }
],
```

Now we must create our application's entrypoint. We will define this in an
app.js file. Begin by defining an express application and some 
boilerplate code for the plugin.

```javascript
// Initialize an express app
const express = require('express');
const app = express();

// Require the authentication module
const {authenticate} = M.require('lib.auth');

// Require the element controller and utils
const Element = M.require('controllers.element-controller');
const utils = M.require('lib.utils');

// Configure EJS
app.set('view engine', `ejs`);
app.set('views', __dirname);

/* YOUR PLUGIN CODE GOES HERE */

// Export the app
module.exports = app;
```

Now we need to configure our application. In this case, we need to tell 
our plugin to use the built-in MBEE layout. This can be done by adding
the line:

```javascript
app.set('layout', `${M.root}/app/views/layout.ejs`);
```

### Adding an API endpoint

Now we want to add an API endpoint to do our mass roll up. In this case,
we will execute a database query to find all elements who have the `mech-part`
property set to `true` in their custom data.

Start by defining two routes. The first is a placeholder for our homepage.
This will be a simple redirect to our API endpoints.

```javascript
// Add a route that redirects for now
app.get('/', (req, res) => {
    const url = `${req.originalUrl}/default/demo-mass-rollup/mass`;
    return res.redirect(url);
});
```

Next, add a simple authenticated API endpoint for obtaining system mass.
This API endpoint takes an organization ID and a project ID in the URL
parameters and identifies this endpoint as a mass resource.

Now we can add the logic that actually looks up the elements. Let's start
by just getting all elements that are tagged with `mech-part` and return those
to the user as JSON.

```javascript
// Our mass roll-up API endpoint
app.get('/:org/:proj/mass', authenticate, (req, res) => {
    // Find all elements in a project
    Element.find(req.user, req.params.org, req.params.proj, 'master')
    .then(elements => {
        const filtered = elements.filter(e => e.custom['mech-part']);
        const formatted = JSON.stringify(filtered, null, 4);
        res.header('Content-Type', 'application/json');
        res.status(200).send(formatted);
    })
    .catch(error => {
        M.log.error(error);
        return res.status(500).send('Internal Server Error')
    });
});
```

You can test your new endpoint by starting up the server, and browsing to
`http://localhost:9080/plugins/demo-mass-rollup`. This will then redirect you
to the API endpoint (because of the first route defined). NOTE: Everytime we
make a change to the plugin, you will need to restart the server so it get
cloned again.

Note that the element controller's `findElements()` function takes a user, an
organization ID, project ID, and branchID as parameters. This controller handles
the permission management to ensure that the requesting user has permission to
read elements in the specified project. 

Alternatively, if you wanted to use the model instead of the controller (for
more specific query rather than filter the results after-the-fact), you
would have to check those permissions yourself to avoid providing a user with
data they do not have access to. That approach would increase the
likelihood of a major permission bypass bug in MBEE. To avoid this, always use
the controllers.

Now that we can find elements in MBEE and filter them based on custom data, lets
actually do something with that data to return something more meaningful
than raw element data.

Here, we modify our code to actually provide a roll-up of all the mass in our
system as a single value.

```javascript
app.get('/:org/:proj/mass', authenticate, (req, res) => {
  // Initialize the mass and parts count
  let mass = {
    mass: 0,
    parts: 0
  };

  // Find all elements
  Element.find(req.user, req.params.org, req.params.proj, 'master')
  .then(elements => {
    // Filter elements to only mech-parts
    const filtered = elements.filter(e => e.custom['mech-part']);

    // Compute our mass roll-up
    filtered.forEach(part => {
      mass.mass += Number(part.custom['mech-data'].mass);
      mass.parts += 1;
    });

    // Format and return response data
    const formatted = JSON.stringify(mass, null, 4);
    res.header('Content-Type', 'application/json');
    res.status(200).send(formatted);
  })
  .catch(error => {
    M.log.error(error);
    return res.status(500).send('Internal Server Error')
  });
});
```

Restart your sever and log back in. With this change, you should now be able
to request that API endpoint and get a result that looks something like this:

```json
{
    "mass": 1000,
    "parts": 5
}
``` 

### Creating a view

Now that we have a working API endpoint, let's add a view. To do this, we need
to create an EJS file that will render when showing the home page for 
our plugin. 

To begin we'll create a file called `home.ejs` in the plugin root directory
and add some header content, a form, and a table where the results will be
displayed.

```ejs
<h1>Mass Rollup Tool</h1>

Welcome to the mass rollup tool. Enter an org ID of <code>default</code> and
a project ID of <code>demo-mass-rollup</code>.<br/>

<form id="my-form" class="form-inline">
  <div class="form-group">
    <label for="org">Org</label>
    <input type="text" id="org" class="form-control mx-sm-3">
  </div>
  <div class="form-group">
    <label for="project">Project</label>
    <input type="text" id="project" class="form-control mx-sm-3">
  </div>
  <div class="form-group">
    <button class="btn btn-primary" onclick="computeRollup();">
      Calculate
    </button>
  </div>
  <div class="form-group">
    <span id="msgbox"></span>
  </div>
</form>

<table id="results" class="table">
  <tbody>
    <tr>
      <th scope="row">Mass</th>
      <td id="mass">?</td>
      <td>kg</td>
    </tr>
    <tr>
      <th scope="row"># of Parts</th>
      <td id="parts">?</td>
      <td></td>
    </tr>
  </tbody>
</table>
```

Note that there are some specific classes being used in the code above. This
is because the MCF EJS layout uses 
[Bootstrap](http://getbootstrap.com/docs/4.1/getting-started/introduction/) and
the Bootstrap library is automatically loaded for you.

You may want to be able to add stylistic changes or Javascript to a 
page. To do this, two page sections are defined in the MBEE EJS layout: `styles`
and `scripts`. To use these, simply add EJS content sections like those shown
below to your EJS file.

```ejs
<%- contentFor('styles') %>
<style>
#my-form {
  margin: 20px 0px;
}
table {
  max-width: 400px;
}
#msgbox {
  color: red;
}
#results {
  margin-top: 20px;
}
</style>
```

Below is code that allows our UI to make request to our plugin. Append the code
below to your `home.ejs` file.

```ejs
<%- contentFor('scripts') %>
<script>
  // Overwrite the default form submit
  $(function(){
    document.getElementById("my-form").addEventListener("click", function(event){
      event.preventDefault()
    });
  });

  // Compute roll up by pulling values from forms, executing AJAX call, and
  // displaying the final roll up.
  function computeRollup() {
    const org = $("#org").val();
    const proj = $("#project").val();
    jQuery.ajax({
      method: "GET",
      url: `${window.location.href}/${org}/${proj}/mass`
    })
    .done(function (msg, status) {
      $('#mass').html(msg.mass.toString());
      $('#parts').html(msg.parts.toString());
    })
    .fail(function(msg) {
      $('#msgbox').html('Something went wrong! Make sure org/proj are valid.');
    });
  }
</script>
```

In the JavaScript code above, we do two things. First, we overwrite the default
behavior for forms. This allows us to execute JavaScript when the form is 
submitted rather than actually submitting the form to the server. Second, we 
define the function that will be run when the form is clicked. This function 
makes an AJAX call to the API endpoint we created to get our mass rollup data 
and then displays it in the table.

Also note that, like Bootstrap, [JQuery](https://jquery.com/) is automatically 
loaded for you by the MBEE Core Framework.

Now finally, lets change the root route '/' to render the `.ejs` file. We will
make this an authenticate route, since the other route is authenticated as well.

Replace your root route in app.js:
```javascript
app.get('/', (req, res) => {
    const url = `${req.originalUrl}/default/demo-mass-rollup/mass`;
    return res.redirect(url);
});
```

With the code below:
```javascript
app.get('/', authenticate, (req, res) => {
	return utils.render(req, res, 'home');
});
```

That should be it! Go to 
<http://localhost:9080/plugins/demo-mass-rollup> and login. You should see the
rendered page, where you can enter in the organization ID and project ID and get
back the mass and number of parts.

This has been a very simple example of plugins, but it demonstrates the core
features. Plugins can create their own views, use their own API routes, and
still take advantage of built in controllers. Plugins are very simple to create,
and can provide extensions to the core framework that can improve any project.
