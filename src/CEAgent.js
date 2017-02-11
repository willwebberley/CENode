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
    for (const instance of instances) {
      if (instance.name.toLowerCase() === name.toLowerCase()) {
        return instance;
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
