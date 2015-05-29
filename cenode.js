/*
 * A JS 'class' to represent the CENode, its concepts and instances, and to provide interaction methods.
 */
function CENode(){
    this.models = arguments;

    var concepts = [];
    var instances = [];
    var cards = [];
    var sentences = [];
    var agent = new CEAgent(this);
    var node = this;

    var last_instance_id = instances.length;
    var last_concept_id = concepts.length;
    var last_card_id = 0;

    var new_instance_id = function(){
        last_instance_id++;
        return last_instance_id;
    }
    var new_concept_id = function(){
        last_concept_id++;
        return last_concept_id;
    }
    var new_card_id = function(){
        last_card_id++;
        return agent.get_name()+last_card_id;
    }

    this.get_instance_values = function(instance, value_descriptor){
        var values = []
        for(var i = 0; i < instance.values.length; i++){
            if(instance.values[i].descriptor == value_descriptor){
                if(instance.values[i].type_id != 0){
                    values.push(get_instance_by_id(instance.values[i].type_id));
                }
                else{
                    values.push(instance.values[i].type_name);
                }
            }
        }
        return values;
    }

    this.get_instance_relationships = function(instance, relationship_label){
        var relationships = [];
        for(var i = 0; i < instance.relationships.length; i++){
            if(instance.relationships[i].label == relationship_label){
                relationships.push(get_instance_by_id(instance.relationships[i].target_id));
            }
        }
        return relationships;
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
    var get_children = function(concept){
        var children = [];
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].parents.indexOf(concept.id) > -1){
                children.push(concepts[i]);
            }
        }
        return children;
    }
    var get_recursive_children = function(concept){
        var children = [];
        var stack = [];
        stack.push(concept);
        while(stack.length > 0){
            var current = stack.pop();
            children.push(current);
            var current_children = get_children(current);
            if(current_children != null){
                for(var i = 0; i < current_children.length; i++){
                    stack.push(current_children[i]);
                }
            }
        }
        return children;
    }

    var parse_ce = function(t){
        //sentences.push(t);
        t = t.replace(/\s+/g, " "); // Replace all whitespace with a single space (e.g. removes tabs/newlines)

        if(t.match(/^conceptualise an?/)){
            var concept_name = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/)[1];
            var stored_concept = get_concept_by_name(concept_name);
            var concept = null;
            if(stored_concept != null){ // if exists, simply modify existing concept
                return; // TEMPORARY (maybe) - can't conceptualise same thing twice
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
                    if(concept.parents.indexOf(parent.id) == -1){
                        concept.parents.push(parent.id);
                    }
                }
            }
        }

        else if(t.match(/^conceptualise the/)){
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

        else if(t.match(/^there is [a|an]/)) {
            var instance = {};
            var names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([^']*)'/);
            var concept_name = names[1];
            instance.name = names[2];
            var concept = get_concept_by_name(concept_name);
            var current_instance = get_instance_by_name(instance.name);
            if(concept == null){return;}
            if(current_instance != null && current_instance.concept_id == concept.id){
                return; // Don't create 2 instances with same name and same concept id
            }
            instance.concept_id = concept.id;
            instance.relationships = [];
            instance.values = [];
            instance.id = new_instance_id();
            instance.sentences = [];
            instance.sentences.push(t);

            var parents = get_recursive_parents(concept);
            var possible_relationships = [];
            var possible_values = [];

            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }

            var concept_facts = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) '([^']*)' as ((.(?!\band\b))*)/g);
            var value_facts = t.match(/(?:\bthat\b|\band\b) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
            var relationship_facts = t.match(/(?:\bthat\b|\band\b) ([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^']*)'/g); 

            if(concept_facts!=null){for(var i = 0; i < concept_facts.length; i++){
                var fact = concept_facts[i].trim();
                if(fact.indexOf("and")==0 || fact.indexOf("that")==0){
                    var facts_info = fact.match(/the ([a-zA-Z0-9 ]*) '([^']*)' as ([a-zA-Z0-9 ]*)/);
                    var value_type = facts_info[1];
                    var value_instance_name = facts_info[2];
                    var value_instance = get_instance_by_name(value_instance_name);
                    var value_descriptor = facts_info[3];

                    if(value_instance == null) {
                        var new_instance = {};
                        new_instance.name = value_instance_name;
                        new_instance.concept_id = get_concept_by_name(value_type).id;
                        new_instance.id = new_instance_id();
                        new_instance.sentences = [];
                        new_instance.sentences.push(t);
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
            }}

            if(value_facts!=null){for(var i = 0; i < value_facts.length; i++){
                var fact = value_facts[i].trim();
                if(fact.indexOf("and")==0 || fact.indexOf("that")==0){
                    var facts_info = fact.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
                    var value_value = facts_info[1].replace(/\\/g, '');
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
            }}

            if(relationship_facts!=null){for(var i = 0; i < relationship_facts.length; i++){
                var fact = relationship_facts[i].trim();
                    var facts_info = fact.match(/(?:\bthat\b|\band\b) ([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^']*)'/);
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
                        new_instance.sentences = [];
                        new_instance.sentences.push(t);
                        instances.push(new_instance);
                        relationship_instance = new_instance;
                    }

                    var relationship = {};
                    relationship.label = relationship_label;
                    relationship.target_name = relationship_instance_name;
                    relationship.target_id = relationship_instance.id;

                    for(var j = 0; j < possible_relationships.length; j++){
                        if(possible_relationships[j] != null && relationship_label == possible_relationships[j].label){
                            instance.relationships.push(relationship);
                        }
                    }
            }}
            instances.push(instance);
        }

        else if(t.match(/^the ([a-zA-Z0-9 ]*) '([^']*)'/)) {
            var names = t.match(/^the ([a-zA-Z0-9 ]*) '([^']*)'/);
            var concept_name = names[1];
            var instance_name = names[2];

            var instance = get_instance_by_name(instance_name);
            var concept = get_concept_by_name(concept_name);
            if(concept == null || instance == null){return;}

            instance.sentences.push(t);

            var parents = get_recursive_parents(concept);
            var possible_relationships = [];
            var possible_values = [];
            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }
            t = t.replace(/^the ([a-zA-Z0-9 ]*) '([^']*)'/, '').trim();

            var has_concept_facts = t.match(/has the ([a-zA-Z0-9 ]*) '([^']*)' as ([a-zA-Z0-9 ]*) ?(?:and|$)/g); // has concept C as descriptor
            var has_value_facts = t.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*) ?(?:and|$)/g); // has 'value_name' as value (matches escaped quotes too)
            var relationship_facts = t.match(/(?:^|and(?! has)) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^']*)'/g); // does something to the concept 'target'

            // "has the concept 'instance_name' as descriptor"
            if(has_concept_facts!=null){for(var i = 0; i < has_concept_facts.length; i++){
                var fact = has_concept_facts[i].trim();
                var fact_info = fact.match(/^has the ([a-zA-Z0-9 ]*) '([^']*)' as ([a-zA-Z0-9 ]*)/);
                var value = {};
                value.descriptor = fact_info[3];
                value.type_name = fact_info[2];

                var value_concept = get_concept_by_name(fact_info[1]);
                var value_instance = get_instance_by_name(fact_info[2]);

                if(value_concept == null){break;}
                if(value_instance == null){
                    var new_instance = {};
                    new_instance.id = new_instance_id();
                    new_instance.name = value.type_name;
                    new_instance.concept_id = value_concept.id;
                    new_instance.values = [];
                    new_instance.relationships = [];
                    instances.push(new_instance);
                    value_instance = new_instance;
                }
                value.type_id = value_instance.id;
                for(var j = 0; j < possible_values.length; j++){
                    if(possible_values[j] != null && possible_values[j].descriptor == value.descriptor){
                        instance.values.push(value);
                    }
                }
            }}

            // "has 'value_text' as value" (allows 'value_text' to contain escaped quotes)
            if(has_value_facts!=null){for(var i = 0; i < has_value_facts.length; i++){
                var fact = has_value_facts[i].trim();
                var fact_info = fact.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*) ?(?!and)/);
                var value = {};
                value.descriptor = fact_info[2];
                value.type_name = fact_info[1].replace(/\\/g, '');
                value.type_id = 0;
                for(var j = 0; j < possible_values.length; j++){
                    if(possible_values[j] != null && possible_values[j].descriptor == value.descriptor){
                        instance.values.push(value);
                    }
                }             
            }}

            // "is_related_to" the concept 'instance_name'
            if(relationship_facts!=null){for(var i = 0; i < relationship_facts.length; i++){
                var fact = relationship_facts[i].trim();
                var fact_info = fact.match(/(?:^|and(?! has)) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^']*)'/);
                var relationship = {};
                relationship.label = fact_info[1].replace(/\band\b/g, '').trim();
                relationship.target_name = fact_info[3];

                var target_type = get_concept_by_name(fact_info[2]);
                var target_instance = get_instance_by_name(relationship.target_name);
                if(target_type == null){break;}
                if(target_instance == null){
                    var new_instance = {};
                    new_instance.id = new_instance_id();
                    new_instance.name = relationship.target_name;
                    new_instance.concept_id = target_type.id;
                    new_instance.relationships = [];
                    new_instance.values = [];
                    instances.push(new_instance);
                    target_instance = new_instance;
                }
                relationship.target_id = target_instance.id;
                for(var j = 0; j < possible_relationships.length; j++){
                    if(possible_relationships[j] != null && possible_relationships[j].label == relationship.label){
                        instance.relationships.push(relationship);
                    }
                }
            }}

        }


        else if(t.match(/^(\bwho\b|\bwhat\b) is/)){
            var name = t.match(/^(?:\bwho\b|\bwhat\b) is ([a-zA-Z0-9 ]*)/)[1].replace(/\?/g, '').replace(/(\bthe\b|\ba\b)/g, '').trim();
            var instance = get_instance_by_name(name);
            if(instance == null){
                return "I don't know who or what that is.";
            }
            return node.get_instance_ce(instance);;
        }

        else if(t.match(/^where is/)){
            var thing = t.match(/^where is ([a-zA-Z0-9 ]*)/)[1].replace(/\?/g, '').replace(/(\bthe\b|\ba\b)/g, '').trim();
            var instance = get_instance_by_name(thing);
            if(instance == null){return "I don't know what "+thing+" is.";}
            var locatable_instances = node.get_instances("location", true);
            var locatable_ids = [];
            var places = [];
            for(var i = 0; i < locatable_instances.length; i++){locatable_ids.push(locatable_instances[i].id);}
            if(instance.values!=null){for(var i = 0; i < instance.values.length; i++){
                if(locatable_ids.indexOf(instance.values[i].type_id) > -1){
                    places.push("has "+instance.values[i].type_name+" as "+instance.values[i].descriptor);
                }
            }}
            if(instance.relationships!=null){for(var i = 0; i < instance.relationships.length; i++){
                if(locatable_ids.indexOf(instance.relationships[i].target_id) > -1){
                    places.push(instance.relationships[i].label+" "+instance.relationships[i].target_name);
                }
            }}
            if(places.length == 0){return "I don't know where "+instance.name+" is.";}
            return instance.name+" "+places.join(" and ")+".";
        }

        // Here, assume addressing an instance directly and try and guess which
        else{
            var tokens = t.split(" ");
            var instance_name_guess = [];
            while(instance_name_guess.length < tokens.length){
                instance_name_guess.push(tokens[instance_name_guess.length]);
                var instance_guess = get_instance_by_name(instance_name_guess.join(" "));
                if(instance_guess != null){
                    var concept = get_concept_by_id(instance_guess.concept_id);
                    var regexp = new RegExp(instance_guess.name, "i");
                    t = t.replace(regexp, "'"+instance_guess.name+"'");
                    t = "the "+concept.name+" "+t;
                    parse_ce(t);
                    break;
                }
            }
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
            var concept = get_concept_by_name(concept_type);;
            for(var i = 0; i < instances.length; i++){
                if(instances[i].concept_id == concept.id){
                    instance_list.push(instances[i]);
                }
            }
        }
        else if(concept_type != null && recurse == true){
            var all_children = get_recursive_children(get_concept_by_name(concept_type));
            var children_ids = [];
            for(var i = 0; i < all_children.length; i++){children_ids.push(all_children[i].id);}
            for(var i = 0; i < instances.length; i++){
                if(children_ids.indexOf(instances[i].concept_id) > -1){
                    instance_list.push(instances[i]);
                }
            }
        }
        return instance_list;
    }    
    this.set_agent_name = function(new_name){
        if(new_name != null){
            agent.set_name(new_name);
        }
    }
    this.get_agent_name = function(){
        return agent.get_name();
    }   
    this.get_concepts = function(){
        return concepts;
    }
    this.get_sentences = function(){
        return sentences;
    }
    this.get_instance_ce = function(instance){
        var concept = get_concept_by_id(instance.concept_id);
        if(concept == null){return;}
        var ce = "there is a "+concept.name+" named '"+instance.name+"'";
        var facts = [];
        for(var i = 0; i < instance.values.length; i++){
            var value = instance.values[i];
            if(value.type_id == 0){
                facts.push("has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.descriptor)
            }
            else{
                var value_instance = get_instance_by_id(value.type_id);
                var value_concept = get_concept_by_id(value_instance.concept_id);
                facts.push("has the "+value_concept.name+" '"+value_instance.name+"' as "+value.descriptor);
            }
        }
        for(var i = 0; i < instance.relationships.length; i++){
            var relationship = instance.relationships[i];
            var relationship_instance = get_instance_by_id(relationship.target_id);
            var relationship_concept = get_concept_by_id(relationship_instance.concept_id);
            facts.push(relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'");
        }
        if(facts.length > 0){ce += " that "+facts.join(" and ");}
        return ce;
    }
    this.add_sentence = function(ce){
        ce = ce.replace("{now}", new Date().getTime());
        ce = ce.replace("{uid}", new_card_id());
        return parse_ce(ce);
    }
    this.reset_all = function(){
        instances = [];
        concepts = [];
        sentences = [];
    }

    this.init = function(){
        for(var i = 0; i < this.models.length; i++){
            for(var j = 0; j < this.models[i].length; j++){
                this.add_sentence(this.models[i][j]);
            }
        }
    }
    this.init();
}


function CEAgent(n){
    var name = "Moira";
    var last_polled_timestamp = 0;
    var node = n;
    var unsent_cards = {};
    var handled_cards = [];

    this.set_name = function(n){
        name = n;
    }
    this.get_name = function(){
        return name;
    }

    var handle_card = function(card){
        var from = node.get_instance_relationships(card, "is from")[0];
        var tos = node.get_instance_relationships(card, "is to");
        var content = node.get_instance_values(card, "content")[0];
        if(handled_cards.indexOf(card.name) == -1){
            handled_cards.push(card.name);
            for(var i = 0; i < tos.length; i++){
                if(tos[i].name.toLowerCase() == name.toLowerCase()){
                    var tell_policies = node.get_instances("tell policy");
                    for(var j = 0; j < tell_policies.length; j++){
                        var target_name = node.get_instance_values(tell_policies[j], "target")[0].name;
                        if(!(target_name in unsent_cards)){unsent_cards[target_name] = [];}
                        unsent_cards[target_name].push(card); 
                    }
                    if(content != null){
                        var data = node.add_sentence(content); 
                        if(data != null){ 
                            node.add_sentence("there is an tell card named 'msg_{uid}' that is from the agent '"+name+"' and is to the agent '"+from.name+"' and has the timestamp '{now}' as timestamp and has '"+data+"' as content.");
                        }
                    }
                }
            }
        }
    }

    var poll_cards = function(){
        setTimeout(function(){
            var card_list = node.get_instances("tell card");
            for(var i = 0; i < card_list.length; i++){
                handle_card(card_list[i]); 
            }
            poll_cards();
        }
        , 200);
    }

    var enact_policies = function(){
        setTimeout(function(){try{
            var tell_policies = node.get_instances("tell policy");
            var listen_policies = node.get_instances("listen policy");
            var tellall_policies = node.get_instances("tellall policy");

            // For each tell policy in place, send all currently-untold cards to each target
            // To save on transit costs, if there are multiple cards to be sent to one target, they are 
            // separated by new line (\n)
            for(var i = 0; i < tell_policies.length; i++){
                var target = node.get_instance_values(tell_policies[i], "target")[0];
                var cards = unsent_cards[target.name];
                var data = "";
                for(var j = 0; j < cards.length; j++){
                    var card = cards[j];
                    var from = node.get_instance_relationships(card, "is from")[0];
                    if(from.name.toLowerCase() != target.name.toLowerCase()){ // Don't send back a card sent from target agent
                        var rel = {};
                        rel.target_name = target.name;
                        rel.target_id = target.id;
                        rel.label = "is to";
                        card.relationships.push(rel);
                        data += node.get_instance_ce(card)+"\n";
                    }
                }
                if(data != ""){
                    console.log("POST "+target.name+"/sentences"); 
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", node.get_instance_values(target, "address")[0]+"/sentences");
                    xhr.onreadystatechange = function(){
                        if(xhr.readyState==4 && (xhr.status==200 || xhr.status==302)){
                            unsent_cards[target.name] = [];
                        }
                    };
                    xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
                    xhr.send(data);
                }
            }

            // For each listen policy in place, make a GET request to get cards addressed to THIS agent, and add to node
            for(var i = 0; i < listen_policies.length; i++){
                var target = node.get_instance_values(listen_policies[i], "target")[0];
                console.log("GET "+target.name+"/cards?agent="+name);   
                var xhr = new XMLHttpRequest();
                xhr.open("GET", node.get_instance_values(target, "address")[0]+"/cards?agent="+name);
                xhr.onreadystatechange = function(){
                    if(xhr.readyState==4 && xhr.status==200){
                        var cards = xhr.responseText.split("\n");
                        for(var i = 0; i < cards.length; i++){node.add_sentence(cards[i]);}        
                    }
                };
                xhr.send();
            }

            // If there is one enabled tellall policy, then forward any cards sent to THIS agent
            // to every other known agent.
            var tellall = false;
            for(var i = 0; i < tellall_policies.length; i++){
                if(node.get_instance_values(tellall_policies[i], "enabled")[tellall_policies[i].values.length-1] == "true"){
                    tellall = true;
                    break;
                }
            }
            if(tellall == true){
                var agents = node.get_instances("agent");
                var cards = node.get_instances("tell card");
                for(var i = 0; i < cards.length; i++){
                    var card = cards[i];
                    var to_agent = false;
                    var tos = node.get_instance_relationships(card, "is to");
                    for(var j = 0; j < tos.length; j++){
                        if(tos[j].name == name){ // If card sent to THIS agent
                            to_agent = true;
                            break;
                        }
                    }
                    if(to_agent == true){
                        var from = node.get_instance_relationships(card, "is from")[0];

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
                                var relationship = {};
                                relationship.label = "is to";
                                relationship.target_name = agents[j].name;
                                relationship.target_id = agents[j].id;
                                card.relationships.push(relationship);
                            }
                        }
                    }
                }               
            }
            }catch(err){
                console.log(err);
            }
            enact_policies();
        }, 5000); 
    }

    this.init = function(){
        poll_cards();
        enact_policies();
    }
    this.init();
}


/* 
 * Define some models which should be passed when instantiating a CENode object.
 * Any number of models can be passed, but ORDERING IS IMPORTANT.
 * CORE should generally be the first model loaded.
 *
 * Example: node = new CENode(MODELS.CORE, MODELS.SHERLOCK);
 */
MODELS = {
    CORE : [
        "conceptualise an ~ entity ~",
        "conceptualise a ~ timestamp ~ T that is an entity",
        "conceptualise an ~ agent ~ A that is an entity and has the value V as ~ address ~",
        "conceptualise an ~ individual ~ I that is an ~ agent ~",
        "conceptualise a ~ card ~ C that is an entity and has the timestamp T as ~ timestamp ~ and has the value V as ~ content ~",
        "conceptualise the card C ~ is to ~ the agent A and ~ is from ~ the agent B",
        "conceptualise a ~ tell card ~ T that is a card",
        "conceptualise a ~ location ~ L that is an entity",
        "conceptualise a ~ human ~ H that is an entity",
        "conceptualise a ~ policy ~ P",
        "conceptualise a ~ tell policy ~ P that is a policy and has the agent A as ~ target ~",
        "conceptualise a ~ tellall policy ~ P that is a policy and has the value V as ~ enabled ~",
        "conceptualise a ~ listen policy ~ P that is a policy and has the agent A as ~ target ~",
    ],
    SHERLOCK_CORE : [
        "conceptualise a ~ sherlock thing ~ that is an entity",
        "conceptualise a ~ company ~ that is a sherlock thing",
        "conceptualise a ~ fruit ~ that is a sherlock thing and has the room R as ~ room ~",
        "conceptualise a ~ room ~ that is a location and is a sherlock thing",
        "conceptualise the room R ~ contains ~ the sherlock thing S",
        "conceptualise a ~ character ~ that is a sherlock thing and has the value V as ~ shirt colour ~ and has the value W as ~ hobby ~",
        "conceptualise the character C ~ works for ~ the company D and ~ eats ~ the fruit F and ~ is in ~ the location L",
        "conceptualise a ~ question ~ that has the value V as ~ text ~ and has the value W as ~ value ~ and has the value X as ~ relationship ~",
        "conceptualise the question Q ~ concerns ~ the sherlock thing C",

        "there is a character named 'Prof Plum'",
        "there is a character named 'Dr White'",
        "there is a character named 'Col Mustard'",
        "there is a character named 'Sgt Peacock'",
        "there is a character named 'Rev Green'",
        "there is a character named 'Capt Scarlett'",
        "there is a room named 'S211'",
        "there is a room named 'WX314'",
        "there is a room named 'S303'",
        "there is a room named 'S309'",
        "there is a room named 'N215'",
        "there is a fruit named 'apple'",
        "there is a fruit named 'banana'",
        "there is a fruit named 'orange'",
        "there is a fruit named 'lemon'",

        "there is a question named 'q1' that has 'What colour shirt is Prof Plum wearing?' as text and has 'shirt colour' as value and concerns the sherlock thing 'Prof Plum'",
        "there is a question named 'q2' that has 'What room is Prof Plum in?' as text and has 'is in' as relationship and concerns the sherlock thing 'Prof Plum'",
        "there is a question named 'q3' that has 'What fruit does Prof Plum eat?' as text and has 'eats' as relationship and concerns the sherlock thing 'Prof Plum'",
        "there is a question named 'q4' that has 'What hobby does Dr White have?' as text and has 'hobby' as value and concerns the sherlock thing 'Dr White'",
        "there is a question named 'q5' that has 'What colour shirt is Dr White wearing?' as text and has 'shirt colour' as value and concerns the sherlock thing 'Dr White'",
        "there is a question named 'q6' that has 'Where is Col Mustard?' as text and has 'is in' as relationship and concerns the sherlock thing 'Col Mustard'",
        "there is a question named 'q7' that has 'What colour shirt is Sgt Peacock wearing?' as text and has 'shirt colour' as value and concerns the sherlock thing 'Sgt Peacock'",
        "there is a question named 'q8' that has 'Where is Sgt Peacock?' as text and has 'is in' as relationship and concerns the sherlock thing 'Sgt Peacock'",
        "there is a question named 'q9' that has 'Which character is in S211?' as text and has 'contains' as relationship and concerns the sherlock thing 'S211'"
    ],
    SHERLOCK_SERVER : [
        "there is a tellall policy named 'p1' that has 'true' as enabled"
    ],
    SHERLOCK_CLIENT : [
        "there is an agent named 'Master' that has 'http://cenode.sentinelstream.net' as address",
        "there is a tell policy named 'p2' that has the agent 'Master' as target",
        "there is a listen policy named 'p3' that has the agent 'Master' as target"
    ]
}

// If running as a Node.js app...
if(!(typeof window != 'undefined' && window.document)){
    var http = require('http');
    var PORT = 5555;
    var node = new CENode(MODELS.CORE, MODELS.SHERLOCK_CORE, MODELS.SHERLOCK_SERVER);

    if(process.argv.length > 2){node.set_agent_name(process.argv[2]);}
    console.log("Set local agent's name to '"+node.get_agent_name()+"'.");

    http.createServer(function(request,response){
        response.setHeader("Access-Control-Allow-Origin", "*");
        if(request.method == "GET"){
            if(request.url == "/"){
                var ins = node.get_instances();
                var con = node.get_concepts();
                var s = '<html><head><title>CENode Management</title></head><body><h1>CENode Server Admin Interface</h1>';
                s+='<div style="width:48%;float:left;"><h2>Conceptual model</h2><p>Load a bundled model to the node:</p><form action="/model" method="POST"><select name="model">';
                for(key in MODELS){s+='<option value="'+key+'">'+key+'</option>';}
                s +='</select><input type="submit"></form>';
                s+='<p>Add CE sentences to the node:</p><form action="/sentences" enctype="application/x-www-form-urlencoded" method="POST"><textarea name="sentence" style="width:95%;height:100px;"></textarea><br /><br /><input type="submit" /></form></div>';
                s+='<div style="width:48%;float:left;"><h2>Node settings</h2><p>Update local agent name:</p><form method="POST" action="/agent_name"><input type="text" name="name" value="'+node.get_agent_name()+'" /><input type="submit" /></form>';
                s+='<p>Other options:</p><button onclick="window.location=\'/reset\';">Reset model</button>';
                s+='<p>Available endpoints on this node server instance:</p><p style="font-family:\'monospace\';font-size:11px;">- POST /sentences (body= space-delimited set of senteces)<br />- GET /cards?agent=NAME (get all known cards sent to NAME)</p>';
                s+='</div><div style="clear:both;"></div>';
                s+='<div style="display:inline-block;width:45%;float:left;"><h2>Concepts</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(con, undefined, 2)+'</textarea></div>';
                s+='<div style="display:inline-block;width:45%;float:right;"><h2>Instances</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(ins, undefined, 2)+'</textarea></div>';
                s+='</ul><body></html>';
                response.writeHead(200, {"Content-Type": "text/html"});
                response.end(s);
            }
            else if(request.url.indexOf("/cards") == 0){
                var agent_regex = request.url.match(/agent=([a-zA-Z0-9 ]*)/);
                var agent = null;
                if(agent_regex != null){agent = agent_regex[1];}
                var cards = node.get_instances("tell card");
                var s = "";
                for(var i = 0; i < cards.length; i++){
                    if(agent == null){
                        s += node.get_instance_ce(cards[i])+"\n";
                    }
                    else{
                        var tos = node.get_instance_relationships(cards[i], "is to");
                        for(var j = 0; j < tos.length; j++){
                            if(agent != null && tos[j].name.toLowerCase() == agent.toLowerCase()){
                                s += node.get_instance_ce(cards[i])+"\n";
                                break;
                            }
                        }
                    }
                }
                response.writeHead(200, {"Content-Type": "text/ce"});
                response.write(s);
                response.end();
            }
            else if(request.url == "/reset"){
                node.reset_all();
                response.writeHead(302, { 'Location': '/'});
                response.end();
            }
            else{
                response.writeHead(404);
                response.end("404: Resource not found for method GET.");
            }
        }
        else if(request.method == "POST"){
            if(request.url == "/sentences"){
                var body = "";
                request.on('data', function(chunk){
                    body+=chunk;
                });       
                request.on('end', function(){
                    body = decodeURIComponent(body.replace("sentence=","").replace(/\+/g, ' '));
                    var sentences = body.split(/\n/g);
                    for(var i = 0; i < sentences.length; i++){
                        node.add_sentence(sentences[i]);
                    }
                    response.writeHead(302, { 'Location': '/'});
                    response.end();
                });
            }
            else if(request.url == "/model"){
                var body = "";
                request.on('data', function(chunk){
                    body+=chunk;
                });
                request.on('end', function(){
                    var components = {};
                    body.replace(
                        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
                            function($0, $1, $2, $3) { components[$1] = $3; }
                    );
                    if(components.model in MODELS){
                        var model = MODELS[components.model];
                        for(var i = 0; i < model.length; i++){
                            node.add_sentence(model[i]);           
                        }
                    }
                });
                response.writeHead(302, { 'Location': '/'});
                response.end();
            }
            else if(request.url == "/agent_name"){
                var body = "";
                request.on('data', function(chunk){
                    body+=chunk;
                });       
                request.on('end', function(){
                    body = decodeURIComponent(body.replace("name=","").replace(/\+/g, ' '));
                    node.set_agent_name(body);
                    console.log("Set local agent's name to '"+node.get_agent_name()+"'.");
                    response.writeHead(302, { 'Location': '/'});
                    response.end();
                });

            }
            else{
                response.writeHead(404);
                response.end("404: Resource not found for method POST.");
            }      
        }
        else{
            response.writeHead(405);
            response.end("405: Method not allowed on this server.");
        }
    }).listen(PORT);
    console.log("CENode server instance running on port "+PORT+"...");
}
