# Getting started with CENode

This document provides a guide for getting started with developing with the CENode library and assumes a general knowledge of

* The CE (Controlled English) dialect
* The CECard protocol
* CEStore and CENode goals

The [official documentation](http://cenode.io/documentation.pdf) outlines key use-cases and gives an overview of the APIs exposed by the library. 

In this guide, we will use CENode in the setting of a web application that will allow a user to conduct a simple conversation with a local agent. 


## Setting up the environment

Create a new directory in your normal project space and change into it.

```bash
$ mkdir ~/Project/MyCENodeProject
$ cd ~/Project/MyCENodeProject
```

We will put all our code into this directory.

Within the project, create a further directory for your JavaScript files, and create an empty HTML file that will form the base of the webapp:

```bash
$ mkdir js
$ touch index.html
```


## Setting up version control

If you would like to place this project under Git version control, then initialise the repository:
```bash
$ git init
```

To make an initial commit, then first ensure your global Git settings have been properly set:
```bash
$ git config --global user.name "My Name"
$ git config --global user.email "myname@mydomain.com"
```

Now you can continue to stage your files and commit them:
```bash
$ git add .
$ git commit -m "Initial commit"
```

If you have a remote repository you'd like to push to, then you'll need to create one and specify this within Git. Checkout [this guide](https://help.github.com/articles/adding-a-remote) on how to do this with GitHub.


## Installing dependencies

The only dependency our app has (unless you later require more) is `cenode.js` itself.

`cenode.js` can be obtained directly from its website.

Downlaod the library from [cenode.io/cenode.js](http://cenode.io/cenode.js). You can use CURL to do this for you:
```bash
$ curl -o js/cenode.js http://cenode.io/cenode.js
```

## Building out the app

We will write most of our app logic within a file named `main.js`, so create this:
```bash
$ touch js/main.js
```

Create the skeleton of the app by ediing `index.html`:
#### `index.html`
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My CENode app</title>
  </head>
  <body>
    <h1>My app</h1>
    <script src="js/cenode.js"></script>
    <script src="js/main.js"></script>
  </body>
</html>
```

If you open this page in a web browser, you'll see a plain page aside from the heading and the title.

You can now start to write some code that uses the `cenode.js` library. Start by initialising the library with some core dataand setting the agent name:

#### `main.js`
```javascript
var node = new CENode(MODELS.CORE);
node.set_agent_name('agent1');
```

This code creates an instance of CENode, which in turn spins up a CEAgent, which continuously runs in the background and is able to respond to certain events, as we'll cover later.

### CENode models

Notice that we have passed a variable `MODELS.CORE` to the constructor. This model allows the CENode to initialise itself with any key concepts and instances that are required, and means you don't need to manually enter sentences in one at a time in order to achieve the same thing.

These types of models are actually very simple, and are simply a JavaScript array of CE sentences that are fed in _in order_ to the node. You might decide to create your own model for a particular domain that allows the node to have some basic knowledge of the domain's 'world' before you even start working with it.

If, for example, you are using CENode to maintain knowledge about space, you might create your own model:
```javascript
var my_model = [
    "conceptualise a ~ celestial body ~ C",
    "conetptualise the ~ celestial body ~ C ~ orbits ~ the celestial body D and ~ is orbited by ~ the celestial body E",
    "conceptualise a ~ planet ~ P that is a celestial body",
    "conceptualise a ~ moon ~ M that is a celestial body",
    "conceptualise a ~ star ~ S that is a celestial body",
    "there is a rule named 'r1' that has 'if the celestial body C ~ orbits ~ the celestial body D then the celestial body D ~ is orbited by ~ the celestial body C' as instruction",
    "there is a rule named 'r2' that has 'if the celestial body C ~ is orbited by ~ the celestial body D then the celestial body D ~ orbits ~ the celestial body C' as instruction",
    "there is a star named 'sun'",
    "there is a planet named Earth that orbits the star 'sun'",
    "there is a moon named 'the moon' that orbits the planet Earth"
];
```

Any number of models can be passed to CENode when initialised, e.g.:
```javascript
var node = new CENode(MODELS.CORE, my_model);
```

_(We pass the core model before the custom one, because the `rule` concept is created by the former. If we didn't do this, then the rules we created in our custom model would be ignored. The core model also adds support for CECards, which we'll need to use later.)_

### Building the messaging interface

To support the conversation between the human and the agent, we need to build three things; 

* A means for inputting sentences
* A means for displaying messages from the agent
* Code to wire up the interface to the agent

To start, let's build a basic interface by adding some standard HTML components to `index.html`'s `<body>`:
#### `index.html`
```html
    <textarea id="input"></textarea>
    <button id="send">Send message</button>
    <ul id="messages"></ul>
```
You may like to style these elements, but that will not be covered in this guide.

Next, we need to respond to clicks of the button. After the button is pressed, we need to wrap the input message into a CECard addressed to the local agent. The card also needs to declare who it is from, so the agent can respond, if necessary. Let's first declare a variable we'll set to hold our own name in, and then a function that is called when the button is pressed.

Place this code in `main.js` after the node has been initialised and the agent name has been set. We will declare our own name, grab references to the key DOM elements we'll need to later interact with, and also create a function that responds to button presses.
#### `main.js`
```javascript
var my_name = 'User';

var input = document.getElementById('input');
var button = document.getElementById('send');
var messages = document.getElementById('messages');

button.onclick = function(){
    var message = input.value;
    input.value = ''; // blank the input field for new messages
    var card = "there is a nl card named '{uid}' that is to the agent 'agent1' and is from the individual '"+my_name+"' and has the timestamp '{now}' as timestamp and has '"+message.replace(/'/g, "\\'")+"' as content.";
    node.add_sentence(card);

    // Finally, prepend our message to the list of messages:
    var item = '<li>'+message+'</li>';
    messages.innerHTML = item + messages.innerHTML;
};
```

_(Note: we have used special character sequences `{uid}` and `{now}` to help us construct the card. CENode will complete these fields for you by generating a unique name for the card and by calculating the timestamp automatically.)_

In this code, we take the input message the user created, wrap it in a CECard (of type `nl card` since we can't guarantee the user's entry will be pure CE), and then add it to the node.

The local agent will soon find this card and, since it is the addressee, open it to parse the contents. If the content is valid CE, the agent will update the CEStore with the new knowledge.

Now that we are able to input messages to the node, we will need to be able to retrieve any responses. By default, the agent will not give very verbose responses to input unless we tell it to. We can write a policy that tells the agent to tell us more information or a more detailed response to our inputs (which may be questions). 

To do so, add the following sentence to a custom model passed to the node during initialisation:
```javascript
var my_model = [
    ... 
    "there is a feedback policy named p1 that has 'true' as enabled and has the individual '"+my_name+"' as target and has 'full' as acknowledgement"
    ...
];
```

CEAgents work entirely asynchronously to the rest of the app and the CENode KB itself, and we don't want to block the app whilst we wait for a response. Therefore, we need to write a method that continuously polls the CENode for any cards that the CEAgent may have written back to us.

Let's write a function, below the rest of the code in `main.js` that continually runs, checking for new cards:
#### `main.js`
```javascript
var processed_cards = []; // A list of cards we've already seen and don't need to process again

function poll_cards(){
    setTimeout(function(){
        var cards = node.get_instances('card', true); // Recursively get any cards the agent knows about
        for(var i = 0; i < cards.length; i++){
            var card = cards[i];
            var to = node.get_instance_relationship(card, 'is to'); // Get the addressee of the card
            if(to.name == my_name && processed_cards.indexOf(card.name) == -1){ // If sent to us and is still yet unseen
                processed_cards.push(card.name); // Add this card to the list of 'seen' cards
                var item = '<li>'+card.content+'</li>';
                messages.innerHTML = item + messages.innerHTML; // Prepend this new message to our list in the DOM
            }
        }
        poll_cards(); // Restart the method again
    }, 1000);
}
```

The above function will call itself every 1000 milliseconds (1 second). We need to add one more line to the bottom of the `main.js` script that makes sure the `poll_cards()` repeating function is called when the app starts:

#### `main.js`
```javascript
poll_cards();
```

And that's it - we have a very basic app using CENode to support a simple conversation between a human and the machine. Refresh the page in your browser and you should be ready to start talking.


## Taking it further

Clearly this is a very basic app that supports simple chat functionality. We haven't added any support for confirming CE that the agent has guessed from our NL inputs (although valid CE will be autoconfirmed by the agent).

Also, the CENode has a 'autocomplete' feature that will try to guess the next word/phrase in the sentence based on your current input. Read the docs to check out the `guess_next()` function for this and try to find a way to include it in the code.
