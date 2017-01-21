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
      else {
        net.makeRequestNode(method, nodeURL, path, data, callback);
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
  makeRequestNode(method, nodeURL, path, data, callback){
    const h = require('http');
    const portMatch = nodeURL.match(/.*:([0-9]*)/);
    let url = nodeURL;
    if (portMatch) {
      url = nodeURL.replace(/:[0-9]*/, '');
    }

    const options = {
      hostname: url,
      path: path,
      port: portMatch ? parseInt(portMatch[1]) : 80,
      method: 'POST'
    };
    if (method === 'POST') {
      const request = require('http').request(options, res => {
        let response = '';
        res.on('data', chunk => response = response + chunk);
        res.on('end', () => {
          if (callback) {
            callback(response);
          }  
        });
      });
      request.on('error', (err) => {/* continue anyway */});
      request.write(data);
      request.end();
    }
  }
};


class PolicyHandler {

  constructor(agent) {
    this.agent = agent;
    this.node = agent.node;
    this.unsentTellCards = [];
    this.unsentAskCards = [];
    this.lastSuccessfulRequest = 0;
    this.handlers = {

      'tell policy': (policy) => {
        // For each tell policy in place, send all currently-untold cards to each target
        // multiple cards to be sent to one target line-separated
        const target = policy.target;
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
      },

      'ask policy': (policy) => {
        // For each ask policy in place send all currently-untold cards to each target
        // multiple cards to be sent to one target are line-separated
        const target = policy.target;
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
                    if (froms[k].id === this.agent.getInstance().id) { inCard = true; break; }
                  }
                  if (!inCard) {
                    card.addRelationship('is from', this.agent.getInstance());
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
      },

      'listen policy': (policy) => {
        // For each listen policy in place, make a request to get cards addressed to THIS agent, and add to node, ignoring already-seen cards
        const target = policy.target;
        let data = '';
        const allCards = this.node.getInstances('card', true);
        for (let j = 0; j < allCards.length; j += 1) {
          data = `${data + allCards[j].name}\n`;
        }
        net.makeRequest('POST', target.address, `${GET_CARDS_ENDPOINT}?agent=${this.agent.name}`, data, (resp) => {
          this.lastSuccessfulRequest = new Date().getTime();
          const cards = resp.split('\n');
          this.node.addSentences(cards);
        });
      },

      'forwardall policy': (policy) => {
         // Forward any cards sent to THIS agent to every other known agent
        if (policy.enabled === 'true') {
          const agents = policy.all_agents === 'true' ? this.node.getInstances('agent') : policy.targets;
          const cards = this.node.getInstances('tell card');
          if (policy.start_time) {
            const startTime = policy.start_time;
            for (const card of cards) {
              let toAgent = false;
              const tos = card.is_tos;
              const from = card.is_froms[0];
              const cardTimestamp = card.timestamp.name;
              if (tos && parseInt(cardTimestamp, 10) > parseInt(startTime, 10)) {
                for (const to of tos) {
                  if (to.name === this.agent.name) { // If card sent to THIS agent
                    toAgent = true;
                    break;
                  }
                }
                if (toAgent) {
                  // Add each other agent as a recipient (if they aren't already)
                  for (const agent of agents) {
                    let agentIsRecipient = false;
                    for (const to of tos) {
                      if (to.name.toLowerCase() === agent.name.toLowerCase()) {
                        agentIsRecipient = true;
                        break;
                      }
                    }
                    if (!agentIsRecipient && agent.name.toLowerCase() !== this.agent.name.toLowerCase() && agent.name.toLowerCase() !== from.name.toLowerCase()) {
                      card.addRelationship('is to', agent);
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  handle(policy) {
    this.handlers[policy.type.name](policy);
  }
}

module.exports = PolicyHandler;
