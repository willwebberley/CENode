/*
 * A JS 'class' to represent the CEStore, its concepts and instances, and to provide interaction methods.
 */
function cestore(){
    
    /*
     * List of concepts stored by the store. This should not be manipulated directly,
     *  but can be modified using the add_concept() function
     */
    var concepts = [
        {name: "entity", id: 1, parent: []},
        {name: "card", id: 2, parent: [1], values:[
            {type: 0, descriptor: 'content'},
            {type: 6, descriptor: 'timestamp'}
        ], relationships:[
            {target: 7, label: 'is to'},
            {target: 7, label: 'is from'}
        ]},
        {name: "teacher", id: 8, parent: [4], values:[
            {type: 4, descriptor: 'manager'},
            {type: 0, descriptor: 'language'}
        ], relationships:[]},
        {name: "tell card", id: 3, parent: [2], values:[]},
		{name: "human", id: 4, parent: [1]},
		{name: "location", id: 5, parent: [1]},
        {name: "timestamp", id: 6, parent: [1]},
        {name: "agent", id: 7, parent: [1]}
    ];
    var instances = [
        {name: "Alun Preece", id: 1, location: 2, concept_id: 4},
        {name: "Office", id: 2, concept_id: 5}
    ];
    var properties = [
        {ce: "from the individual", relationship: "from"},
        {ce: "from the agent", relationship: "from"},
        {ce: "from", relationship: "from"},
        {ce: "to the agent", relationship: "to"},
        {ce: "to the individual", relationship: "to"},
        {ce: "to", relationship: "to"},
        {ce: "named", relationship: "name"}
    ];
    var key_words = {
        starters: [
            "conceptualise a ",
            "the entity concept ",
            "there is a "
        ],
        general: [
            "and has ",
            "that is a ",
            "that has "
        ]
    };

    var cards = [];
    var next_id = concepts.length;
    var card_count = cards.length;
    var agent_name = "Moira";
    var last_polled_timestamp = 0;
    var store = null;

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

    var add_concept = function(concept){
        if(get_concept_by_name(concept.name) != null){throw "Concept already exists.";}
        var parent_name = concept.parent_name;
        next_id++;
        var parent = get_concept_by_name(parent_name);
        if(parent_name != null && parent == null){
            concepts.push({name: parent_name, id: next_id});
            next_id++;
            concept.id = next_id;
            concept.parent_id = next_id-1;
        }
        else if(parent_name != null && parent != null){
            concept.id = next_id;
            concept.parent_id = parent.id;
        }
        else if(parent_name == null){
            concept.id = next_id;
            concept.parent_id = null;
        }
        concepts.push(concept);
        return concept;
    }

    var add_instance = function(instance){
        instances.push(instance);
    }

    var parse_ce = function(t){
        console.log(t);

        if(t.match(/^conceptualise a/)){
            var concept = {};
            concept.values = [];
            concept.relationships = [];

            var concept_name = t.match(/^conceptualise a ~ ([a-zA-Z0-9 ]*) ~ /)[1];
            concept.name = concept_name;
            concept.id = concepts.length+1;
            if(t.match(/that is a '([a-zA-Z0-9 ]*)'$/)){
                concept.parent_name = t.match(/that is a '([a-zA-Z0-9 ]*)'$/)[1];
            }
            var facts = t.split(/(\bthat\b|\band\b) has/g);
            for (var i=0; i<facts.length; i++) {
                var fact = facts[i].trim();
                if(fact.match(/the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*) as ~ ([a-zA-Z0-9 ]*) ~/)) {
                    var factsInfo = fact.match(/the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*) as ~ ([a-zA-Z0-9 ]*) ~/);
                    var value = {};
                    var type_name = factsInfo[1];
                    for(var j = 0; j < concepts.length; j++){
                        if(concepts[j].name == type_name){
                            value.type = concepts[j].id;
                            break;
                        }
                    }
                    if(type_name == "value"){value.type = 0;}
                    if(value.type == null){return;}
                    value.descriptor = factsInfo[3];
                    concept.values.push(value);
                } 
            }
            console.log(concept);
            return concept;
        }

        if(t.match(/^conceptualise the/)){
            var concept = {};
            var concept_info = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z])/);
            var concept_name = concept_info[1];
            for(var i = 0; i < concepts.length; i++){
                if(concepts[i].name == concept_name){
                    concept = concepts[i];
                }
            }
            console.log(concept);
            if(concept == {}){return;}
            if(concept.relationships == null){concept.relationships = [];}
            var facts = t.split(/\band\b/g);
            for(var i = 0; i < facts.length; i++){
                var fact = facts[i].trim();
                if(fact.match(/the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*)/)){
                    var factsInfo = fact.match(/the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9 ]*)/);
                    var target = {};
                    var target_name = factsInfo[4];
                    for(var j = 0; j < concepts.length; j++){
                        if(concepts[j].name == target_name){
                            target = concepts[j];
                            break;
                        }
                    } 
                    if(target == null){return;}
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = factsInfo[3];
                    concept.relationships.push(relationship);
                }
            }
            console.log(concept);
        }

        if(t.match(/^there is a/)) {
            var instance = {};
            var concept = null;
            for(var i = 0; i<concepts.length; i++) {
                if (concepts[i].name==t.match(/^there is a ([a-zA-Z0-9 ]*) named/)[1]) {
                    concept = concepts[i];
                    break;
                }
            }
            if(concept == null){return;}
            

            instance.name=t.match(/named '([a-zA-Z0-9 ]*)'/)[1];
			var facts = t.split(/(\bthat\b|\band\b) has/g);
			for (var i=0; i<facts.length; i++) {
				var fact = facts[i].trim();
				if(fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/)) {
					var factsInfo = fact.match(/the ([a-zA-Z0-9 ]*) '([a-zA-Z0-9 ]*)' as ([a-zA-Z0-9 ]*)/);
					instance[factsInfo[1]] = factsInfo[2];
				}
			}

            return instance;
        }

        if(t.match(/^(\bwho\b|\bwhat\b) is/)){
            var response = {};
            response.type="response";
            var name = t.match(/^\bwho\b|\bwhat\b is ([a-zA-Z0-9 ]*)/)[1].replace(/\?/g, '').replace(/\bthe\b/g, '').trim();
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

    var poll_cards = function(){
        setTimeout(function(){
            var card_list = store.get_instances("tell_card");
            for(var i = 0; i < card_list.length; i++){
                var card = card_list[i]; 
                try{
                    if(card.timestamp != null){
                        if(card.timestamp > last_polled_timestamp && card.to == agent_name){
                            last_polled_timestamp = card.timestamp;
                            var data = parse_ce(card.content); 
                            if(data.type = "response"){
                                // TODO
                            }
                            else if(data.concept_id == null){
                                add_concept(data);
                            }                        
                            else{
                                add_instance(data);
                            }                        
                        }
                    }
                }
                catch(err){
                    console.log(err);
                    store.receive_card("there is a tell_card named 'msg_{uid}' that is from the agent 'Moira' and is to the individual '"+card.from+"' and has the timestamp '{now}' as timestamp and has '"+err+"' as content.");
                }   
            }
            poll_cards();
        }
        , 200);
    }

    this.guess_next = function(s){
        var t = s.split(/[ ]+/);
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
        return new_string+guess;
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
        card_count ++;
        card_ce = card_ce.replace("{now}", new Date().getTime());
        card_ce = card_ce.replace("{uid}", card_count);
        cards.push(card_ce);        
        var card = parse_ce(card_ce);
        add_instance(card);
    }

    var init = function(){
        poll_cards();
    }

    store = this;
    init();
}
