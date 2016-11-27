const CENode = require('./cenode.js');
const models = require('./cemodels.js');

const node = new CENode(models.CORE);
node.add_sentence('there is an entity named \'harold\'');
console.log(node.instances.harold)
