/*
 * A JS 'class' to represent the CENode, its concepts and instances, and to provide interaction methods.
 */
function CENode(){
    
    var concepts = [];
    var instances = [];
    var cards = [];
    var core_model = [
        "conceptualise an ~ entity ~",
        "conceptualise a ~ timestamp ~ T that is an entity",
        "conceptualise an ~ agent ~ A that is an entity",
        "conceptualise a ~ card ~ C that is an entity and has the timestamp T as ~ timestamp ~ and has the value V as ~ content ~",
        "conceptualise the card C ~ is to ~ the agent A and ~ is from ~ the agent B",
        "conceptualise a ~ tell card ~ T that is a card",
        "conceptualise a ~ location ~ L that is an entity",
        "conceptualise a ~ human ~ H that is an entity and has the location L as ~ office ~",
        "conceptualise the human H ~ is supervised by ~ the human G",
        "there is a location named 'N215'",
        "there is a human named 'Alun Preece' that has the location 'N215' as office",
        "there is a human named 'Will' that is supervised by the human 'Alun Preece' and has the location 'S309' as office"
    ];
    var agent = new CEAgent(this);
    var last_instance_id = instances.length;
    var last_concept_id = concepts.length;

    var new_instance_id = function(){
        last_instance_id++;
        return last_instance_id;
    }
    var new_concept_id = function(){
        last_concept_id++;
        return last_concept_id;
    }
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
            if(instances[i].name.toLowerCase() == name.toLowerCase()){
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
                concept.id = new_concept_id();
                concepts.push(concept);
            }

            var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b)/g);
            for (var i=0; i<facts.length; i++) {
                var fact = facts[i].trim();

                // "has the type X as ~ descriptor ~"
                if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
                    var facts_info = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
                    var value = {};
                    value.descriptor = facts_info[3];
                    var type_name = facts_info[1];
                    var value_type = get_concept_by_name(type_name);

                    if(type_name == "value"){value.type = 0;}
                    else if(value_type != null){value.type = value_type.id;}
                    else if(value.type == null){return;}

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
                    var facts_info = fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
                    var target = {};
                    var target_name = facts_info[4];
                    target = get_concept_by_name(target_name);
                    if(target == null){return;}
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = facts_info[3];
                    concept.relationships.push(relationship);
                }

                // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
                if(fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
                    var facts_info = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
                    var target = {};
                    var target_name = facts_info[2];
                    target = get_concept_by_name(target_name);
                    if(target == null){return;}
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = facts_info[1];
                    concept.relationships.push(relationship);
                }

                // "has the type X as ~ descriptor ~" (e.g. and has the room R as ~ location ~)
                if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
                    var facts_info = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
                    var value = {};
                    var type_name = facts_info[1];
                    var type = get_concept_by_name(type_name);
                    if(type_name == "value"){value.type = 0;}
                    else if(type != null){
                        value.type = type.id;
                    }
                    else{return;}
                    value.descriptor = facts_info[3];
                    concept.values.push(value);
                }

                // "is a parent_concept" (e.g. and is a entity)
                else if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
                    var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
                    concept.parents.push(get_concept_by_name(parent_name).id);
                }
            }
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
            instance.id = new_instance_id();

            var parents = get_recursive_parents(concept);
            var possible_relationships = [];
            var possible_values = [];

            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }

			var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|)/g);
			for (var i=0; i<facts.length; i++) {
				var fact = facts[i].trim();
				if(fact.match(/^the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/)) {
					var facts_info = fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/);
                    var value_type = facts_info[1];
                    var value_instance_name = facts_info[2];
                    var value_instance = get_instance_by_name(value_instance_name);
                    var value_descriptor = facts_info[3];

                    if(value_instance == null) {
                        var new_instance = {};
                        new_instance.name = value_instance_name;
                        new_instance.concept_id = get_concept_by_name(value_type).id;
                        new_instance.id = new_instance_id();
                        instances.push(new_instance);
                        value_instance = new_instance;
                    }
                    var value = {};
                    value.type_id = value_instance.id;
                    value.type_name = value_instance_name;

                    for (var j = 0; j < possible_values.length; j++) {
                        if (possible_values[j] != null && value_descriptor == possible_values[j].descriptor) {
                            value.descriptor = value_descriptor;
                            instance.values.push(value);
                        }
                    }
                }
                else if(fact.match(/^'([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/)) {
                    var facts_info = fact.match(/^'([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/);
                    var value_value = facts_info[1];
                    var value_descriptor = facts_info[2];
                    
                    var value = {};
                    value.type_name = value_value;
                    value.type_id = 0;
                    value.descriptor = value_descriptor;

                    for (var j = 0; j < possible_values.length; j++) {
                        if (possible_values[j] != null && value_descriptor == possible_values[j].descriptor) {
                            instance.values.push(value);
                        }
                    }
                }
                else if(fact.match(/^([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)'/)){
                    var facts_info = fact.match(/^([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)'/);
                    var relationship_label = facts_info[1];
                    var relationship_type_name = facts_info[2];
                    var relationship_instance_name = facts_info[3];
                    var relationship_type = get_concept_by_name(relationship_type_name);
                    var relationship_instance = get_instance_by_name(relationship_instance_name);
                    if(relationship_type == null){return;}
                    
                    if(relationship_instance == null){
                        var new_instance = {};
                        new_instance.name = relationship_instance_name;
                        new_instance.concept_id = relationship_type.id;
                        new_instance.id = new_instance_id();;
                        instances.push(new_instance);
                        relationship_instance = new_instance;
                    }

                    var relationship = {};
                    relationship.label = relationship_label;
                    relationship.target_name = relationship_instance_name;
                    relationship.target_id = relationship_instance.id;

                    for(var j = 0; j < possible_relationships.length; j++){
                        if(possible_relationships[j] != null && relationship_label == possible_relationships[j].label && relationship_type.id == possible_relationships[j].target){
                            instance.relationships.push(relationship);
                        }
                    }
                }
			}
            instances.push(instance);
        }

        if(t.match(/^the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)'/)) {
            var names = t.match(/^the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)'/);
            var concept_name = names[1];
            var instance_name = names[2];

            var instance = get_instance_by_name(instance_name);
            var concept = get_concept_by_name(concept_name);
            if(concept == null || instance == null){return;}

            var parents = get_recursive_parents(concept);
            var possible_relationships = [];
            var possible_values = [];
            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }

			var facts = t.split(/(\bhas\b) (\bthe\b)/g);
			for (var i=0; i<facts.length; i++) {
				var fact = facts[i].trim();
				if(fact.match(/^the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/)) {
					var facts_info = fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/);
                }
            }
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
    
    this.receive_card = function(card_ce){
        card_ce = card_ce.replace("{now}", new Date().getTime());
        card_ce = card_ce.replace("{uid}", cards.length-1);
        cards.push(card_ce);        
        parse_ce(card_ce);
    }
    this.update_model = function(ce){
        parse_ce(ce);
    }

    this.init = function(){
        for(var i = 0; i < core_model.length; i++){
            this.update_model(core_model[i]);
        }
    }
    this.init();
}


function CEAgent(n){
    var agent_name = "Moira";
    var last_polled_timestamp = 0;
    var node = n;

    var poll_cards = function(){
        setTimeout(function(){
            var card_list = node.get_instances("tell card");
            for(var i = 0; i < card_list.length; i++){
                var card = card_list[i]; 
                try{
                    if(card.timestamp != null){
                        if(card.timestamp > last_polled_timestamp && card.to == agent_name){
                            last_polled_timestamp = card.timestamp;
                            var data = parse_ce(card.content); 
                            if(data != null){ 
                                node.reveive_caed("there is an tell card named 'msg_{uid}' that is from the agent 'Moira' and is to the individual '"+card.from+"' and has the timestamp '{now}' as timestamp and has '"+data+"' as content.");
                            }
                        }
                    }
                }
                catch(err){
                    console.log(err);
                    node.receive_card("there is a tell card named 'msg_{uid}' that is from the agent 'Moira' and is to the individual '"+card.from+"' and has the timestamp '{now}' as timestamp and has '"+err+"' as content.");
                }   
            }
            poll_cards();
        }
        , 200);
    }
    poll_cards();
}
