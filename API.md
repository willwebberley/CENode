# CENode API Documentation

This document outlines the APIs provided by the CENode library when used programmatically and as a web service.

## Programmatic API

The programmatic API is accessed through `CENode`, `CEAgent`, `CEConcept`, and `CEInstance` classes. A standard CENode application would usually use one `CENode` object, which would be maintained by a single `CEAgent` object, and would provide references to any number of `CEConcept` and `CEInstance` objects.

An application using the library would never instantiate a non-`CENode` CENode object, as this class is itself responsible for generating objects on your behalf.

### `CENode` class

#### Constructor `CENode CENode([model1[, model2[, model3 ...]]])`
Construct a new `CENode` object. This is the only class of the library one should directly instantiate.

Constructing this object starts the lifecycle of a CEAgent, whose name is, by default, set to 'Moira'.

Any number of models (string arrays) can be passed upon instantiation in order to pre-populate the node's KB. See the documentation for more details.

#### Function `[CEInstance] get_instances([concept_type, [recurse]])`
Retrieve instances from the node. 
