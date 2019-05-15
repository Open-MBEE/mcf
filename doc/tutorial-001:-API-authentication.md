## Tutorial: API Authentication and Pulling Data

Let's begin by demonstrating a simple API-based integration. One convenient 
thing about interacting with MBEE via the RESTful API is that the integration
can be written in any language. In this tutorial, we'll use Python.

We start by creating a file called `main.py` and adding the initial boilerplate
code we need to get started:

```python
import requests
server = 'http://localhost:9080'
``` 

In the above code snippet, we import the *requests* module which we will use to
make requests to the API and we define a variable called *server* which tells
our program how to connect to MBEE. The *requests* module can be installed with 
pip, Python's package manager, by running `pip install requests` in a terminal.

Next, we can make a call (e.g. a GET request) to the `/api/test` route to make
sure we can successfully communicate with the MBEE server.

```python
# Test connection to server
url = '{}/api/test'.format(server) # the url we want to request
r = requests.get(url)              # make a GET request to url
print(r.status_code)               # print the HTTP response code        
```

If MBEE is up and running and the application is able to communicate with it,
the program should print out `200`, indicating that a request was made to the
API endpoint `/api/test` and the server responded with an HTTP 200 status 
(e.g. OK).

If the program does not print a 200 status code and instead throws an error, this is likely
because your new integration cannot talk to the server. Confirm that the server
is up and running and you are able to talk to it from your machine.

Now we can log into MBEE by making a POST request to the `/api/login` route
and passing our user credentials as a basic authentication header.

```python
# Login to the server
url = '{}/api/login'.format(server)       # the url we want to request
auth_header = ('admin', 'Admin12345!')    # the basic auth header
r = requests.post(url, auth=auth_header)  # make a GET request to url
res = r.json()                            # parse the JSON response
print(r.status_code)                      # print the HTTP response code
print(res)                                # print the HTTP response body
token = res['token']                      # store the auth token for later
```

If all goes well (i.e. your credentials are valid), another 200 response should
be printed to the console along with the response body, which includes an
authentication token. This token can be used in subsequent requests rather than
passing specific user credentials to each request.

> NOTE: Both basic authentication and token authentication are valid for future 
> requests, but using tokens has a few benefits. First, tokens expire and are, 
> therefore, safer to pass around because a compromised token can be revoked and
> will only be valid for a limited amount of time. The other reason to use
> tokens is that they can perform better than basic auth in some configurations.
> For example, if an external authentication service is used such as Active 
> Directory with LDAP, basic authentication requires a request to the AD server
> to be made to validate user credentials. Tokens can be validated without 
> taking the time for that additional request.

Now that we've authenticated with MBEE, we can make a request to the server
to retrieve the MBEE version information. In this case, we will use our token
to authenticate this request.

```python
# Check version
url = '{}/api/version'.format(server)
auth_header = {'Authorization': 'Bearer {}'.format(token)}
r = requests.get(url, headers=auth_header)
res = r.json()
print(r.status_code)
print(res)
```

Similar to our previous requests, we make a request to the `/api/version` route.
In this case, we parse the JSON response and print the response status code and
the response body to the console. You should see the `200` status indicating 
that everything is okay and a body that includes MBEE version information.

Now, let's clean up our code to create a simple program that interfaces with 
MBEE to simply retrieve and print the MBEE version information. Your code
should look something like this:

```python
#!/usr/bin/env python
import requests
server = 'http://localhost:9080'

# Test to make sure we can connect to the server
url = '{}/api/test'.format(server)
r = requests.get(url)

# Login to the server
url = '{}/api/login'.format(server)
r = requests.post(url, auth=('admin', 'Admin12345!'))
res = r.json()
token = res['token']

# Check version
url = '{}/api/version'.format(server)
auth_header = {'Authorization': 'Bearer {}'.format(token)}
r = requests.get(url, headers=auth_header)
res = r.json()
print(res['version'])
```

The above program removes most of the print statements that were used throughout
this walk-through, and includes a single print statement on the last line to
print the MBEE version.

That's it, you've written your first integration with MBEE! The following 
tutorial will walk through creating an organization and project.

