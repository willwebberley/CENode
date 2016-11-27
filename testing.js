const CENode = require('./cenode.js');
const models = require('./cemodels.js');

const node = new CENode(models.CORE);
node.add_sentence('there is an entity named \'harold\'');
node.add_sentence("there is a tell card named 'df' that is to the agent 'Moira' and has 'conceptualise a ~ thingy ~ T that is an entity' as content and is from the agent 'macbook'")
setTimeout(() => {
  console.log(node.concepts.thingy)
}, 1000)
