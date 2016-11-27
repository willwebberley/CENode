exports.CEAgent = class CEAgent{

  constructor (node){
    this.name = "Moira";
    this.last_successful_request = 0;
    this.node = node;
    this.unsent_tell_cards = {};
    this.unsent_ask_cards = {};
    this.handled_cards = [];

    this.poll_cards();
    this.enact_policies();
  }

  set_name (name){
    this.name = name;
  }

  get_name (){
    return this.name;
  }

  get_last_successful_request (){
    return this.last_successful_request;
  }

  handle_card (card){
    var from = card.is_from;
    var tos = card.is_tos;
    var content = card.content;
    var sent_to_this_agent = false;

    if(!tos || !content){
      return;
    }

    // Determine whether or not to read or ignore this card:
    if(this.handled_cards.indexOf(card.name) > -1){return;}
    this.handled_cards.push(card.name);
    for(var i = 0; i < tos.length; i++){
      if(tos[i].name.toLowerCase() == this.name.toLowerCase()){
        sent_to_this_agent = true;
        break;
      }
    }
    if(!sent_to_this_agent){return;}

    /*
     * Now handle the actual card:
     */

    if(from && card.type.name == "ask card"){
      // Get the relevant information from the node
      var data = this.node.ask_question(content);
      var ask_policies = this.node.get_instances("ask policy");
      for(var j = 0; j < ask_policies.length; j++){
        if(ask_policies[j].enabled == 'true'){
          var target_name = ask_policies[j].target.name;
          if(!(target_name in this.unsent_ask_cards)){this.unsent_ask_cards[target_name] = [];}
          this.unsent_ask_cards[target_name].push(card); 
        }
      }
      // Prepare the response 'tell card' to the input 'ask card' and add this back to the local model
      var froms = card.is_froms;
      var urls, c;
      if(data.data){
        urls = data.data.match(/(https?:\/\/[a-zA-Z0-9\.\/\-\+_&=\?\!%]*)/gi);
        c = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+this.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content";
      }
      else{
        c = "there is a gist card named 'msg_{uid}' that is from the agent '"+this.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has 'Sorry; your question was not understood.' as content";
      }

      for(var j = 0; j < froms.length; j++){
        c+=" and is to the "+froms[j].type.name+" '"+froms[j].name+"'";
      }
      if(urls!=null){for(var j = 0; j < urls.length; j++){
        c+=" and has '"+urls[j]+"' as linked content";
      }}
      c += " and is in reply to the card '"+card.name+"'";
      return this.node.add_sentence(c);
    }

    else if(from && card.type.name == "tell card"){
      // Add the CE sentence to the node
      var data = this.node.add_ce(content, false, from.name); 
      if(!data.success){
        return node.add_sentence("there is a gist card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has 'Sorry. Your input was not understood.' as content and is in reply to the card '"+card.name+"'.");
      }
      var response_card;
      if(data.success == true){
        // Add sentence to any active tell policy queues
        var tell_policies = this.node.get_instances("tell policy");
        for(var j = 0; j < tell_policies.length; j++){
          if(tell_policies[j].enabled == 'true'){
            var target_name = tell_policies[j].target.name;
            if(!(target_name in this.unsent_tell_cards)){this.unsent_tell_cards[target_name] = [];}
            this.unsent_tell_cards[target_name].push(card); 
          }
        }
      }
      // Check feedback policies to see if input 'tell card' requires a response
      // The type of response card is determined by the way it was handled by the node (nl, gist, tell, etc.)
      var feedback_policies = this.node.get_instances("feedback policy");
      for(var j = 0; j < feedback_policies.length; j++){
        var target = feedback_policies[j].target;
        var enabled = feedback_policies[j].enabled;
        var ack = feedback_policies[j].acknowledgement;
        if(target.name.toLowerCase() == from.name.toLowerCase() && enabled == 'true'){
          var c;
          if(ack == "basic"){c = "OK.";}
          else{
            if(data.type == "tell"){
              c = "OK. I added this to my knowledge base: "+data.data;
            }
            else if(data.type == "ask" || data.type == "confirm" || data.type == "gist"){
              c = data.data;
            }
          }
          response_card = this.node.add_sentence("there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+this.name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+c.replace(/'/g, "\\'")+"' as content and is in reply to the card '"+card.name+"'.");
        }
      }
      return response_card;
    }

    else if(from && card.type.name == "nl card"){
      var new_card = null;
      // Firstly, check if card content is valid CE, but without writing to model:
      var data = this.node.add_ce(content, true, from.name);
      // If valid CE, then replicate the nl card as a tell card and re-add to model (i.e. 'autoconfirm')
      if(data.success == true){
        new_card = "there is a tell card named 'msg_{uid}' that is from the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and is to the agent '"+this.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+content.replace(/'/g, "\\'")+"' as content.";
      }   
      // If invalid CE, then try responding to a question 
      else{
        data = this.node.ask_question(content);
        // If question was success, replicate the nl card as an ask card and re-add to model (i.e. 'autoask')
        if(data.success == true){
          new_card = "there is an ask card named 'msg_{uid}' that is from the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and is to the agent '"+this.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+content.replace(/'/g, "\\'")+"' as content.";
        }
        // If question not understood then place the response to the NL card in a new response
        else{
          data = this.node.add_nl(content);     
          new_card = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+this.name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content and is in reply to the card '"+card.name+"'.";
        }
      }
      this.node.add_sentence(new_card);
      return new_card;
    }
  }

  poll_cards (){
    if(setTimeout){
      setTimeout(() => {
        var card_list = this.node.get_instances("card", true);
        for(var i = 0; i < card_list.length; i++){
          this.handle_card(card_list[i]); 
        }
        this.poll_cards();
      }, 500);
    }
  }

  get_instance (){
    var instances = this.node.get_instances("agent");
    for(var i = 0; i < instances.length; i++){
      if(instances[i].name.toLowerCase() == name.toLowerCase()){
        return instances[i];
      }
    }
  }

  enact_policies (){
    if(setTimeout){
      setTimeout(() => {
        try{
          var tell_policies = this.node.get_instances("tell policy");
          var ask_policies = this.node.get_instances("ask policy");
          var listen_policies = this.node.get_instances("listen policy");
          var forwardall_policies = this.node.get_instances("forwardall policy");

          // For each tell policy in place, send all currently-untold cards to each target
          // To save on transit costs, if there are multiple cards to be sent to one target, they are 
          // separated by new line (\n)
          for(var i = 0; i < tell_policies.length; i++){
            var target = tell_policies[i].target;
            if(target && target.name){
              var cards = this.unsent_tell_cards[target.name];
              if(cards){
                var data = "";
                for(var j = 0; j < cards.length; j++){
                  try{
                    var card = cards[j];
                    var from = card.is_from;
                    var tos = card.is_tos;
                    if(tos && from.name.toLowerCase() != target.name.toLowerCase()){ // Don't send back a card sent from target agent
                      // Make sure target is not already a recipient
                      var in_card = false;
                      for(var k = 0; k < tos.length; k++){
                        if(tos[k].id == target.id){in_card = true;break;}
                      }
                      if(!in_card){
                        card.add_relationship("is to", target);
                      }
                      data += card.ce+"\n";
                    }
                  } catch(err){}
                }
                if(data != ""){
                  net.make_request("POST", target.address, POST_SENTENCES_ENDPOINT, data, function(resp){
                    this.last_successful_request = new Date().getTime();
                    this.unsent_tell_cards[target.name] = [];
                  });
                }
              }
            }
          }

          // For each ask policy in place, send all currently-untold cards to each target
          // To save on transit costs, if there are multiple cards to be sent to one target, they are 
          // separated by new line (\n)
          for(var i = 0; i < ask_policies.length; i++){
            var target = ask_policies[i].target;
            if(target && target.name){
              var cards = this.unsent_ask_cards[target.name];
              if(cards){
                var data = "";
                for(var j = 0; j < cards.length; j++){
                  try{
                    var card = cards[j];
                    var from = card.is_from;
                    var froms = card.is_froms;
                    var tos = card.is_tos;
                    if(tos && from && from.name.toLowerCase() != target.name.toLowerCase()){ // Don't send back a card sent from target agent
                      // Make sure target is not already a recipient
                      var in_card = false;
                      for(var k = 0; k < tos.length; k++){
                        if(tos[k].id == target.id){in_card = true;break;}
                      }
                      if(!in_card){
                        card.add_relationship("is to", target);
                      }
                      // Make sure an agent is not already a sender
                      in_card = false;
                      for(var k = 0; k < froms.length; k++){
                        if(froms[k].id == get_instance().id){in_card = true;break;}
                      }
                      if(!in_card){
                        card.add_relationship("is from", get_instance());
                      }
                      data += card.ce+"\n";
                    }
                  } catch(err){}
                }
                if(data != ""){
                  net.make_request("POST", target.address, POST_SENTENCES_ENDPOINT, data, function(resp){
                    this.last_successful_request = new Date().getTime();
                    this.unsent_ask_cards[target.name] = [];
                  });
                }
              }
            }
          }

          // For each listen policy in place, make a request to get cards addressed to THIS agent, and add to node, ignoring already-seen cards
          for(var i = 0; i < listen_policies.length; i++){
            var target = listen_policies[i].target;
            var data = '';
            var all_cards = this.node.get_instances('card', true);
            for(var j = 0; j < all_cards.length; j++){
              data = data + all_cards[j].name+'\n';
            }
            net.make_request("POST", target.address, GET_CARDS_ENDPOINT+"?agent="+name, data, function(resp){
              this.last_successful_request = new Date().getTime();
              var cards = resp.split("\n");
              this.node.add_sentences(cards);
            });
          }

          // If there is one enabled forwardall policy, then forward any cards sent to THIS agent
          // to every other known agent.
          for(var i = 0; i < forwardall_policies.length; i++){
            var policy = forwardall_policies[i];
            if(policy.enabled == "true"){
              var agents = policy.all_agents == "true" ? this.node.get_instances("agent") : policy.targets;
              var cards = this.node.get_instances("tell card");
              if(policy.start_time){
                var start_time = policy.start_time.name;
                for(var i = 0; i < cards.length; i++){
                  try{
                    var card = cards[i];
                    var to_agent = false;
                    var tos = card.is_tos;
                    var card_timestamp = card.timestamp.name;
                    if(tos && parseInt(card_timestamp) > parseInt(start_time)){
                      for(var j = 0; j < tos.length; j++){
                        if(tos[j].name == name){ // If card sent to THIS agent
                          to_agent = true;
                          break;
                        }
                      }
                      if(to_agent == true){
                        var from = card.is_froms[0];

                        // Add each other agent as a recipient (if they aren't already), but not THIS agent or the original author
                        for(var j = 0; j < agents.length; j++){
                          var agent_is_recipient = false;
                          for(var k = 0; k < tos.length; k++){
                            if(tos[k].name.toLowerCase() == agents[j].name.toLowerCase()){
                              agent_is_recipient = true;
                              break;   
                            }
                          }
                          if(!agent_is_recipient && agents[j].name.toLowerCase() != name.toLowerCase() && agents[j].name.toLowerCase() != from.name.toLowerCase()){
                            card.add_relationship("is to", agents[j]);
                          }
                        }
                      }
                    }
                  } catch(err){console.log(err);}
                }
              }         
              break; 
            }
          }
        } catch(err){
          console.log(err);
        }
        this.enact_policies();
      }, 5000); 
    }
  }
}
