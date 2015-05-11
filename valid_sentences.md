# Valid sentences

Here is a list of all the valid sentence types supported by the CENode.

## Conceptualising new concepts

For all sentences starting with `conceptualise a`.

* `conceptualise a ~ concept name ~ C that is a concept parent`
* `conceptualise a ~ concept name ~ C that has the type1 T as ~ descriptor1 ~ and has the type2 V as ~ descriptor2 ~`

Also supported is a combination of the above. Consider the following example valid sentences.

* `conceptualise a ~ teacher ~ T that is a person`
* `conceptualise a ~ teacher ~ T that has the person P as ~ manager ~ and has the value V as ~ language ~`
* `conceptualise a ~ teacher ~ T that is a human and is a employee and has the value V as ~ language ~ and has the location L as ~ room number ~`

The above examples assume that `person`, `human`, `employee`, and `location` are all pre-defined concepts within the model.

## Modifying existing concepts

For all sentences starting with `conceptualise the`.

In addition to the above sentences, the following is also supported:

* `conceptualise the concept name C ~ label ~ the target T`

Combinations of all of the above are also valid:

* `conceptualise the teacher T ~ teaches ~ the student S and is a human and has the person P as ~ manager ~` 

The above example assumes that `teacher`, `student`, `human`, and `person` are all pre-defined concepts within the model.