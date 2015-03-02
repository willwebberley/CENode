/*
 * A JS 'class' to represent the CEStore, its concepts and instances, and to provide interaction methods.
 */
function cestore(){
    
    /*
     * List of concepts stored by the store. This should not be manipulated directly,
     *  but can be modified using the add_concept() function
     */
    var concepts = [
        {name: "entity", id: 1, parent_id: null},
        {name: "card", id: 2, parent_id: 1},
        {name: "tell_card", id: 3, parent_id: 2}
    ];
    var instances = [

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
        console.log(concept);
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
            var concept_name = t.match(/^conceptualise a '([a-zA-Z0-9 ]*)'/)[1];
            concept.name = concept_name;
            console.log(concept_name);                
            if(t.match(/that is a '([a-zA-Z0-9 ]*)'$/)){
                concept.parent_name = t.match(/that is a '([a-zA-Z0-9 ]*)'$/)[1];
            }
            return concept;
        }



        /*
        // Replace all spaces in variables (stuff in apostrophes) with '__'
        t = t.replace(/\\'/g, "'");
        var quoted = t.match(/'(.*?)'/g);
        if(quoted != null){
            for(var i = 0; i < quoted.length; i++){
                var fixed = quoted[i].replace(/[ ]+/g, '__');
                t = t.replace(quoted[i], fixed);
            }
        }

        // Trim and remove all tildas and "a"s
        t = t.trim();
        t = t.replace(/~/g, '');
        t = t.replace(/\ba\b/g, ''); 

        // Reduce ce down into facts separated by "and"s
        var facts = t.split(/\band\b|that /);
        for(var i = 0; i < facts.length; i++){facts[i] = facts[i].trim();}

        // Tokenise ce
        var tokens = t.split(/[ ]+/);

        // If a concept, return a concept. If an instance, return an instance.
        if(t.indexOf("conceptualise") == 0){
            if(get_concept_by_name(tokens[1]) != null){throw "Concept already exists.";}
            var concept = {};
            concept.name = tokens[1];
            for(var i = 0; i < tokens.length-1; i++){
                if(tokens[i] == "that" && tokens[i+1] == "is"){
                    concept.parent_name = tokens[i+2].trim();
                }
            }
            return concept;
        }
        if(t.indexOf("the entity concept") == 0){
            var concept = get_concept_by_name(tokens[3]);
            if(concept == null){throw "Concept doesnt exist.";}
            if(concept.synonyms == null){concept.synonyms = [];}
            for(var i = 0; i < facts.length; i++){
                var fact = facts[i];
                var fact_tokens = fact.split(" ");
                if(fact.indexOf("can be expressed by") > -1){
                    concept.synonyms.push(fact_tokens[fact_tokens.length-1].replace(/'/g,'').replace(/__/g, ' ').trim());
                }
            }
        }
        if(t.indexOf("there is") == 0){
            var concept = get_concept_by_name(tokens[2]);
            if(concept == null){throw "Concept doesnt exist.";}
            var instance = {};
            instance.concept_id = concept.id;
            for(var i = 0; i < facts.length; i++){
                var fact = facts[i];
                var fact_tokens = fact.split(" ");
                if(fact.indexOf("has the") == 0){
                    var value = fact_tokens[3].replace(/'/g,'').replace(/__/g, ' ').trim();
                    var number_value = parseInt(value);
                    if(isNaN(number_value)){
                        instance[fact_tokens[2]] = value;
                    }
                    else{
                        instance[fact_tokens[2]] = number_value;
                    } 
                }
                else if(fact.indexOf("has") == 0){
                    instance[fact_tokens[3]] = fact_tokens[1].replace(/'/g,'').replace(/__/g, ' ').trim();
                }
                else{
                    for(var j = 0; j < properties.length; j++){
                        if(fact.indexOf(properties[j].ce) > -1){
                            instance[properties[j].relationship] = fact_tokens[fact_tokens.length-1].replace(/'/g,'').replace(/__/g, ' ').trim();
                        }
                    }
                }
            }
            return instance;            
        }
           */
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
                            if(data.concept_id == null){
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
        return [];
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
