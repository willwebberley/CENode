# CENode API Documentation

This document outlines the APIs provided by the CENode library when used programmatically and as a web service.

## Programmatic API

The programmatic API is accessed through `CENode`, `CEAgent`, `CEConcept`, and `CEInstance` classes. A standard CENode application would usually use one `CENode` object, which would be maintained by a single `CEAgent` object, and would provide references to any number of `CEConcept` and `CEInstance` objects.

An application using the library would never instantiate a non-`CENode` CENode object, as this class is itself responsible for generating objects on your behalf.

### `CENode` class

#### `CENode CENode([model1[, model2[, model3 ...]]])`
Construct a new `CENode` object. This is the only class of the library one should directly instantiate.

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

The optional dryrun argument is a boolean that will still evaluate the input and return the same values, but will not actually update the KB. This might be useful for detecting if an input is considered to be valid CE before carrying out an insertion.

### `ask_question(input)`
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

#### Helpers

CENode instances come with a set of properties that help make writing applications a little quicker and more consise.

##### `instances` 
Directly access the CEInstance representing an instance known by the node. When accessing, use the instance's lower-cased name using underscores instead of spaces. Examples:

* `node.instances.mrs_smith` - gives the CEInstance of Mrs Smith
* `node.instances.moira.name` - gives the string 'Moira' (probably)

#### `concepts`
Directly access the CEConcept representing a concept known by the node. Access in a similar way to instances:

* `node.concepts.ce_card` - gives the CEConcept representing the 'ce card' concept
* `node.concepts.card.name` - gives the string 'card'



