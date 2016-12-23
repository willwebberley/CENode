# CENode 

A pure JavaScript implementation of the ITA project's CEStore - called CENode. CENode is able to understand the basic sentence types parsed by the CEStore, such as conceptualising and instance creation and modification.

Please visit the project's [home page](http://cenode.io) for more information and for documentation.

See also the [Getting Started Tutorial](https://github.com/flyingsparx/CENode/blob/master/docs/getting_started.md).

## Installation and use

CENode can be imported into your Node apps or run in a browser.

### Building for a browser

First install the necessary dev dependencies.
```
npm install
```

Build the library for use in a browser.
```
npm run build-web
```

A file `cenode.js` (along with `cenode.min.js` and `cenode.js.map`) will be generated in the `dist/` directory.

Include whichever file (standard or minified) suits your needs best in your webapp markup.
```html
...
<script src="cenode.min.js"></script>
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

From here, use the documentation to learn more.

### Importing into your Node app

CENode doesn't need to be built or processed to be included in your Node app. Simply `require` the library from the `src` directory.

```javascript
const node = require('./path/to/CENode/src/CENode.js');
```

## Running as a server

A small and simple webserver is also included for submitting and retrieving CE cards over HTTP. Run the webserver using Node.

```bash
$ /path/to/CENode/src/CEServer.js
```

Please see the documentation for information on how to configure the server.

## API reference

Please see the file `docs/API.md` for more information.

## Motivation

Please see the file `docs/documentation.pdf` for an overview of the CE language, CECard protocol, and CENode motivation and behaviour.

## License

CENode is released under the Apache License v2. See `LICENSE` for further information.
