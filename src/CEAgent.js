const CardHandler = require('./CardHandler.js');
const PolicyHandler = require('./PolicyHandler.js');

const DEFAULT_NAME = 'Moira';

class CEAgent {

  constructor(node) {
    if (!node) {
      throw new Error('CEAgents must be instantiated with a CENode object');
    }
    this.node = node;
    this.handledCards = [];
    this.cardHandler = new CardHandler(this);
    this.policyHandler = new PolicyHandler(this);
    this.setName(DEFAULT_NAME);
    this.pollCards();
    this.enactPolicies();
  }

  setName(name) {
    this.name = name;
    this.node.addSentence(`there is an agent named ${name}`);
  }

  getInstance() {
    const instances = this.node.getInstances('agent');
    for (let i = 0; i < instances.length; i += 1) {
      if (instances[i].name.toLowerCase() === name.toLowerCase()) {
        return instances[i];
      }
    }
    return null;
  }

  pollCards() {
    if (setTimeout) {
      setTimeout(() => {
        const cards = this.node.getInstances('card', true);
        for (const card of cards) {
          this.cardHandler.handle(card);
        }
        this.pollCards();
      }, 500);
    }
  }

  enactPolicies() {
    if (setTimeout) {
      setTimeout(() => {
        const policies = this.node.getInstances('policy', true);
        for (const policy of policies) {
          this.policyHandler.handle(policy);
        }
        this.enactPolicies();
      }, 5000);
    }
  }
}

module.exports = CEAgent;
