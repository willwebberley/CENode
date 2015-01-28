# Pure JavaScript CEStore Implementation

## Preamble
This library provides methods to support a 'lite' version of the IBM/ITA Controlled English data store and interpretation engine. The current version understands and is able to parse a subset of the full CE grammar and update its internal model appropriately. It is currently only in a proof-of-concept phase, where new parts of the grammar can easily be dropped out over time.

The store is not persisted at all currently, so any page-refreshes will reset the store to its default concepts and instances. There are plans to persist the store to local storage. However, since the implementation is designed to work on the server as well as the browser, this will need to be considered further.

## Implementation Details 
The store works through the same blackboard architecture as the original version, and all communication between agents (machine or human) is done through cards. The store receives cards, which are parsed and stored in memory as instances (or child instances) of `card`. Therefore, the `card` concept exists as a default concept. Methods are exposed for receiving cards and querying of instances.

Moira is a machine agent that is launched when the store is initialised. Any cards sent to Moira are periodically picked up and parsed. Moira is able to manipulate data in the store directly, so updates to the store should be done by sending cards to this agent.

Currently, the following sentence types are understood:
* Concept creation (e.g. `conceptualise a person`)
* Synonym declaration (e.g. `the entity concept person can be expressed by 'human'`)
* Instance creation (e.g.`there is a person named 'Henry'`)

Caveats:
* Only single-word concepts and instances are understood

## CEStore API
The following methods are exposed by the API.

### `String guess_next(String input)`
Return a guess of the next CE phrase given an input string. Useful for autocompletion.

### `instance[] get_instances(String* concept_type)`
Return a list of instances. If `concept_type` is specified, only instances directly of this concept type are returned.

### `concept[] get_concepts()`
Return a list of known concepts.

### `String[] get_sentences()`
Return a list of sentences (cards) received by the store.

### `void receive_card(String sentence)`
Use to add a new card sentence to the store.

## Example usage
Include the file `cestore.js` in the normal way (in your HTML file or Node application).

### Initialise the store
`var store = new CEStore();`

### Send new sentences to the store
`store.receive_card("there is a tell_card named 'msg_{uid}' that is from the individual 'test_user' and is to the agent 'Moira' and has 'conceptualise a person' as content and has the timestamp '{now}' as timestamp.");`

`store.receive_card("there is a tell_card named 'msg_{uid}' that is from the individual 'test_user' and is to the agent 'Moira' and has 'there is a person named 'Harry'' as content and has the timestamp '{now}' as timestamp.");`

### Query the store
`var people = store.get_instances("person");`
