/*
 * Copyright 2017 W.M. Webberley & A.D. Preece (Cardiff University)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
'use strict';

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
      } else {
        net.makeRequestNode(method, nodeURL, path, data, callback);
      }
    } catch (err) { /* Continue even if network error */ }
  },
  makeRequestClient(method, nodeURL, path, data, callback) {
    const url = nodeURL.indexOf('http://') === -1 ? `http://${nodeURL}` : nodeURL;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url + path);
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
  makeRequestNode(method, nodeURL, path, data, callback) {
    const portMatch = nodeURL.match(/.*:([0-9]*)/);
    let url = nodeURL;
    if (portMatch) {
      url = nodeURL.replace(/:[0-9]*/, '');
    }

    const options = {
      hostname: url,
      path,
      port: portMatch ? parseInt(portMatch[1], 10) : 80,
      method: 'POST',
    };
    if (method === 'POST') {
      const request = require('http').request(options, (res) => {
        let response = '';
        res.on('data', (chunk) => { response += chunk; });
        res.on('end', () => {
          if (callback) {
            callback(response);
          }
        });
      });
      request.on('error', () => { /* continue anyway */ });
      request.write(data);
      request.end();
    }
  },
};


class PolicyHandler {

  constructor(agent) {
    this.agent = agent;
    this.node = agent.node;
    this.unsentTellCards = {};
    this.unsentAskCards = {};
    this.lastSuccessfulRequest = 0;
    this.handlers = {

      'tell policy': (policy) => {
        // For each tell policy in place, send all currently-untold cards to each target
        // multiple cards to be sent to one target line-separated
        if (policy.target && policy.target.name && policy.target.address) {
          if (!(policy.target.name in this.unsentTellCards)) {
            this.unsentTellCards[policy.target.name] = [];
          }
          let data = '';
          for (const card of this.unsentTellCards[policy.target.name]) {
            if (card.is_tos && card.is_from.name.toLowerCase() !== policy.target.name.toLowerCase()) { // Don't send back a card sent from target agent
              // Make sure target is not already a recipient
              let inCard = false;
              for (const to of card.is_tos) {
                if (to.id === policy.target.id) { inCard = true; break; }
              }
              if (!inCard) {
                card.addRelationship('is to', policy.target);
              }
              data += `${card.ce}\n`;
            }
          }
          if (data.length) {
            net.makeRequest('POST', policy.target.address, POST_SENTENCES_ENDPOINT, data, () => {
              this.lastSuccessfulRequest = new Date().getTime();
              this.unsentTellCards[policy.target.name] = [];
            });
          }
        }
      },

      'ask policy': (policy) => {
        // For each ask policy in place send all currently-untold cards to each target
        // multiple cards to be sent to one target are line-separated
        if (policy.target && policy.target.name) {
          if (!(policy.target.name in this.unsentAskCards)) {
            this.unsentAskCards[policy.target.name] = [];
          }
          let data = '';
          for (const card of this.unsentAskCards[policy.target.name]) {
            const froms = card.is_froms;
            const tos = card.is_tos;
            if (tos && card.is_from && card.is_from.name.toLowerCase() !== policy.target.name.toLowerCase()) { // Don't send back a card sent from target agent
              // Make sure target is not already a recipient
              let inCard = false;
              for (const to of tos) {
                if (to.id === policy.target.id) { inCard = true; break; }
              }
              if (!inCard) {
                card.addRelationship('is to', policy.target);
              }
              // Make sure an agent is not already a sender
              inCard = false;
              for (const from of froms) {
                if (from.id === this.agent.getInstance().id) { inCard = true; break; }
              }
              if (!inCard) {
                card.addRelationship('is from', this.agent.getInstance());
              }
              data += `${card.ce}\n`;
            }
          }
          if (data.length) {
            net.makeRequest('POST', policy.target.address, POST_SENTENCES_ENDPOINT, data, () => {
              this.lastSuccessfulRequest = new Date().getTime();
              this.unsentAskCards[policy.target.name] = [];
            });
          }
        }
      },

      'listen policy': (policy) => {
        // Make request to target to get cards addressed to THIS agent
        if (policy.target && policy.target.address) {
          // Build ignore list of already-processed cards:
          let data = '';
          for (const card of this.node.getInstances('card', true)) {
            data = `${data + card.name}\n`;
          }
          net.makeRequest('POST', policy.target.address, `${GET_CARDS_ENDPOINT}?agent=${this.agent.name}`, data, (res) => {
            this.lastSuccessfulRequest = new Date().getTime();
            this.node.addSentences(res.split('\n'));
          });
        }
      },

      'forwardall policy': (policy) => {
        // Forward any cards sent to THIS agent to every other known agent
        const agents = policy.all_agents === 'true' ? this.node.getInstances('agent') : policy.targets;
        const cards = this.node.getInstances('tell card');
        if (policy.start_time) {
          const startTime = policy.start_time;
          for (const card of cards) {
            if (card.timestamp && card.is_froms.length) {
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
                  for (const agentCheck of agents) {
                    let agentIsRecipient = false;
                    for (const to of tos) {
                      if (to.name.toLowerCase() === agentCheck.name.toLowerCase()) {
                        agentIsRecipient = true;
                        break;
                      }
                    }
                    if (!agentIsRecipient && agentCheck.name.toLowerCase() !== this.agent.name.toLowerCase() && agentCheck.name.toLowerCase() !== from.name.toLowerCase()) {
                      card.addRelationship('is to', agentCheck);
                    }
                  }
                }
              }
            }
          }
        }
      },
    };
  }

  handle(policy) {
    if (policy.enabled === 'true' && policy.type.name in this.handlers) {
      this.handlers[policy.type.name](policy);
    }
  }
}

module.exports = PolicyHandler;
