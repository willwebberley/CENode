# CENode 

A pure JavaScript implementation of the ITA project's CEStore - called CENode. CENode is able to understand the basic sentence types parsed by the CEStore, such as conceptualising and instance creation and modification.

Please visit the project's [home page](http://cenode.io) for more information and for documentation.

See also the [Getting Started Tutorial](https://github.com/flyingsparx/CENode/blob/master/docs/getting_started.md).

## Quickstart guide

CENode can be imported into your Node apps or run in a browser. Either way, you will need Node and NPM installed before continuing, so install these for your platform first.

### Building for a browser

First install the necessary dev dependencies.
```
npm install
```

Build the library for use in a browser.
```
npm run build-web
```

A file `cenode.js` (along with `cenode.min.js` and `cenode.js.map`) will be generated in the `dist/` directory. Additionally, CENode's default models (including the CE `core` model) are also produced during the build process.

Include whichever CENode file (standard or minified) suits your needs best in your webapp markup. If you wish, also include the models file which will allow you to later use the `core` model.
```html
...
<script src="cenode.min.js"></script>
<script src="models.js"></script> <!-- If you need it -->
...
```

Once included, the `CENode` variable is exposed.
```html
...
<script>
  var node = new CENode();
</script>
...
```

If you chose to include the default models file too (which is recommended for most applications), then the `core` model - and any other models you need - can be passed to the node during instantiation.
```html
...
<script>
  var node = new CENode(CEModels.core, myCustomModel, ...);
</script>
```

From here, use the documentation to learn more.

### Importing into your Node app

CENode doesn't need to be built or processed to be included in your Node app. Simply `require` the library from the `src` directory.

```javascript
const CENode = require('./path/to/CENode/src/CENode.js');

const node = new CENode();
```

Alternatively, if you want to take advantage of the CE core model, then this can also be imported and included along with any of your own models you may have.
```javascript
const CENode = require('./path/to/CENode/src/CENode.js');
const CEModels = require('./path/to/CENode/models');

const node = new CENode(CEModels.core, myCustomModel, ...);
```

## Running as a server

A small and simple webserver is also included for submitting and retrieving CE cards over HTTP. Run the webserver using Node.

```bash
$ node /path/to/CENode/src/CEServer.js
```

Please see the documentation for information on how to configure and use the server.

## Testing

To run the tests:

```bash
$ npm test
```

## API reference

Please see the file `docs/API.md` for more information.

## Motivation

Please see the file `docs/documentation.pdf` for an overview of the CE language, CECard protocol, and CENode motivation and behaviour.

## Licence

CENode is released under the Apache Licence v2. See `LICENCE` for further information.
