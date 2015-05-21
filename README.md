# Pure JavaScript CENode Implementation

A pure JavScript implementation of the ITA project's CEStore - called CENode. CENode is able to understand the basic sentence types parsed by the CEStore, such as conceptualising and instance creation.

## Blackboard architecture

As with the CEStore, CENode supports the blackboard architecture. Concepts such as `card` and `tell card` are included in CENode's core model, and instances of these nodes automatically spin up an agent to read and write to the store, as necessary, using such cards. In these scenarios, only cards addressed to the Node's agent (default is named 'Moira') will be examined for updating the node. This means that a node can act as a router of messages for other nodes to read and add to. A node's agent's name can easily be changed by using the `set_agent_name()` method, as described below.

## Models

The current version of the CENode includes models that might be useful for instantiating nodes for different purposes. When the `cenode` library is included or imported into an application, exposed is a `MODELS` object. The core model (`MODELS.CORE`) is nearly always required, since this provides support for the blackboard architecture and allows question-asking (see later), but additional models can easily be chained too (such as `MODELS.SHERLOCK`).

Models are simply lists of CE that are parsable by the CENode, and thus the ordering of loaded models is important.

The node's `get_sentences()` method can be used for returning all of the sentences required to return the node to its current state, and can therefore be taken and stored to be used to instantiate future nodes. For example:

```javascript
var node = new CENode(MODELS.CORE);
... // Updates to the node

var sentences = node.get_sentences();
store_model(sentences); // Store the model for later use

... // Some time later 
var custom_model = load_model();
var node2 = new CENode(custom_model);
```

## Installation and usage

Simply include the file `cenode.js` as you normally would in your HTML file of JavaScript program.

## CENode API

### `CENode CENode([model1 [, model2 [, model3 ...]]])`
Instantiate a new CENode with any number of models. Generally, the CORE model is always required, but you may also want extra features. For example, for Sherlock experiments, a typical instantiation may look like this:

```javascript
var node = new CENode(MODELS.CORE, MODELS.SHERLOCK);
```

### `String guess_next(String input)`
Return a guess of the next CE phrase given an input string. Useful for autocompletion.

_Note that this feature is still under development._

### `instance[] get_instances([String concept_type [, Bool recurse]])`
Return a list of instances.

* If `concept_type` is specified, only instances directly of this concept type are returned.
* If `recurse` is specified (and `true`), then all instances of the concept's child, grandchild, etc., concepts are returned.

### `String[] get_sentences()`
Return a list of CE sentences that have been used to update the store. The result of this method can then be used later to instantiate future stores.

### `String add_sentence(String sentence)`
Add a CE sentence to the node's conceptual model. As long as `sentence` is valid CE (and understandable by the node), this will immediately update the node's model. The returned string is `null` in most cases, but will contain a response if `sentence` is a question understandable by the node (see below).

#### Example blackboard architecture

If `sentence` wraps additional CE (e.g. as a `tell card`), then only the outer wrapping of CE will be parsed and used for updating. For example, consider the following sentence:

```javascript
node.add_sentence("there is a tell card named 'msg1' that is to the agent 'Moira' and has 'there is a person named \'Fred\'' as content.");
```

In this scenario (as long as the `CORE` model has been loaded), the node will create a new instance of `tell card` with the content `there is a person named 'Fred'`, and no new `person` will be instantiated. If the node's agent is named 'Moira', then the agent will (eventually) find this card and see that it is addressed to itself. It will then add the card's content to the node's model, and (as long as `person` is a valid concept) 'Fred' will be added to the model.

If the card is addressed to something other than the node's own agent's name, then no further action will occur, since the agent will ignore the card. The method `get_instances("tell card")` can be used by another agent to see if there are any appropriately-addressed cards to be retrieved.

*Note that the above example is simplified for clarity. `tell card`s also need a timestamp attribute to be properly understood by the agent. For example, `... and has the timestamp '{now}' as timestamp...`, where `{now}` will be replaced by the node by the current system time.*

#### Question-asking

If `sentence` is asking a question understandable by the node, then this method will return a string representing a response reflecting the node's current model state. Currently, the following types of question are supported:

* `who is Prof Plum?`
* `what is N215?`
* `where is Prof Plum?`

The first two questions have identical internal meaning, and both simply return the conceptual type of the instance, if it exists. 

The 'where' question will return all of the known locations of the instance name, where a 'location' is any instance of a concept that is a child, grandchild, etc., of the concept `location`.

### `void set_agent_name(String name)`
Set a new name for the node's agent. Note that when qualifying the address of cards, agents will ignore the case of their name.

### `String get_agent_name()`
Retrieve the node's agent's name.
