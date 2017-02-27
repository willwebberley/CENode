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

class CardHandler {

  constructor(agent) {
    this.agent = agent;
    this.node = agent.node;
    this.handlers = {

      'ask card': (card) => {
        // Get the relevant information from the node
        const data = this.node.askQuestion(card.content);
        for (const policy of this.node.getInstances('ask policy')) {
          if (policy.enabled === 'true' && policy.target && policy.target.name) {
            const targetName = policy.target.name;
            if (!(targetName in this.agent.policyHandler.unsentAskCards)) { this.agent.policyHandler.unsentAskCards[targetName] = []; }
            this.agent.policyHandler.unsentAskCards[targetName].push(card);
          }
        }

        if (card.is_from) {
          // Prepare the response 'tell card' and add this back to the node
          let urls;
          let c;
          if (data.data) {
            urls = data.data.match(/(https?:\/\/[a-zA-Z0-9./\-+_&=?!%]*)/gi);
            c = `there is a ${data.type} card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${data.data.replace(/'/g, "\\'")}' as content`;
          } else {
            c = `there is a gist card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has 'Sorry; your question was not understood.' as content`;
          }

          for (const from of card.is_froms) {
            c += ` and is to the ${from.type.name} '${from.name}'`;
          }
          if (urls) {
            for (const url of urls) {
              c += ` and has '${url}' as linked content`;
            }
          }
          c += ` and is in reply to the card '${card.name}'`;
          return this.node.addSentence(c);
        }
        return null;
      },

      'tell card': (card) => {
        // Add the CE sentence to the node
        const data = this.node.addCE(card.content, card.is_from && card.is_from.name);

        if (!data.success && card.is_from) {
          // If unsuccessful, write an error back
          return this.node.addSentence(`there is a gist card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and is to the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has 'Sorry. Your input was not understood.' as content and is in reply to the card '${card.name}'.`);
        }

        if (data.success === true) {
          // Add sentence to any active tell policy queues
          for (const policy of this.node.getInstances('tell policy')) {
            if (policy.enabled === 'true' && policy.target && policy.target.name) {
              const targetName = policy.target.name;
              if (!(targetName in this.agent.policyHandler.unsentTellCards)) { this.agent.policyHandler.unsentTellCards[targetName] = []; }
              this.agent.policyHandler.unsentTellCards[targetName].push(card);
            }
          }
        }

        if (card.is_from) {
          // Check feedback policies to see if input 'tell card' requires a response
          for (const policy of this.node.getInstances('feedback policy')) {
            if (policy.enabled === 'true' && policy.target && policy.target.name) {
              const ack = policy.acknowledgement;
              if (policy.target.name.toLowerCase() === card.is_from.name.toLowerCase()) {
                let c;
                if (ack === 'basic') { c = 'OK.'; } else if (data.type === 'tell') {
                  c = `OK. I added this to my knowledge base: ${data.data}`;
                } else if (data.type === 'ask' || data.type === 'confirm' || data.type === 'gist') {
                  c = data.data;
                }
                return this.node.addSentence(`there is a ${data.type} card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and is to the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${c.replace(/'/g, "\\'")}' as content and is in reply to the card '${card.name}'.`);
              }
            }
          }
        }
        return null;
      },

      'nl card': (card) => {
        let data = this.node.addCE(card.content, card.is_from && card.is_from.name);
        // If valid CE, then replicate the nl card as a tell card ('autoconfirm')
        if (data.success) {
          return this.node.addSentence(`there is a tell card named 'msg_{uid}' that is from the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and is to the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${card.content.replace(/'/g, "\\'")}' as content.`);
        }
        data = this.node.askQuestion(card.content);
        // If question was success replicate as ask card ('autoask')
        if (data.success) {
          return this.node.addSentence(`there is an ask card named 'msg_{uid}' that is from the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and is to the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${card.content.replace(/'/g, "\\'")}' as content.`);
        }
        // If question not understood then place the response to the NL card in a new response
        data = this.node.addNL(card.content);
        return this.node.addSentence(`there is a ${data.type} card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and is to the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${data.data.replace(/'/g, "\\'")}' as content and is in reply to the card '${card.name}'.`);
      },
    };
  }

  handle(card) {
    if (card.type.name in this.handlers && card.is_tos && card.content && this.agent.handledCards.indexOf(card.name) === -1) {
      // Determine whether or not to read or ignore this card:
      for (const to of card.is_tos) {
        if (to.name.toLowerCase() === this.agent.name.toLowerCase()) {
          this.handlers[card.type.name](card);
          this.agent.handledCards.push(card.name);
          break;
        }
      }
    }
  }
}

module.exports = CardHandler;
