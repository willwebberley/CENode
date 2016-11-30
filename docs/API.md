# CENode API Documentation

This document outlines the APIs provided by the CENode library when used programmatically and as a web service.

In this document, the term CENode is used to refer to the entire system (comprising of a CENode knowledge base - KB - and a CEAgent). It also may be used to refer to the actual CENode class and objects of this type. However, the distinction should generally be clear.

The node maintains a set of concepts and instances, which are represented respectively by the objects of the CEConcept and CEInstance classes.

## Programmatic API

The programmatic API is accessed through `CENode`, `CEAgent`, `CEConcept`, and `CEInstance` classes. A standard CENode application would usually use one `CENode` object, which would be maintained by a single `CEAgent` object, and would provide references to any number of `CEConcept` and `CEInstance` objects.

An application using the library would never instantiate a non-`CENode` CENode object, as this class is itself responsible for generating objects on your behalf.

### CENode class

Functions and properties of instances of the CENode class.

#### `CENode CENode([model1[, model2[, model3 ...]]])`
Construct a new `CENode` object. This is the only class of the library one should directly instantiate.

`var node = new CENode(model1, model2, ...)`

Constructing this object starts the lifecycle of a CEAgent, whose name is, by default, set to 'Moira'.

Any number of models (string arrays) can be passed upon instantiation in order to pre-populate the node's KB. See the documentation for more details.

#### `[CEInstance] get_instances([concept_type, [recurse]])`
Retrieve an array of CEInstances from the node, representing the instances currently known and maintained by the node's KB.

Optionally specify the concept type (str) to retrieve for, and specify whether you'd like to recurse (bool) to get instances of all children of the specified type.

For example, `get_instances('card', true)` returns all instances of concept 'card' and all descendants of the type 'card'.

When called without any arguments, this function returns all instances known by the node.

#### `[CEConcept] get_concepts()`
Retrieve an array of CEConcepts from the node, representing all of the concepts currently known and maintained by the node's KB.

#### `str guess_next(input)`
Retrieve a string representing an attempt at a guess of what might be next in the input string. 

For example, if the node knows a concept called 'person', then providing an input such as 'there is a pe' might return 'there is a person named '.

#### `add_sentence(input)`
Add a new sentence to be processed by the node. Internally, this function dynamically tries to evaluate the input string in the following order of events. If one stage fails, the function attempts the next:

* Attempt to parse the input string as valid CE. If successful, then this might result in the creation or modification of a concept or instance.
* Attempt to parse the input string as a question.
* Attempt to parse the input string as NL.

Internally, the function uses the function `add_ce()`, `ask_question()`, and `add_nl()` and will return the results from these functions directly. Therefore see documentation on these functions for information on returned data. However, this function will not specify if the evaluation passed or failed, as parsing NL will always return some kind of response.

This function will evaluate `{now}` and `{uid}` placeholders in the input string to be a timestamp and locally-unique instance ID respectively. Typically, these are used in constructing new cards:

`there is an nl card named 'msg_{uid}' that has the timestamp '{now}' as timestamp and is from the user 'Will' and is to the agent 'Moira' and has 'Hello, world' as content.`

#### `add_ce(input[, dryrun])`
Add a CE sentence to the node. This may cause the node to create or modify an instance or a concept, and should be the only method used for inserting information into the KB.

This function returns a standard object containing these fields:

* `success` - a boolean representing whether or not the node's CE-parser thinks the input is valid CE.
* `data` - a string representing the response, if any, from the node. If `success` indicates a failure, this value might provide more insight.
* `result` - where appropriate (e.g. successful), this field will contain the CEConcept or CEInstance that was created or modified as the result of the input CE.

The optional dryrun argument is a boolean that will still evaluate the input and return the same values, but will not actually update the KB. This might be useful for detecting if an input is considered to be valid CE before carrying out an insertion. If the dryrun was successful and a CEConcept or CEInstance would have been created or modified, then a projected object of the relevant type will be returned in `result`.

#### `ask_question(input)`
Queries the node's KB for information about a concept or instance.

This function returns a standard object containing these fields:

* `success` - a boolean representing whether or not the node understood the question.
* `data` - a string representing a response or failure message.

Several forms of question are understood by the node:

* what - ask about a particular instance, concept, or property. Returns all information known about the instance, concept, or property
* who - synonymous to 'what' but nicer for querying people-like instances
* where - ask about the location of a particular instance
* what is on/in/at - ask about what is associated with a particular location

Example questions and responses:

* Who is Mrs Smith? - Mrs Smith is a teacher. Mrs Smith teaches the class 'B2' and has the subject 'Computing' as subject and has '45' as age.
* What is a teacher? - A teacher is a type of person. An instance of teacher teaches a type of class and has a type of subject called subject and has a value called age.
* what is teaches? - 'teaches' describes the relationship between a teacher and a subject (e.g. "the teacher 'TEACHER NAME' teaches the subject 'SUBJECT NAME'").
* Where is Mrs Smith? - Mrs Smith lives in the house 'Number 23'.
* What is in house Number 23? - Mrs Smith lives in the house 'Number 23'.

Asking a question will not update the node's KB.

#### `add_nl(input)`
Add a natural language sentence to be processed by the node. The node's NL-parser will do its best to try and work out what you mean, and will return a response in a familiar format (a standard object with the following fields):

* `data` - If successful, a string representing a valid CE sentence based on the input NL, or an error message if otherwise.

Adding NL will not update the node's KB. However, submitting an NL card containing valid CE will be auto-confirmed by the node's agent.

#### `add_sentences([inputs])`
Add an array of inputs to be processed by the node. This method simply calls `add_sentence()` on each of the inputs, and will return an array of response objects, whose order maps onto the sentences in the input array.

Since `add_sentence()` is used, the inputs can be a mixture of CE, questions, and NL.

#### `load_model([model])`
Add an array of CE inputs to be interpreted by the node. Internally, this calls `add_ce()` on each of the inputs, and returns an array of such responses in the order expressed by the input order.

#### `reset_all()`
Empty the node's KB of all instances and concepts.

#### `instances` 
Directly access the CEInstance representing an instance known by the node. When accessing, use the instance's lower-cased name using underscores instead of spaces. Examples:

* `node.instances.mrs_smith` - gives the CEInstance of Mrs Smith
* `node.instances.moira.name` - gives the string 'Moira' (probably)

#### `concepts`
Directly access the CEConcept representing a concept known by the node. Access in a similar way to instances:

* `node.concepts.ce_card` - gives the CEConcept representing the 'ce card' concept
* `node.concepts.card.name` - gives the string 'card'

#### `agent`
The CEAgent object responsible for maintaining this node.

### CEConcept class

Functions and properties of instances of the CEConcept class. Objects of this class represent concepts maintained by the node.

#### `name`
A string representing the name of the concept.

#### `id`
An internally-used ID to help maintain the KB. Generally this can be ignored by applications using the API.

#### `instances`
An array of CEInstances whose type is of the present CEConcept object.

#### `all_instances`
An array of CEInstances whose type is of the present CEConcept object, and any of the descendants of the concept.

#### `parents`
An array of CEConcepts representing the parents of the concept.

#### `ancestors`
An array of CEConcepts representing all ancestors of the concept (parents, grandparents, etc.).

#### `children`
An array of CEConcepts representing the concepts to whom this concept is a parent.

#### `descendants`
An array of CEConcepts representing all descendants of the concepts (children, grandhildren, etc.).

#### `relationships`
An array of standard objects representing the relationships supported by this concept.

Object is of the form:

* `label` - a string identifier describing the relationship
* `concept` - the CEConcept object the relationship is linked to.

#### `values`
An array of standard objects representing the values supported by this concept.

Object is of the form:

* `label` - a string identifier describing the value
* `concept` - if the value is associated with another concept, this is the CEConcept object representing the relevant concept. Otherwise this is undefined.

#### `synonyms`
An array of strings representing alternative names for this concept. Any of these names can be used when addressing the concept.

#### `ce`
A string representing the CE sentence(s) that would be needed in order to construct the state of the current concept.

#### `gist`
A string representing a more casual description of the concept. This is returned when asking the question: 'what is <concept name>?'.

#### Helpers
Helpers are provided to allow you to access associated CEConcepts through values and relationships. For example, with the card CEConcept, `card.is_to` will give the CEConcept that the 'is to' relationship is associated with (probably a 'person' or 'agent' concept, depending on your implementation).

If you are trying to access a value which is not associated with another CEConcept, then instead the helper will just return the string 'value' to indicate that this value should simply be represented by a string and not an instance of a concept.

### CEInstance class

Functions and properties of instances of the CEInstance class. Objects of this class represent instances in the KB.

#### `name`
The name string of this instance.

#### `id`
An identifier used to internally recognise this instance.

#### `sentences`
An array of CE sentences that have been provided that have affected this instance.

#### `type`
The CEConcept object that this instance is a type of.

#### `relationships`
An array of standard objects representing the relationships to other instances.

Objects are of the form:

* `label` - a string describing the relationship
* `instance` - the CEInstance object this instance relates to.

#### `values`
An array of standard objects representing the values held by this instance.

Objects are of the form:

* `label` - a string describing the value
* `instance` - if the value refers to another instance, then this field holds a reference to that CEInstance. Otherwise this field holds a string.

Examples of this difference can be observed in the core CE model shipped with the library. CEInstances of type 'card' have a value called 'timestamp' that refers to another instance whose name is the actual value of the timestamp. Cards also have a value called 'content', whose value is a literal string.

If you're unsure on what type of value you're dealing with, ask about the parent concept (e.g. 'what is a card?'), and the response will describe the various properties supported by the concept.

#### `property(label[, with_source])`
Return the *most recent* value or relationship that has the label with the name specified. If the property is a relationship, then a CEInstance is returned. If it's a value, then either a CEInstance or a string is returned (see the `values` API documentation for more information).

If `with_source` is defined and `true`, then data will be returned in the format: `{source: SOURCE, instance: DATA}`, where `SOURCE` is the source input of the information (e.g. username), if any, and `DATA` is the returned information when used without the `with_source` flag.

#### `properties(label[, with_source])`
Return an array of CEInstances or strings representing the values or relationships described by the input label.

As with `property()`, passing a `true` value for `with_source` includes the source input of each piece of information returned, with the output format for each list element as described in the notes for the `property()` function.

#### `synonyms`
A list of strings representing alternative names for this instance. Any of these, or the instance's actual name, can be used when addressing this CEInstance.

#### `ce`
A string representing the CE that would be required to generate the instance in its current form.

#### `gist`
A string representing a more casual description of the CEInstance. This is the text returned when asking questions like 'what is <instance name>?' or 'who is <instance name>?'.

#### Helpers
You can also directly access values and relationships as direct properties of the CEInstance object. For example, for a card instance, `card.is_to` gives the same result as calling `card.property('is to')`. This gives you the latest-reported value or relationship with this name.

Similarly, `card.contents` gives the same result as calling `card.properties('content')` - all you do is add an extra 's' at the end to access all of the values or relationships reported with that name.

Note that calling `properties()` and passing a property name that doesn't yet exist for the instance will return an empty array (as expected). However, accessing the information directly (as with `card.is_to`, for example) would return `undefined`, because that property has not yet been defined on the instance.

### CEAgent class

Functions and properties of the CEAgent class. Each CENode instance will usually have at least one agent spawned to help maintain it.

#### `set_name(name)`
Set the name of the agent to the specified name.

#### `get_name()`
Get the name string of the agent.

#### `get_last_successful_request()`
If there are policies in place, this function returns the timestamp representing the time at which the last successful connection to another CENode instance occurred.

Otherwise this returns `0`.

#### `handle_card(card_instance)`
Normally, applications wouldn't need to access this method directly, but it can be useful for asynchronous card-handling.

This function accepts a fully-constructed CEInstance of a subtype of type card. Currently supported card types include 'ce card', 'nl card', and 'ask card'.

Internally, this function uses the `add_ce()`, `ask_question()`, and `add_nl()`, functions of the agent's CENode (depending on the type of card submitted), and returns the content from these functions directly once parsed.

For example, if you submit an ask card with a question in the content, then expect a response consistent with `node.ask_question(question)`.

Note that the agent will ignore the card if it isn't in the recipient list.

## HTTP API

CENode instances can be run as a web service by invoking them directly as a node app:

```bash
$ node cenode.js
```

In these cases, the CEAgent effectively exposes itself to the network and provides HTTP methods to interact with its CENode. Note that the web interface currently only supports minimal interaction with CENode and its components.

### `GET /`
Download a webpage representing a control panel for carrying out simple maintenance on a CENode.

### `GET /reset`
Calls the CENode's `reset_all()` function to empty it of instances and concepts.

### `GET /cards`
Return all cards known by the CENode in line-delimited CE.

### `POST /agent_name`
Send a string representing a new name to assign the agent.

### `POST /sentences`
Send a line-delimited set of sentences to be processed by the node. These use the node's `add_sentence()` method, so each sentence can be a question, CE, or NL. 

The method responds by sending back the data field returned by `add_sentence()` in the same order as the input sentences (such that the data in line 3 of the response corresponds to the input sentence in line 3 of the request body).
