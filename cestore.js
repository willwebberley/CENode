function cestore(){
    var concepts = [
        {name: "entity", id: 1, parent_id: null},
        {name: "card", id: 2, parent_id: 1},
        {name: "tell_card", id: 3, parent_id: 2}
    ];
    var instances = [

    ];
    var relationships = [
        {ce: "from the individual", relationship: "from"},
        {ce: "from the agent", relationship: "from"},
        {ce: "to the agent", relationship: "to"},
        {ce: "to", relationship: "to"},
        {ce: "named", relationship: "name"}
    ];

    var cards = [];
    var next_id = concepts.length;
    var card_count = cards.length;
    var agent_name = "Moira";
    var last_polled_timestamp = 0;

    var get_concept_by_name = function(name){
        if(name == null){return null;}
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].name == name.toLowerCase()){
                return concepts[i];
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
        if(t.indexOf("conceptualise") == 0){
            var concept = {};
            concept.name = tokens[1];
            for(var i = 0; i < tokens.length-1; i++){
                if(tokens[i] == "that" && tokens[i+1] == "is"){
                    concept.parent_name = tokens[i+2].trim();
                }
            }
            return concept;
            //return add_concept(name, parent);
        }
        if(t.indexOf("there is") == 0){
            var concept = get_concept_by_name(tokens[2]);
            if(concept == null){throw "Concept doesn't exist.";}
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
                    for(var j = 0; j < relationships.length; j++){
                        if(fact.indexOf(relationships[j].ce) > -1){
                            instance[relationships[j].relationship] = fact_tokens[fact_tokens.length-1].replace(/'/g,'').replace(/__/g, ' ').trim();
                        }
                    }
                }
            }
            return instance;            
        }
    }

    var poll_cards = function(){
        setTimeout(function(){
            try{
                for(var i = 0; i < cards.length; i++){
                    var card = parse_ce(cards[i]); 
                    if(card.timestamp != null){
                        if(card.timestamp > last_polled_timestamp){
                            console.log(card);
                            console.log(cards[i]);
                            last_polled_timestamp = card.timestamp;
                            add_instance(card);
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
            }
            catch(err){
                console.log(err);
            }   
            poll_cards();
        }
        , 200);
    }

    this.get_instances = function(){
        return instances;
    }    
    this.get_concepts = function(){
        return concepts;
    }
    this.receive_card = function(card_ce){
        card_count ++;
        card_ce = card_ce.replace("{now}", new Date().getTime());
        card_ce = card_ce.replace("{uid}", card_count);
        cards.push(card_ce);        
    }
    poll_cards();
}
