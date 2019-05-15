## Tutorial: API Organization and Project Management

In this tutorial, we will show how to manage organizations and projects. By 
default every user is a member of the *default* organization and has permission
to add projects to that organization. In this tutorial we will show how to 
create a new organization. To do so, you must be an admin user on MBEE. 
Otherwise, you can follow the project section of this tutorial by adding a
project to the *default* organization.

Before creating an organization, we must start with similar boilerplate code from
the previous tutorial, where we log in to the MBEE server.

```python
import requests
server = 'http://localhost:9080'
creds = ('admin', 'Admin12345!')

# Test to make sure we can connect to the server
url = '{}/api/test'.format(server)
r = requests.get(url)
```

In the above code snippet, we set up our *server* variable and a *creds* 
variable to store our basic auth credentials. We'll use basic auth only in this
tutorial for simplicity. Then we confirm we are connected to the server.

Now we can make a POST request to the server to create an organization.

```python
# Create an org
url = '{}/api/orgs/demo'.format(server)
r = requests.post(url, auth=creds, json={'name': 'Demo Org'})
print(r.status_code)
print(r.json())
```

In the above code snippet, we make a request to the `/api/orgs/:orgid` route 
where we supply an organization ID of `demo`. An ID can only contain lowercase
letters, numbers, dashes (`-`), and underscores (`_`) and must begin with a 
lowercase letter or a number. Please note that this is configurable in your
running config.

We also supply a JSON body with the POST request. In this case, we specify a 
name for our organization and call it `Demo Org`.

Now that we've created our organization, we can verify it got created by making
a GET request to the server to retrieve it. 

```python
url = '{}/api/orgs/demo'.format(server)
r = requests.get(url, auth=creds)
print(r.status_code)
print(r.json())
```

Note that the above code snippet is nearly identical to the one used to create
the organization, but instead we do a GET request and do not provide a JSON 
body. Alternatively, you can make a get request to `/api/orgs` to get a list of 
all organizations in MBEE as a JSON array.

Now that we have our organization, we can create a project within that 
organization with a similar approach. 

```python
# Create a project
url = '{}/api/orgs/demo/projects/demo-project'.format(server)
r = requests.post(url, auth=creds, json={'name': 'Demo Project'})
print(r.status_code)

# Get the project
url = '{}/api/orgs/demo/projects/demo-project'.format(server)
r = requests.get(url, auth=creds)
print(r.status_code)
print(r.json())
```

The above code creates our project by calling the 
`/api/orgs/:orgid/projects/:projectid` API endpoint. In this case we pass in the
same org ID as the one we created previously and we provide a project ID of
`demo-project`. We also provide a JSON body giving our project a name of 
`Demo Project`. Finally, we make a GET request to the server requesting the 
project we just created.

> NOTE: Project IDs follow the same rules as organization IDs;
> An ID can only contain lowercase letters, numbers, dashes (`-`), and 
> underscores (`_`) and must begin with a lowercase letter or a number. Once
> again, this is configurable.

Cleaning up all the code snippets above and putting it all together, we get 
a python script to create an organization and a project.

```python
#!/usr/bin/env python
import requests
import json

server = 'http://localhost:9080'
creds = ('admin', 'Admin12345!')

# Test to make sure we can connect to the server
url = '{}/api/test'.format(server)
r = requests.get(url)

# Create an org
url = '{}/api/orgs/demo'.format(server)
r = requests.post(url, auth=creds, json={'name': 'Demo Org'})

# Get the org
r = requests.get(url, auth=creds)
print(json.dumps(r.json(), indent=4))

# Create a project
url = '{}/api/orgs/demo/projects/demo-project'.format(server)
r = requests.post(url, auth=creds, json={'name': 'Demo Project'})

# Get the project
r = requests.get(url, auth=creds)
print(r.status_code)
print(json.dumps(r.json(), indent=4))
```

Pretty simple, right? Take a look at the next tutorial, "Tutorial 003: Model 
Management", to start working with elements, the core piece of MBEE.
