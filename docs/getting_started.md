# Getting started with CENode

This document provides a guide for getting started with developing with the CENode library. 

The [official documentation](http://cenode.io/documentation.pdf) outlines key use-cases and gives an overview of the APIs exposed by the library. 

In this guide, we will use CENode in the setting of a web application. 


## Setting up the environment

Create a new directory in your normal project space and change into it.

```bash
$ mkdir ~/Project/MyCENodeProject
$ cd ~/Project/MyCENodeProject
```

We will put all our code into this directory.

Within the project, create a further directory for your JavaScript files, and create an empty HTML file that will form the base of the webapp:

```bash
$ mkdir js
$ touch index.html
```


## Setting up version control

If you would like to place this project under Git version control, then initialise the repository:
```bash
$ git init
```

To make an initial commit, then first ensure your global git settings have been properly set:
```bash
$ git config --global user.name "My Name"
$ git config --global user.email "myname@mydomain.com"
```

Now you can continue to stage your files and commit them:
```bash
$ git add .
$ git commit -m "Initial commit"
```

If you have a remote repository you'd like to push to, then you'll need to create one and specify this within Git. Checkout [this guide](https://help.github.com/articles/adding-a-remote) on how to do this with GitHub.


## Installing dependencies

The only dependency our app has (unless you later require more) is `cenode.js` itself.

`cenode.js` can be obtained directly from its website.

Downlaod the library from [cenode.io/cenode.js](http://cenode.io/cenode.js). You can use CURL to do this for you:
```bash
$ curl -o js/cenode.jshttp://cenode.io/cenode.js
```

## Building out the app

We will write most of our app logic within a file named `main.js`, so create this:
```bash
$ touch js/main.js
```

Create the skeleton of the app by ediing `index.html`:
#### `index.html`
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My CENode app</title>
  </head>
  <body>
    <h1>My app</h1>
    <script src="js/cenode.js"></script>
    <script src="js/main.js"></script>
  </body>
</html>
```
