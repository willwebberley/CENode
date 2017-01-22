# CENode 

A pure JavaScript implementation of the ITA project's CEStore - called CENode. CENode is able to understand the basic sentence types parsed by the CEStore, such as conceptualising and instance creation and modification.

Please visit the project's [home page](http://cenode.io) for more information and for documentation.

See also the [Getting Started Tutorial](https://github.com/flyingsparx/CENode/blob/master/docs/getting_started.md).

## Getting started

CENode can be imported into your Node apps or run in a browser. Either way, you will need Node and NPM installed before continuing, so install these for your platform first.

Then add CENode to your project using NPM:
```
npm install
```

If using CENode in a webpage, then include it (and models, if necessary) in script tags:
```html
<script src="/node_modules/cenode/dist/cenode.min.js"></script>
<script src="/node_modules/cenode/dist/models.js"></script> <!-- if required -->

<script>
  const node = new CENode(CEModels.core);
<script>
```

Or, if using in a node app:
```javascript
const CENode = require('cenode');
const CEModels = require('cenode/models');

const node = new CENode(CEModels.core);
```

## Testing

Clone the repository
```
git clone git@github.com:flyingsparx/CENode.git
```

Install the necessary dev dependencies.
```
npm install
```

Run tests.
```
npm test
```

## API reference

Please see the file `docs/API.md` for more information.

## Motivation

Please see the file `docs/documentation.pdf` for an overview of the CE language, CECard protocol, and CENode motivation and behaviour.

## Licence

CENode is released under the Apache Licence v2. See `LICENCE` for further information.
