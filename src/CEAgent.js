const CardHandler = require('./CardHandler.js');

const POST_SENTENCES_ENDPOINT = '/sentences';
const GET_CARDS_ENDPOINT = '/cards';

/*
 * Utility object to support network tasks.
 */
const net = {
  makeRequest(method, nodeURL, path, data, callback) {
    try {
      if (typeof window !== 'undefined' && window.document) {
        net.makeRequestClient(method, nodeURL, path, data, callback);
      }
    } catch (err) { /* Continue even if network error */ }
  },
  makeRequestClient(method, nodeURL, path, data, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, nodeURL + path);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 302) && callback) {
        callback(xhr.responseText);
      }
    };
    if (data) {
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      xhr.send(data);
    } else {
      xhr.send();
    }
  },
};

class CEAgent {

  constructor(node) {
    if (!node) {
      throw new Error('CEAgents must be instantiated with a CENode object');
    }
    this.name = 'Moira';
    this.lastSuccessfulRequest = 0;
    this.node = node;
    this.unsentTellCards = {};
    this.unsentAskCards = {};
    this.handledCards = [];
    this.cardHandler = new CardHandler(this);
    this.pollCards();
    this.enactPolicies();
  }

  setName(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  getLastSuccessfulRequest() {
    return this.lastSuccessfulRequest;
  }

  pollCards() {
    if (setTimeout) {
      setTimeout(() => {
        const cardList = this.node.getInstances('card', true);
        for (let i = 0; i < cardList.length; i += 1) {
          this.cardHandler.handle(cardList[i]);
        }
        this.pollCards();
      }, 500);
    }
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

  enactPolicies() {
    if (setTimeout) {
      setTimeout(() => {
        try {
          const tellPolicies = this.node.getInstances('tell policy');
          const askPolicies = this.node.getInstances('ask policy');
          const listenPolicies = this.node.getInstances('listen policy');
          const forwardallPolicies = this.node.getInstances('forwardall policy');

          // For each tell policy in place, send all currently-untold cards to each target
          // To save on transit costs, if there are multiple cards to be sent to one target, they are
          // separated by new line (\n)
          for (let i = 0; i < tellPolicies.length; i += 1) {
            const target = tellPolicies[i].target;
            if (target && target.name) {
              const cards = this.unsentTellCards[target.name];
              if (cards) {
                let data = '';
                for (let j = 0; j < cards.length; j += 1) {
                  try {
                    const card = cards[j];
                    const from = card.is_from;
                    const tos = card.is_tos;
                    if (tos && from.name.toLowerCase() !== target.name.toLowerCase()) { // Don't send back a card sent from target agent
                      // Make sure target is not already a recipient
                      let inCard = false;
                      for (let k = 0; k < tos.length; k += 1) {
                        if (tos[k].id === target.id) { inCard = true; break; }
                      }
                      if (!inCard) {
                        card.addRelationship('is to', target);
                      }
                      data += `${card.ce}\n`;
                    }
                  } catch (err) { /* Continue anyway */ }
                }
                if (data !== '') {
                  net.makeRequest('POST', target.address, POST_SENTENCES_ENDPOINT, data, () => {
                    this.lastSuccessfulRequest = new Date().getTime();
                    this.unsentTellCards[target.name] = [];
                  });
                }
              }
            }
          }

          // For each ask policy in place, send all currently-untold cards to each target
          // To save on transit costs, if there are multiple cards to be sent to one target, they are
          // separated by new line (\n)
          for (let i = 0; i < askPolicies.length; i += 1) {
            const target = askPolicies[i].target;
            if (target && target.name) {
              const cards = this.unsentAskCards[target.name];
              if (cards) {
                let data = '';
                for (let j = 0; j < cards.length; j += 1) {
                  try {
                    const card = cards[j];
                    const from = card.is_from;
                    const froms = card.is_froms;
                    const tos = card.is_tos;
                    if (tos && from && from.name.toLowerCase() !== target.name.toLowerCase()) { // Don't send back a card sent from target agent
                      // Make sure target is not already a recipient
                      let inCard = false;
                      for (let k = 0; k < tos.length; k += 1) {
                        if (tos[k].id === target.id) { inCard = true; break; }
                      }
                      if (!inCard) {
                        card.addRelationship('is to', target);
                      }
                      // Make sure an agent is not already a sender
                      inCard = false;
                      for (let k = 0; k < froms.length; k += 1) {
                        if (froms[k].id === this.getInstance().id) { inCard = true; break; }
                      }
                      if (!inCard) {
                        card.addRelationship('is from', this.getInstance());
                      }
                      data += `${card.ce}\n`;
                    }
                  } catch (err) { /* Continue anyway */ }
                }
                if (data !== '') {
                  net.makeRequest('POST', target.address, POST_SENTENCES_ENDPOINT, data, () => {
                    this.lastSuccessfulRequest = new Date().getTime();
                    this.unsentAskCards[target.name] = [];
                  });
                }
              }
            }
          }

          // For each listen policy in place, make a request to get cards addressed to THIS agent, and add to node, ignoring already-seen cards
          for (let i = 0; i < listenPolicies.length; i += 1) {
            const target = listenPolicies[i].target;
            let data = '';
            const allCards = this.node.getInstances('card', true);
            for (let j = 0; j < allCards.length; j += 1) {
              data = `${data + allCards[j].name}\n`;
            }
            net.makeRequest('POST', target.address, `${GET_CARDS_ENDPOINT}?agent=${name}`, data, (resp) => {
              this.lastSuccessfulRequest = new Date().getTime();
              const cards = resp.split('\n');
              this.node.addSentences(cards);
            });
          }

          // If there is one enabled forwardall policy, then forward any cards sent to THIS agent
          // to every other known agent.
          for (let i = 0; i < forwardallPolicies.length; i += 1) {
            const policy = forwardallPolicies[i];
            if (policy.enabled === 'true') {
              const agents = policy.all_agents === 'true' ? this.node.getInstances('agent') : policy.targets;
              const cards = this.node.getInstances('tell card');
              if (policy.start_time) {
                const startTime = policy.start_time.name;
                for (let k = 0; k < cards.length; k += 1) {
                  try {
                    const card = cards[k];
                    let toAgent = false;
                    const tos = card.is_tos;
                    const cardTimestamp = card.timestamp.name;
                    if (tos && parseInt(cardTimestamp, 10) > parseInt(startTime, 10)) {
                      for (let j = 0; j < tos.length; j += 1) {
                        if (tos[j].name === name) { // If card sent to THIS agent
                          toAgent = true;
                          break;
                        }
                      }
                      if (toAgent === true) {
                        const from = card.is_froms[0];

                        // Add each other agent as a recipient (if they aren't already), but not THIS agent or the original author
                        for (let j = 0; j < agents.length; j += 1) {
                          let agentIsRecipient = false;
                          for (let l = 0; l < tos.length; l += 1) {
                            if (tos[l].name.toLowerCase() === agents[j].name.toLowerCase()) {
                              agentIsRecipient = true;
                              break;
                            }
                          }
                          if (!agentIsRecipient && agents[j].name.toLowerCase() !== name.toLowerCase() && agents[j].name.toLowerCase() !== from.name.toLowerCase()) {
                            card.addRelationship('is to', agents[j]);
                          }
                        }
                      }
                    }
                  } catch (err) { /* Continue anyway */ }
                }
              }
              break;
            }
          }
        } catch (err) { /* Continue anyway */ }
        this.enactPolicies();
      }, 5000);
    }
  }
}

module.exports = CEAgent;
