# CENode 

A pure JavaScript implementation of the ITA project's CEStore - called CENode. CENode is able to understand the basic sentence types parsed by the CEStore, such as conceptualising and instance creation and modification.

Please visit the project's [home page](http://cenode.io) for more information and for documentation.

**We recommend beginners check out the [Getting Started Guide](https://github.com/willwebberley/CENode/wiki/Getting-Started-Guide) before continuing.**

## Getting started

CENode can be imported into your Node apps or run in a browser. Either way, you will need Node and NPM installed before continuing, so install these for your platform first.

Then add CENode to your project using NPM:
```
npm install cenode
```

If using CENode in a webpage, then include it (and models, if necessary) in script tags:
```html
<script src="/node_modules/cenode/dist/cenode.min.js"></script>
<script src="/node_modules/cenode/dist/models.js"></script> <!-- if required -->

<script>
  const node = new CENode(CEModels.core);
</script>
```

Or, if using in a node app:
```javascript
const CENode = require('cenode');
const CEModels = require('cenode/models'); // if requred

const node = new CENode(CEModels.core);
```

See the [Wiki](https://github.com/willwebberley/CENode/wiki) for further guides and the API reference.

## Testing

Clone the repository
```
git clone git@github.com:willwebberley/CENode.git
```

Install the necessary dev dependencies.
```
npm install
```

Run tests.
```
npm test
```

## More Information

See the CENode [Wiki](https://github.com/willwebberley/CENode/wiki) for more information, guides, and the API reference.


## Licence

CENode is released under the Apache Licence v2. See `LICENCE` for further information.
