## Tutorial: Model Management

Now that we have an organization and a project, we can begin creating a model.
To begin, let's briefly introduce some of MBEE's data model. 

By default, a project has a single root element with an ID of `model`.

Before we start coding, let's begin with the same boilerplate code as the 
previous tutorials:

```python
import requests
server = 'http://localhost:9080'
creds = ('admin', 'CHANGE_ME')
```

We can POST additional packages to our model using the following code:

```python
# Create some top-level packages
url_template = '{}/api/orgs/demo/projects/demo-project/branches/master/elements/{}'
packages = [
    {'id': 'pkg-a', 'name': 'parent': 'model'},
    {'id': 'pkg-b', 'name': 'parent': 'model'},
    {'id': 'pkg-c', 'name': 'parent': 'model'}
]
for pkg in packages:
    url = url_template.format(server, pkg['id'])
    r = requests.post(url, auth=creds, json=pkg)
    print r.status_code
    print r.text
```

The above code defines a list of packages to create, then loops over that list
to create each package.

Similarly we can do this for other types of elements. The only requirement is
that we specify any data required by those elements (i.e. supply a source and
target for relationships). The following piece of code shows adding several more
elements:

```python
packages = [
    {
        "id": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "parent": "pkg-a", 
        "name": "Element 01"
    }, 
    {
        "id": "5c5c5830-15f5-4a72-89b5-1f41f96661bc", 
        "parent": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "name": "Element 02"
    }, 
    {
        "id": "f435ea64-548d-4984-b051-a21ef6e2e215", 
        "parent": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "name": "Element 03"
    }, 
    {
        "target": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "parent": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "source": "5c5c5830-15f5-4a72-89b5-1f41f96661bc",  
        "id": "fec8d562-7908-47da-b6b8-b8ed314ef29c", 
        "name": "Element 04"
    }, 
    {
        "id": "b8820faa-3500-4d76-964c-73dac14230ac", 
        "parent": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "name": "Element 05"
    }, 
    {
        "target": "f435ea64-548d-4984-b051-a21ef6e2e215", 
        "parent": "530faa5d-1cdf-436b-8bc1-d13cc0540a0d", 
        "source": "5c5c5830-15f5-4a72-89b5-1f41f96661bc", 
        "id": "6cdf9a82-eb00-4bcf-9f2f-327fea49cebe", 
        "name": "Element 06"
    }
]

for pkg in packages:
    url = url_template.format(server, pkg['id'])
    r = requests.post(url, auth=creds, json=pkg)
    print r.status_code
    print r.text
```

Model elements can be deleted by making an HTTP DELETE request to the 
`/api/orgs/:orgid/projects/:projectid/branches/:branchid/elements/:elementid` route. An example of
this in Python is as follows:

```python
url = '{}/api/orgs/demo/projects/demo-project/branches/master/elements/pkg-a'.format(server);
r = requests.delete(url, auth=creds)
print r.status_code
print r.text
```

Note that model elements are soft-deleted by default. This means they are not
truly removed from the database and can be recovered if needed. MBEE admins, 
however, have the option to pass the option `"hardDelete": true` in the request
body to permanently delete elements.

This tutorial introduced some of the basics of model model management showing 
how to create, retrieve, and delete model elements. 
