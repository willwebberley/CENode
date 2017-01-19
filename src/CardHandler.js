class CardHandler {

  constructor(agent) {
    this.agent = agent;
    this.node = agent.node;
    this.handlers = {

      'ask card': (card) => {
        // Get the relevant information from the node
        const data = this.node.askQuestion(card.content);
        const askPolicies = this.node.getInstances('ask policy');
        for (let j = 0; j < askPolicies.length; j += 1) {
          if (askPolicies[j].enabled === 'true') {
            const targetName = askPolicies[j].target.name;
            if (!(targetName in this.agent.unsentAskCards)) { this.agent.unsentAskCards[targetName] = []; }
            this.agent.unsentAskCards[targetName].push(card);
          }
        }
 
        if (card.is_from) {
          // Prepare the response 'tell card' and add this back to the node
          const froms = card.is_froms;
          let urls;
          let c;
          if (data.data) {
            urls = data.data.match(/(https?:\/\/[a-zA-Z0-9./\-+_&=?!%]*)/gi);
            c = `there is a ${data.type} card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${data.data.replace(/'/g, "\\'")}' as content`;
          } else {
            c = `there is a gist card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has 'Sorry; your question was not understood.' as content`;
          }

          for (let j = 0; j < froms.length; j += 1) {
            c += ` and is to the ${froms[j].type.name} '${froms[j].name}'`;
          }
          if (urls) {
            for (let j = 0; j < urls.length; j += 1) {
              c += ` and has '${urls[j]}' as linked content`;
            }
          }
          c += ` and is in reply to the card '${card.name}'`;
          return this.node.addSentence(c);
        }
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
          const tellPolicies = this.node.getInstances('tell policy');
          for (let j = 0; j < tellPolicies.length; j += 1) {
            if (tellPolicies[j].enabled === 'true') {
              const targetName = tellPolicies[j].target.name;
              if (!(targetName in this.agent.unsentTellCards)) { this.agent.unsentTellCards[targetName] = []; }
              this.agent.unsentTellCards[targetName].push(card);
            }
          }
        }

        if (card.is_from) {
          // Check feedback policies to see if input 'tell card' requires a response
          const feedbackPolicies = this.node.getInstances('feedback policy');
          for (let j = 0; j < feedbackPolicies.length; j += 1) {
            const target = feedbackPolicies[j].target;
            const enabled = feedbackPolicies[j].enabled;
            const ack = feedbackPolicies[j].acknowledgement;
            if (target.name.toLowerCase() === card.is_from.name.toLowerCase() && enabled === 'true') {
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
      },

      'nl card': (card) => {
        let data = this.node.addCE(card.content, card.is_from && card.is_from.name);
        // If valid CE, then replicate the nl card as a tell card ('autoconfirm')
        if (data.success) {
          return this.node.addSentence(`there is a tell card named 'msg_{uid}' that is from the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and is to the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${card.content.replace(/'/g, "\\'")}' as content.`);
        } else {
          data = this.node.askQuestion(card.content);
          // If question was success replicate as ask card ('autoask')
          if (data.success) {
            return this.node.addSentence(`there is an ask card named 'msg_{uid}' that is from the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and is to the agent '${this.agent.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${card.content.replace(/'/g, "\\'")}' as content.`);
          } else { 
            // If question not understood then place the response to the NL card in a new response
            data = this.node.addNL(card.content);
            return this.node.addSentence(`there is a ${data.type} card named 'msg_{uid}' that is from the agent '${this.agent.name.replace(/'/g, "\\'")}' and is to the ${card.is_from.type.name} '${card.is_from.name.replace(/'/g, "\\'")}' and has the timestamp '{now}' as timestamp and has '${data.data.replace(/'/g, "\\'")}' as content and is in reply to the card '${card.name}'.`);
          }
        }
      }
    };
  }

  handle(card) {
    const tos = card.is_tos;
    const content = card.content;
    let sentToThisAgent = false;

    if (!tos || !content) {
      return null;
    }

    // Determine whether or not to read or ignore this card:
    if (this.agent.handledCards.indexOf(card.name) > -1) { return null; }
    this.agent.handledCards.push(card.name);
    for (let i = 0; i < tos.length; i += 1) {
      if (tos[i].name.toLowerCase() === this.agent.name.toLowerCase()) {
        sentToThisAgent = true;
        break;
      }
    }
    if (!sentToThisAgent) { return null; }
    this.handlers[card.type.name](card);
  }
}

module.exports = CardHandler;
