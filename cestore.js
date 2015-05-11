/*
 * A JS 'class' to represent the CEStore, its concepts and instances, and to provide interaction methods.
 */
function cestore(){
    
    /*
     * List of concepts stored by the store. This should not be manipulated directly,
     *  but can be modified using the add_concept() function
     */
    var concepts = [
        {name: "entity", id: 1, parents: []},
        {name: "card", id: 2, parents: [1], values:[
            {type: 0, descriptor: 'content'},
            {type: 6, descriptor: 'timestamp'}
        ], relationships:[
            {target: 7, label: 'is to'},
            {target: 7, label: 'is from'}
        ]},
        {name: "tell card", id: 3, parents: [2], values:[]},
		{name: "human", id: 4, parents: [1]},
		{name: "location", id: 5, parents: [1]},
        {name: "timestamp", id: 6, parents: [1]},
        {name: "agent", id: 7, parents: [1]}
    ];
    var instances = [
        {name: "Alun Preece", id: 1, location: 2, concept_id: 4},
        {name: "Office", id: 2, concept_id: 5}
    ];
    var cards = [];

    var agent_name = "Moira";
    var last_polled_timestamp = 0;

    var get_concept_by_id = function(id){
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].id == id){return concepts[i];}
        }
        return null;
    }
    var get_concept_by_name = function(name){
        if(name == null){return null;}
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].name == name.toLowerCase()){
                return concepts[i];
            }
            if(concepts[i].synonyms != null){
                for(var j = 0; j < concepts[i].synonyms.length; j++){
                    if(concepts[i].synonyms[j] == name){
                        return concepts[i];
                    }
                }
            }
        }
        return null;
    }

    var get_instance_by_name = function(name) {
        if(name==null){return null;}
        for(var i = 0; i<instances.length; i++) {
            if(instances[i].name == name.toLowerCase()){
                return instances[i];
            }
        }
        return null;
    }

    var get_instance_by_id = function(id) {
        if(id==null){return null;}
        for(var i = 0; i<instances.length; i++) {
            if(instances[i].id == id){
                return instances[i];
            }
        }
        return null;
    }

    var get_recursive_parents = function(concept){
        var parents = [];
        var stack = [];
        stack.push(concept);
        while(stack.length > 0){
            var current = stack.pop();
            parents.push(current);
            if(current.parents != null){
                for(var i = 0; i < current.parents.length; i++){
                    stack.push(get_concept_by_id(current.parents[i]));
                }
            }
        }
        return parents;
    }

    var parse_ce = function(t){
        t = t.replace(/\s+/g, " "); // Replace all whitespace with a single space (e.g. removes tabs/newlines)
        console.log(t); 

        if(t.match(/^conceptualise an?/)){
            var concept_name = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/)[1];
            var stored_concept = get_concept_by_name(concept_name);
            var concept = null;
            if(stored_concept != null){ // if exists, simply modify existing concept
                concept = stored_concept;
            }
            else{ // otherwise create a new one and add it to list
                concept = {};
                concept.values = [];
                concept.relationships = [];
                concept.parents = []
                concept.name = concept_name;
                concept.id = concepts.length+1;
                concepts.push(concept);
            }

            var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b)/g);
            for (var i=0; i<facts.length; i++) {
                var fact = facts[i].trim();

                // "has the type X as ~ descriptor ~"
                if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
                    var factsInfo = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
                    var value = {};
                    var type_name = factsInfo[1];
                    value.type = get_concept_by_name(type_name).id;

                    if(type_name == "value"){value.type = 0;}
                    if(value.type == null){return;}
                    value.descriptor = factsInfo[3];
                    concept.values.push(value);
                } 

                // "is a parent_concept"
                else if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
                    var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
                    var parent = get_concept_by_name(parent_name);
                    if(parent == null){return;}
                    concept.parents.push(parent.id);
                }
            }

            console.log(concept);
        }

        if(t.match(/^conceptualise the/)){
            var concept = {};
            var concept_info = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z])/);
            var concept_name = concept_info[1];
            
            concept = get_concept_by_name(concept_name);
            if(concept == {}){return;} // if can't find concept, just fail silently

            if(concept.relationships == null){concept.relationships = [];}
            if(concept.parents == null){concept.parents = [];}
            if(concept.values == null){concept.values = [];}

            var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b|)/g);
            for(var i = 0; i < facts.length; i++){
                var fact = facts[i].trim();

                // "concept C ~ label ~ the target T"  (e.g. the teacher T ~ teaches ~ the student S)
                if(fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
                    var factsInfo = fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
                    var target = {};
                    var target_name = factsInfo[4];
                    target = get_concept_by_name(target_name);
                    if(target == null){return;}
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = factsInfo[3];
                    concept.relationships.push(relationship);
                }

                // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
                if(fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
                    var factsInfo = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
                    var target = {};
                    var target_name = factsInfo[2];
                    target = get_concept_by_name(target_name);
                    if(target == null){return;}
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = factsInfo[1];
                    concept.relationships.push(relationship);
                }

                // "has the type X as ~ descriptor ~" (e.g. and has the room R as ~ location ~)
                if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
                    var factsInfo = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
                    var value = {};
                    var type_name = factsInfo[1];
                    value.type = get_concept_by_name(type_name).id;
                    
                    if(type_name == "value"){value.type = 0;}
                    if(value.type == null){return;}
                    value.descriptor = factsInfo[3];
                    concept.values.push(value);
                }

                // "is a parent_concept" (e.g. and is a entity)
                else if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
                    var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
                    concept.parents.push(get_concept_by_name(parent_name).id);
                }
            }
            console.log(concept);
        }

        if(t.match(/^there is [a|an]/)) {
            var instance = {};
            var names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([a-zA-Z0-9 ]*)'/);
            var concept_name = names[1];
            instance.name = names[2];
            var concept = get_concept_by_name(concept_name);
            if(concept == null){return;}
            instance.concept_id = concept.id;
            instance.relationships = [];
            instance.values = [];

            var parents = get_recursive_parents(concept);
            console.log(parents);
            var possible_relationships = [];
            var possible_values = [];

            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }
            console.log(possible_values);
            console.log(possible_relationships);


			var facts = t.split(/(\bthat\b|\band\b) has/g);
			for (var i=0; i<facts.length; i++) {
				var fact = facts[i].trim();
				if(fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/)) {
					var factsInfo = fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/);
                        var value_type = factsInfo[1];
                        var instance_name = factsInfo[2];
                        var value_descriptor = factsInfo[3];
                        console.log(factsInfo);

                        var instance_value = get_instance_by_name(instance_name);
                        if(instance_value == null) {
                            var new_instance = {};
                            new_instance.name = instance_name;
                            new_instance.concept_id = get_concept_by_name(value_type).id;
                            new_instance.id = instances.length-1;
                            instance_value = new_instance;
                            instances.push(new_instance);
                        }
                        var value = {};
                        value.id = instance_value.id;
                        

                        for (var j = 0; j<possible_values.length-1; j++) {
                            if (value_descriptor == possible_values[j].descriptor) {
                                value.descriptor = value_descriptor;
                                instance.values.push(value);
                            }
                        }
                        
                }
                                

				
			}
            console.log(instances);
            return instance;
        }

        if(t.match(/^(\bwho\b|\bwhat\b) is/)){
            var response = {};
            response.type="response";
            var name = t.match(/^(\bwho\b|\bwhat\b) is ([a-zA-Z0-9 ]*)/)[1].replace(/\?/g, '').replace(/\bthe\b/g, '').trim();
            var thing = null;
            for(var i = 0; i< instances.length; i++) {
                if(instances[i].name==name) {
                    thing = instances[i];
                    break;
                }
            }
            console.log(thing); 
            for (var key in thing) {
                if (thing.hasOwnProperty(key)) {
                    console.log(thing[key]);
                }
            }
            return response;
        }

        if(t.match(/^where is/)){
            var response = {};
            response.type="response";
            var id = null;
            var location = null;
            var thing = t.match(/^where is ([a-zA-Z0-9 ]*)/)[1].replace(/\?/g, '').replace(/\bthe\b/g, '').trim();
            for(var i = 0; i<instances.length; i++) {
                if (instances[i].name==thing) {
                    if(instances[i].location != null) {
                       id = instances[i].location;
                       break; 
                    }
                }
            }
            if(id==null) {
                response.message="I don't know where that is.";
                return response;
            }

            for(var i = 0; i<instances.length; i++) {
                if (instances[i].id==id) {
                    location=instances[i];
                    break;
                }
            }
            if (location==null) {
                response.message="I don't know where that is.";
                return response;
            }
            response.message=location.name;
            console.log(response);
            return response;

        }
    }

    this.guess_next = function(s){
        return "";
        /*var t = s.split(/[ ]+/);
        var last_word = t[t.length-1];
        var guess = "";
        var delete_all = false;
        
        if(t.length <= 3){
            for(var i = 0; i < key_words.starters.length; i++){
                if(key_words.starters[i].indexOf(s) == 0){
                    guess = key_words.starters[i];
                    delete_all = true;
                }
            } 
        }
        if(t.length > 2){
            for(var i = 0; i < key_words.general.length; i++){
                if(key_words.general[i].indexOf(last_word) == 0){
                    guess = key_words.general[i];
                }
            }
            if(s.indexOf("the entity concept") == 0){
                for(var i = 0; i < concepts.length; i++){
                    if(concepts[i].name.indexOf(last_word) == 0){
                        guess = concepts[i].name+" ";  
                    }
                }
            }
            if(t[t.length-3] == "as" && s.indexOf("that has") > -1){
                guess = "and has ";
            }
            if(s.indexOf("and is") > -1){
                guess = "and is ";
            }
            if((s.indexOf("there is a") == 0) && s.indexOf("named") == -1){
                for(var i = 0; i < concepts.length; i++){
                    if(concepts[i].name.indexOf(last_word) == 0){
                        guess = concepts[i].name+" named ";  
                    }
                }
            }
            
            if(t[t.length-2] == "named"){
                guess = "";
            }
        }
        if(t[t.length-2] == "a"){
            if(t[t.length-4]=="that"&&t[t.length-3]=="is"){
                for(var i = 0; i < concepts.length; i++){
                    if(concepts[i].name.indexOf(last_word) == 0){
                        guess = concepts[i].name+" ";  
                    }
                }
            }
        }


        if(s.trim() == "conceptualise a"){guess = "";}
        
        var new_string = "";
        for(var i = 0; i < t.length-1; i++){
            new_string+=t[i]+" ";
        }
        if(delete_all){return guess;}
        return new_string+guess;*/
    }
    this.get_instances = function(concept_type, recurse){
        var instance_list = [];
        if(concept_type == null){
            instance_list = instances;
        }
        else if(concept_type != null && (recurse == null || recurse == false)){
            var concept = null;
            for(var i = 0; i < concepts.length; i++){
                if(concepts[i].name == concept_type){
                    concept = concepts[i];
                    break;
                }
            }
            for(var i = 0; i < instances.length; i++){
                if(instances[i].concept_id == concept.id){
                    instance_list.push(instances[i]);
                }
            }
        }
        return instance_list;
    }    
    this.get_concepts = function(){
        return concepts;
    }
    this.get_sentences = function(){
        return cards;
    }
    var poll_cards = function(){
        setTimeout(function(){
            var card_list = store.get_instances("tell card");
            for(var i = 0; i < card_list.length; i++){
                var card = card_list[i]; 
                try{
                    if(card.timestamp != null){
                        if(card.timestamp > last_polled_timestamp && card.to == agent_name){
                            last_polled_timestamp = card.timestamp;
                            var data = parse_ce(card.content); 
                            if(data != null){ // If there is a response from parse_card(), we want to return it to the asker
                                store.reveive_caed("there is an answer card named 'msg_{uid}' that is from the agent 'Moira' and is to the individual '"+card.from+"' and has the timestamp '{now}' as timestamp and has '"+data+"' as content.");
                            }
                        }
                    }
                }
                catch(err){
                    console.log(err);
                    store.receive_card("there is a tell card named 'msg_{uid}' that is from the agent 'Moira' and is to the individual '"+card.from+"' and has the timestamp '{now}' as timestamp and has '"+err+"' as content.");
                }   
            }
            poll_cards();
        }
        , 200);
    }
    this.receive_card = function(card_ce){
        card_ce = card_ce.replace("{now}", new Date().getTime());
        card_ce = card_ce.replace("{uid}", cards.length-1);
        cards.push(card_ce);        
        parse_ce(card_ce);
    }
    this.update_model = function(ce){
        parse_ce(ce);
    }

    var init = function(){
        poll_cards();
    }

    init();
}
