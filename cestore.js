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
        {ce: "to the agent", relationship: "to"},
        {ce: "named", relationship: "name"},
        {ce: "has", relationship: null}
    ];

    var cards = [];
    var common_words = ["a"];
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

    this.get_concepts = function(){
        return concepts;
    }

    var add_concept = function(name, parent_name){
        if(get_concept_by_name(name) != null){throw "Concept already exists.";}
        var concept;
        concept.name = name;
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

    var add_instance = function(concept, name){
        if(concepts.indexOf(concept) > -1){
            instances.push({});
        }
    }

    this.parse_ce = function(t){
        t = t.trim();
        t = t.replace(/~/g, '');
        t = t.replace(/\ba\b/g, ''); 
        var facts = t.split(/\band\b/);
        var tokens = t.split(/[ ]+/);
        if(t.indexOf("conceptualise") == 0){
            var name = tokens[1];
            var parent = null;
            for(var i = 0; i < tokens.length-1; i++){
                if(tokens[i] == "that" && tokens[i+1] == "is"){
                    parent = tokens[i+2].trim();
                }
            }
            return add_concept(name, parent);
        }
        if(t.indexOf("there is") == 0){
            var concept = get_concept_by_name(tokens[2]);
            if(concept == null){throw "Concept doesn't exist.";}
            var instance = {};
            instance.concept_id = concept.id;
            for(var i = 0; i < tokens.length; i++){
                for(var j = 0; j < relationships.length; j++){
                    if(tokens[i] == relationships[j].ce[0]){
                                  
                    }
                }
            }
                                    
        }
    }

    this.poll_cards = function(){
        for(var i = 0; i < cards.length; i++){
            
        }
    }

    this.get_cards = function(){
        return cards;
    }    

    this.receive_card = function(card_ce){
        card_count ++;
        card_ce = card_ce.replace('{timestamp}', "'"+new Date().getTime()+"'");
        card_ce = card_ce.replace('{card_id}', "'msg_"+card_count+"'");
        cards.push(card_ce);        
    }
}
