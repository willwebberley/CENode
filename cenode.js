/*
 * Copyright 2015 W.M. Webberley & A.D. Preece (Cardiff University) 
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


/*
 * Library constants
 */
var POST_SENTENCES_ENDPOINT = "/sentences";
var GET_CARDS_ENDPOINT = "/cards";
var MODELS = {
    CORE : [
        "conceptualise an ~ entity ~ E",
        "conceptualise an ~ imageable thing ~ I that has the value V as ~ image ~",
        "conceptualise a ~ timestamp ~ T that is an entity",
        "conceptualise an ~ agent ~ A that is an entity and has the value V as ~ address ~",
        "conceptualise an ~ individual ~ I that is an ~ agent ~",
        "conceptualise a ~ card ~ C that is an entity and has the timestamp T as ~ timestamp ~ and has the value V as ~ content ~ and has the value W as ~ linked content ~ and has the value V as ~ number of keystrokes ~ and has the timestamp T as ~ start time ~ and has the value W as ~ submit time ~",
        "conceptualise the card C ~ is to ~ the agent A and ~ is from ~ the agent B",
        "conceptualise a ~ tell card ~ T that is a card",
        "conceptualise an ~ ask card ~ A that is a card",
        "conceptualise a ~ gist card ~ G that is a card",
        "conceptualise an ~ nl card ~ N that is a card",
        "conceptualise a ~ confirm card ~ C that is a card",
        "conceptualise a ~ location ~ L that is an entity",
        "conceptualise a ~ locatable thing ~ L that is an entity",
        "conceptualise the locatable thing L ~ is in ~ the location M",
        "conceptualise a ~ rule ~ R that is an entity and has the value V as ~ instruction ~",
        "conceptualise a ~ policy ~ P that is an entity and has the value V as ~ enabled ~ and has the agent A as ~ target ~",
        "conceptualise a ~ tell policy ~ P that is a policy",
        "conceptualise an ~ ask policy ~ P that is a policy",
        "conceptualise a ~ listen policy ~ P that is a policy",
        "conceptualise a ~ listen onbehalfof policy ~ P that is a policy",
        "conceptualise a ~ forwardall policy ~ P that is a policy and has the timestamp T as ~ start time ~ and has the value V as ~ all agents ~",
        "conceptualise a ~ feedback policy ~ P that is a policy and has the value V as ~ acknowledgement ~"
    ]
}


/*
 * A JS 'class' to represent the CENode, its concepts and instances, and to provide interaction methods.
 */
function CENode(){
    // Grab any arguments. These will be the models to be loaded to the node when initialised.
    this.models = arguments;

    // Data structures to maintain the instances and concepts maintained
    // by the node.
    var concepts = [];
    var instances = [];
    var rules = [];
    var concept_ids = {};

    var agent = new CEAgent(this);
    var node = this;

    /*
     * Code for generating instance, concept, and card IDs.
     *
     * Instance/concept IDs based on number of each type so far created
     * Returns int
     * 
     * Card IDs based on number of cards and the local agent's name
     * Returns str
     */
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

    /*
     * Get all the values of this instance with descriptor matching value_descriptor
     * If the value is a VALUE (i.e. not typed), the value names will be in the list
     * If the value is a typed value, the value's instances will be in the list
     *
     * Returns [obj{instance.value}]
     */
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

    /*
     * Get THE MOST RECENT value for this instance matching value_descriptor
     * Return types as above.
     *
     * Returns obj{instance.value}
     */
    this.get_instance_value = function(instance, value_descriptor){
        var value = null;
        if(instance.values == null){return null;}
        for(var i = 0; i < instance.values.length; i++){
            if(instance.values[i].descriptor == value_descriptor){
                if(instance.values[i].type_id != 0){
                    value = get_instance_by_id(instance.values[i].type_id);
                }
                else{
                    value = instance.values[i].type_name;
                }
            }
        }
        return value;
    }

    /*
     * Get all relationships of this instance with label matching relationship_label
     * Returned is list of instances that are related to 'instance' in this way
     *
     * Returns [obj{instance.relationship}]
     */
    this.get_instance_relationships = function(instance, relationship_label){
        var relationships = [];
        if(instance.relationships == null){return [];}
        for(var i = 0; i < instance.relationships.length; i++){
            if(instance.relationships[i].label == relationship_label){
                relationships.push(get_instance_by_id(instance.relationships[i].target_id));
            }
        }
        return relationships;
    }

    /*
     * Get THE MOST RECENT relationship of this instance with label matching relationship_label
     * Return types as above.
     *
     * Returns: obj{instance.relationship}
     */
    this.get_instance_relationship = function(instance, relationship_label){
        var relationship = null;
        if(instance.relationships == null){return null;}
        for(var i = 0; i < instance.relationships.length; i++){
            if(instance.relationships[i].label == relationship_label){
                relationship = get_instance_by_id(instance.relationships[i].target_id);
            }
        }
        return relationship;
    }

    /*
     * Get the name of the concept type of this instance.
     *
     * Returns: str
     */
    this.get_instance_type = function(instance){
        var concept = get_concept_by_id(instance.concept_id);
        if(concept != null){return concept.name;}
    }

    /*
     * Get the concept with ID 'id'
     *
     * Returns: obj{concept}
     */
    var get_concept_by_id = function(id){
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].id == id){return concepts[i];}
        }
        return null;
    }

    /*
     * Get the concept with name 'name'
     *
     * Returns: obj{concept}
     */
    var get_concept_by_name = function(name){
        if(name == null){return null;}
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].name.toLowerCase() == name.toLowerCase()){
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

    /*
     * Get the instance with name 'name'
     *
     * Returns: obj{instance}
     */
    var get_instance_by_name = function(name) {
        if(name==null){return null;}
        for(var i = 0; i<instances.length; i++) {
            if(instances[i].name.toLowerCase() == name.toLowerCase()){
                return instances[i];
            }
        }
        return null;
    }

    /* 
     * Get the instance with ID 'id'
     *
     * Returns: obj{instance}
     */
    var get_instance_by_id = function(id) {
        if(id==null){return null;}
        for(var i = 0; i<instances.length; i++) {
            if(instances[i].id == id){
                return instances[i];
            }
        }
        return null;
    }

    /*
     * Get all ancestors of the given concept, INCLUDING the given concept
     *
     * Returns: [obj{concept}]
     */
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

    /*
     * Get direct children of given concept
     *
     * Returns: [obj{concept}]
     */
    var get_children = function(concept){
        var children = [];
        for(var i = 0; i < concepts.length; i++){
            if(concepts[i].parents.indexOf(concept.id) > -1){
                children.push(concepts[i]);
            }
        }
        return children;
    }

    /* 
     * Get all children, grandchildren, etc. of given concept, INCLUDING the given concept
     *
     * Returns: [obj{concept}]
     */
    var get_recursive_children = function(concept){
        if(concept == null){return [];}
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

    /* 
     * Generate a skeleton of an instance based on the given name
     * and concept type.
     */
    var create_instance_skeleton = function(name, concept_name){
        var new_instance = {};
        new_instance.name = name;
        new_instance.concept_id = get_concept_by_name(concept_name).id;
        new_instance.id = new_instance_id();
        new_instance.sentences = [];
        new_instance.values = [];
        new_instance.relationships = [];
        return new_instance;
    }

    this.parse_rule = function(instruction){
        if(instruction == null){return null;}
        var rule = {};
        var then_string = null;
        var rel_facts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z]) then the (.*)/i);
        var val_facts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~ then the (.*)/i);
        if(rel_facts){
            rule.if = {};
            rule.if.concept = rel_facts[1];
            rule.if.relationship = {};
            rule.if.relationship.type = rel_facts[4];
            rule.if.relationship.label = rel_facts[3];
            then_string = rel_facts[6];
        }
        else if(val_facts){
            rule.if = {};
            rule.if.concept = val_facts[1];
            rule.if.value = {};
            rule.if.value.type = val_facts[3];
            rule.if.value.descriptor = val_facts[5];
            then_string = val_facts[6];
        }

        if(then_string){
            var then_rel_facts = then_string.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/i);
            var then_val_facts = then_string.match(/^([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~/i);
            if(then_rel_facts){
                rule.then = {};
                rule.then.concept = then_rel_facts[1];
                rule.then.relationship = {};
                rule.then.relationship.type = then_rel_facts[4];
                rule.then.relationship.label = then_rel_facts[3];
            }
            else if(then_val_facts){
                rule.then = {};
                rule.then.concept = then_val_facts[1];
                rule.then.value = {};
                rule.then.value.type = then_val_facts[3];
                rule.then.value.descriptor = then_val_facts[5];
            }
        }
        return rule;
    }

    var enact_rules = function(subject_instance, property_type, property){
        var concept = get_concept_by_id(subject_instance.concept_id);
        var rules = node.get_instances("rule");
        for(var i = 0; i < rules.length; i++){
            var rule = node.parse_rule(node.get_instance_value(rules[i], "instruction"));
            if(rule == null){return;}
            if(rule.if.concept == concept.name){

                var object_instance = null;
                
                if(property_type == "relationship" && rule.if.relationship != null){
                    object_instance = get_instance_by_id(property.target_id);
                }
                else if(property_type == "value" && rule.if.value != null){
                    object_instance = get_instance_by_id(property.type_id);
                }

                                
                if(object_instance != null){
                    var rule_if_children = get_recursive_parents(get_concept_by_id(object_instance.concept_id));
                    for(var j = 0; j < rule_if_children.length; j++){
                        if(rule_if_children[j].name.toLowerCase() == rule.if[property_type].type.toLowerCase()){
                            if(rule.then.relationship && rule.then.relationship.type == concept.name){
                                var relationship = {};
                                relationship.label = rule.then.relationship.label;
                                relationship.target_name = subject_instance.name;
                                relationship.target_id = subject_instance.id;
                                object_instance.relationships.push(relationship);
                            }
                            else if(rule.then.value && rule.then.value.type == concept.name){
                                var value = {};
                                value.descriptor = rule.then.value.descriptor;
                                value.type_name = subject_instance.name;
                                value.type_id = subject_instance.id;
                                object_instance.values.push(value);
                            }
                        }
                    }
                }
            }
        }
    } 



    /*
     * Submit CE to be processed by node. 
     * This may result in 
     *  - new concepts or instances being created
     *  - modifications to existing concepts or instances
     *  - no action (i.e. invalid or duplicate CE)
     *
     *  THIS METHOD SHOULD BE USED AS THE ONLY WAY TO MODIFY THE MODEL.
     *
     *  The nowrite argument is optional. If set to 'true', the method will behave
     *  as normal, but will not actually modify the node's model.
     * 
     * Returns: [bool, str] (bool = success, str = error or parsed string)
     */
    var parse_ce = function(t, nowrite){
        t = t.replace(/\s+/g, " ").replace(/\.+$/, "").trim(); // Replace all whitespace with a single space (e.g. removes tabs/newlines)
        var message = "";

        if(t.match(/^conceptualise an?/i)){
            var concept_name = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/i)[1];
            var stored_concept = get_concept_by_name(concept_name);
            var concept = null;
            if(stored_concept != null){ // if exists, simply modify existing concept
                message = "This concept already exists.";
                return [false, message];
                concept = stored_concept;
            }
            else{ // otherwise create a new one and add it to list
                concept = {};
                concept.values = [];
                concept.relationships = [];
                concept.parents = []
                concept.name = concept_name;
                concept.id = new_concept_id();

                // Writepoint
                if(nowrite == null || nowrite == false){
                    concepts.push(concept);
                }
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
                    else if(value.type == null){
                        message = "A property type is unknown: "+type_name;
                        return [false, message];
                    }

                    // Writepoint
                    if(nowrite == null || nowrite == false){
                        concept.values.push(value);
                    }
                } 

                // "is a parent_concept"
                if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
                    var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
                    var parent = get_concept_by_name(parent_name);
                    if(parent == null){
                        message = "Parent concept is unknown: "+parent_name;
                        return [false, message];
                    }
                    if(concept.parents.indexOf(parent.id) == -1){
                        // Writepoint
                        if(nowrite == null || nowrite == false){
                            concept.parents.push(parent.id);
                        }
                    }
                }
           }
            return [true, t];
        }

        else if(t.match(/^conceptualise the/i)){
            var concept = {};
            var concept_info = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z])/i);
            var concept_name = concept_info[1];
            
            concept = get_concept_by_name(concept_name);
            if(!concept || concept == {}){
               message = "Concept "+concept_name+" not known."; // if can't find concept, then fail
               return [false, message];
            }

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
                    if(target == null){
                        message = "The target of one of your input relationships is of an unknown type: "+target_name;
                        return [false, message];
                    }
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = facts_info[3];

                    // Writepoint
                    if(nowrite == null || nowrite == false){
                        concept.relationships.push(relationship);
                    }
                }

                // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
                if(fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
                    var facts_info = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
                    var target = {};
                    var target_name = facts_info[2];
                    target = get_concept_by_name(target_name);
                    if(target == null){
                        message = "The target of one of your input relationships is of an unknown type: "+target_name;
                        return [false, message];
                    }
                    
                    var relationship = {};
                    relationship.target = target.id;
                    relationship.label = facts_info[1];

                    // Writepoint
                    if(nowrite == null || nowrite == false){
                        concept.relationships.push(relationship);
                    }
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
                    else{
                        message = "There is an invalid value in your sentence: "+type_name;
                        return [false, message];
                    }
                    value.descriptor = facts_info[3];

                    // Writepoint
                    if(nowrite == null || nowrite == false){
                        concept.values.push(value);
                    }
                }

                // "is a parent_concept" (e.g. and is a entity)
                else if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
                    var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];

                    // Writepoint
                    if(nowrite == null || nowrite == false){
                        concept.parents.push(get_concept_by_name(parent_name).id);
                    }
                }
            }
            return [true, t];
        }

        else if(t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i) || t.match(/^the ([a-zA-Z0-9 ]*)/i)){
            var concept_facts_multiword, concept_facts_singleword, value_facts, relationship_facts_multiword, relationship_facts_singleword;
            var instance, concept;
            if(t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i)){
                var names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([^'\\]*(?:\\.[^'\\]*)*)'/i);
                if(names == null){
                    names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named ([a-zA-Z0-9]*)/i);
                    if(names == null){return [false, "Unable to determine name of instance."];}
                }
                var concept_name = names[1];
                var instance_name = names[2].replace(/\\/g, '');
                var concept = get_concept_by_name(concept_name);
                var current_instance = get_instance_by_name(instance_name);
                if(concept == null){
                    message = "Instance type unknown: "+concept_name;
                    return [false, message];
                }
                if(current_instance != null && current_instance.concept_id == concept.id){
                    message = "There is already an instance of this type with this name."; // Don't create 2 instances with same name and same concept id
                    return [false, message];
                }
                instance = create_instance_skeleton(instance_name, concept_name);
                instance.sentences.push(t);
                
                // Writepoint
                if(nowrite == null || nowrite == false){
                    instances.push(instance);
                }
                
                concept_facts_multiword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
                concept_facts_singleword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/g);
                value_facts = t.match(/(?:\bthat\b|\band\b) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
                relationship_facts_multiword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/g); 
                relationship_facts_singleword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/g);

            }
            else if(t.match(/^the ([a-zA-Z0-9 ]*)/i)) {
                var concept_name, instance_name;
                var names = t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i);
                if(names != null){
                    concept_name = names[1];
                    instance_name = names[2].replace(/\\/g, '');
                    instance = get_instance_by_name(instance_name);
                    concept = get_concept_by_name(concept_name);
                }
                if(names == null || concept == null || instance == null){
                    names = t.match(/^the ([a-zA-Z0-9 ]*)/i);
                    var name_tokens = names[1].split(" ");
                    for(var i = 0; i < concepts.length; i++){
                        if(names[1].toLowerCase().indexOf(concepts[i].name.toLowerCase()) == 0){
                            concept_name = concepts[i].name;
                            concept = concepts[i];
                            instance_name = name_tokens[concept.name.split(" ").length];
                            instance = get_instance_by_name(instance_name);
                            break;
                        }
                    }
                }
                
                if(concept == null || instance == null){
                    message = "Unknown concept/instance combination: "+concept_name+"/"+instance_name;
                    return [false, message];
                }

                // Writepoint
                if(nowrite == null || nowrite == false){
                    instance.sentences.push(t);
                }
                
                concept_facts_multiword = t.match(/(?:\bthat\b|\band\b|) has the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
                concept_facts_singleword = t.match(/(?:\bthat\b|\band\b|) has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/g);
                value_facts = t.match(/(?:\bthat\b|\band\b|) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
                relationship_facts_multiword = t.match(/(?:\bthat\b|\band\b|) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/g); 
               relationship_facts_singleword = t.match(/(?:\bthat\b|\band\b|) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/g);

            }

            if(concept == null || instance == null){
                message = "Unable to find instance type or name";
                return [false, message];
            }

            var concept_facts = [];
            if(concept_facts_multiword == null){concept_facts = concept_facts_singleword;}
            else{concept_facts = concept_facts_multiword.concat(concept_facts_singleword);}
            var relationship_facts = [];
            if(relationship_facts_multiword == null){relationship_facts = relationship_facts_singleword;}
            else{relationship_facts = relationship_facts_multiword.concat(relationship_facts_singleword);}

            var parents = get_recursive_parents(concept);
            var possible_values = [];
            var possible_relationships = [];
            for (var i = 0; i<parents.length; i++) {
                possible_values = possible_values.concat(parents[i].values);
                possible_relationships = possible_relationships.concat(parents[i].relationships);
            }

            if(concept_facts){for(var i = 0; i < concept_facts.length; i++){
                if(concept_facts[i] != null){
                    var fact = concept_facts[i].trim();
                    var value_type, value_instance_name, value_descriptor;
                    var facts_info = fact.match(/the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
                    if(facts_info != null){
                        value_type = facts_info[1];
                        value_instance_name = facts_info[2].replace(/\\/g, '');
                        value_descriptor = facts_info[3];
                    }
                    else{
                        facts_info = fact.match(/(?:\bthat\b|\band\b) ?has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/);
                        var value_type = "";
                        var type_name_tokens = facts_info[1].split(" ");
                        for(var j = 0; j < type_name_tokens.length-1; j++){value_type+=type_name_tokens[j]+" ";}
                        value_type = value_type.trim();
                        value_instance_name = type_name_tokens[type_name_tokens.length-1].trim();
                        value_descriptor = facts_info[2];   
                    }
                    //console.log("VAL: "+value_descriptor+","+value_type+","+value_instance_name);
                    if(value_descriptor!=""&&value_type!=""&&value_instance_name!=""){
                        var value_instance = get_instance_by_name(value_instance_name);
                        if(value_instance == null) {
                            value_instance = create_instance_skeleton(value_instance_name, value_type);
                            
                            // Writepoint 
                            if(nowrite == null || nowrite == false){
                                value_instance.sentences.push(t);
                                instances.push(value_instance);
                            }
                        }
                        var value = {};
                        value.type_id = value_instance.id;
                        value.type_name = value_instance.name;
                        value.descriptor = value_descriptor;

                        for (var j = 0; j < possible_values.length; j++) {
                            if(possible_values[j] != null && value_descriptor == possible_values[j].descriptor) {

                                // Writepoint 
                                if(nowrite == null || nowrite == false){
                                    instance.values.push(value);
                                    enact_rules(instance, "value", value);
                                }
                                break;
                            }
                        }
                    }
                }
            }}

            if(value_facts){for(var i = 0; i < value_facts.length; i++){
                if(value_facts[i] != null){
                    var fact = value_facts[i].trim();
                    var facts_info = fact.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
                    var value_value = facts_info[1].replace(/\\/g, '');
                    var value_descriptor = facts_info[2];
                    
                    var value = {};
                    value.type_name = value_value;
                    value.type_id = 0;
                    value.descriptor = value_descriptor;

                    for (var j = 0; j < possible_values.length; j++) {
                        if (possible_values[j] != null && value_descriptor == possible_values[j].descriptor) {

                            // Writepoint 
                            if(nowrite == null || nowrite == false){
                                instance.values.push(value);
                            }
                            break;
                        }
                    }
                    //console.log("VAL: "+value.descriptor+","+value.type_name);
                }
            }}

            if(relationship_facts){for(var i = 0; i < relationship_facts.length; i++){
                if(relationship_facts[i] != null){
                    var fact = relationship_facts[i].trim();
                    var relationship_label, relationship_type_name, relationship_instance_name;
                    var facts_info = fact.match(/(?:\bthat\b|\band\b|) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/);
                    if(facts_info != null){
                        relationship_label = facts_info[1];
                        relationship_type_name = facts_info[2];
                        relationship_instance_name = facts_info[3].replace(/\\/g, '');
                    }
                    else{
                        facts_info = fact.match(/(?:\bthat\b|\band\b|) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/);
                        var type_instance_tokens = facts_info[2].split(" ");
                        relationship_type_name = "";
                        for(var j = 0; j < type_instance_tokens.length-1; j++){relationship_type_name+=type_instance_tokens[j]+" ";}
                        relationship_label = facts_info[1];
                        relationship_type_name = relationship_type_name.trim();
                        relationship_instance_name = type_instance_tokens[type_instance_tokens.length-1].trim();
                    }
                    //console.log("REL: "+relationship_label+","+relationship_type_name+","+relationship_instance_name);
                    if(relationship_label!=""&&relationship_type_name!=""&&relationship_instance_name!=""){
                        var relationship_type = get_concept_by_name(relationship_type_name);
                        var relationship_instance = get_instance_by_name(relationship_instance_name);
                        if(relationship_type == null){
                            //message = "Unknown relationship type: "+relationship_type_name;
                            //return [false, message];
                        }
                        else{
                            if(relationship_instance == null){
                                relationship_instance = create_instance_skeleton(relationship_instance_name, relationship_type_name);

                                // Writepoint
                                if(nowrite == null || nowrite == false){
                                    relationship_instance.sentences.push(t);
                                    instances.push(relationship_instance);
                                }
                            }

                            var relationship = {};
                            relationship.label = relationship_label;
                            relationship.target_name = relationship_instance.name;
                            relationship.target_id = relationship_instance.id;

                            for(var j = 0; j < possible_relationships.length; j++){
                                if(possible_relationships[j] != null && relationship_label == possible_relationships[j].label){
                                
                                    // Writepoint
                                    if(nowrite == null || nowrite == false){
                                        instance.relationships.push(relationship);
                                        enact_rules(instance, "relationship", relationship);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }}

            //console.log(instance);
            return [true, t];
        }
        return [false, null];
    }

    /*
     * Submit a who/what/where question to be processed by node. 
     * This may result in 
     *  - a response to the question returned
     *  - error returned (i.e. invalid question)
     * This method does not update the conceptual model.
     *
     * Returns: [bool, str] (bool = success, str = error or response)
     */
    var parse_question = function(t){
        if(t.match(/^where (is|are)/i)){
            var thing = t.match(/^where (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '');//.replace(/(\bthe\b|\ba\b)/g, '').trim();
            var instance = get_instance_by_name(thing);
            if(instance == null){
                message = "I don't know what "+thing+" is.";
                return [true, message];
            }
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
            if(places.length == 0){
                message = "I don't know where "+instance.name+" is.";
                return [true, message];
            }
            message = instance.name+" "+places.join(" and ")+".";
            return [true, message];
        }

        else if(t.match(/^(\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)/i)){
            var thing = t.match(/^(?:\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g,'').replace(/\bthe\b/g, '').replace(/'/g, '');
            var instance = null;
            var locatable_instances = node.get_instances("location", true);
            var located_instances = [];
            for(var i = 0; i < locatable_instances.length; i++){
                if(thing.toLowerCase().indexOf(locatable_instances[i].name.toLowerCase()) > -1){
                    instance = locatable_instances[i];break;
                }
            }
            if(instance == null){
                message = thing+" is not an instance of type location.";
                return [true, message];
            }
            var ins_type = node.get_instance_type(instance);
            for(var i = 0; i < instances.length; i++){
                var vals = instances[i].values;
                var rels = instances[i].relationships;
                if(vals!=null){for(var j = 0; j < vals.length; j++){
                    if(vals[j].type_id == instance.id){
                        located_instances.push("the "+node.get_instance_type(instances[i])+" "+instances[i].name+" has the "+ins_type+" "+instance.name+" as "+vals[j].descriptor);
                    }
                }}   
                if(rels!=null){for(var j = 0; j < rels.length; j++){
                    if(rels[j].target_id == instance.id){
                        located_instances.push("the "+node.get_instance_type(instances[i])+" "+instances[i].name+" "+rels[j].label+" the "+ins_type+" "+instance.name);
                    }
                }}
            }
            if(located_instances.length == 0){
                message = "I don't know what is located in/on/at the "+ins_type+" "+instance.name+".";
                return [true, message];
            }
            message = located_instances.join(" and ")+".";
            return [true, message];
        }

        else if(t.match(/^(\bwho\b|\bwhat\b) (?:is|are)/i)){
            t = t.replace(/\?/g,'').replace(/'/g, '').replace(/\./g, '');

            // If we have an exact match (i.e. 'who is The Doctor?')
            var name = t.match(/^(\bwho\b|\bwhat\b) (?:is|are) ([a-zA-Z0-9 ]*)/i);
            var instance;
            if(name){
              instance = get_instance_by_name(name[2]);
              if(instance != null){
                return [true, node.get_instance_gist(instance)];
              }            
            }

            // Otherwise, try and infer it
            name = t.match(/^(?:\bwho\b|\bwhat\b) (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '').replace(/'/g, '');
            instance = get_instance_by_name(name);
            if(instance == null){
                var concept = get_concept_by_name(name);
                if(concept == null){
                    var possibilities = [];
                    for(var i = 0; i < concepts.length; i++){
                        for(var j = 0; j < concepts[i].values.length; j++){
                            var v = concepts[i].values[j];
                            if(v.descriptor.toLowerCase() == name.toLowerCase()){
                                if(v.type == 0){
                                    possibilities.push("is a possible value of a type of "+concepts[i].name+" (e.g. \"the "+concepts[i].name+" '"+concepts[i].name.toUpperCase()+" NAME' has 'VALUE' as "+name+"\")");
                                }
                                else{
                                    var val_type = get_concept_by_id(v.type);
                                    possibilities.push("is a possible "+val_type.name+" type of a type of "+concepts[i].name+" (e.g. \"the "+concepts[i].name+" '"+concepts[i].name.toUpperCase()+" NAME' has the "+val_type.name+" '"+val_type.name.toUpperCase()+" NAME' as "+name+"\")");
                                }
                            }       
                        }
                        for(var j = 0; j < concepts[i].relationships.length; j++){
                            var r = concepts[i].relationships[j];
                            if(r.label.toLowerCase() == name.toLowerCase()){
                                var r_type = get_concept_by_id(r.target);
                                possibilities.push("describes the relationship between a type of "+concepts[i].name+" and a type of "+r_type.name+" (e.g. \"the "+concepts[i].name+" '"+concepts[i].name.toUpperCase()+" NAME' "+name+" the "+r_type.name+" '"+r_type.name.toUpperCase()+" NAME'\")");
                            }
                        }
                    }
                    if(possibilities.length > 0){
                        return [true, "'"+name+"' "+possibilities.join(" and ")+"."];
                    }
                    else{return [true, "I don't know who or what that is."];}
                }
                else{
                    return [true, node.get_concept_gist(concept)];
                }
            }
            else{
                return [true, node.get_instance_gist(instance)];
            }
        }

        else if(t.match(/^list (\ball\b|\binstances\b)/i)){
            var ins = [];
            var s = "";
            if(t.toLowerCase().indexOf("list instances of type") == 0){
                var con = t.toLowerCase().replace("list instances of type", "").trim();
                ins = node.get_instances(con);
                s = "Instances of type '"+con+"':";
            }
            else if(t.toLowerCase().indexOf("list all instances of type") == 0){
                var con = t.toLowerCase().replace("list all instances of type", "").trim();
                ins = node.get_instances(con, true);
                s = "All instances of type '"+con+"':";
            }
            else if(t.toLowerCase() == "list instances"){
                ins = instances;        
                s = "All instances:";
            }
            if(ins.length == 0){
                return [true, "I could not find any instances matching your query."];
            }
            var names = [];
            for(var i = 0; i < ins.length; i++){
                names.push(ins[i].name);
            }       
            return [true, s+" "+names.join(", ")];
        }
        return [false, null];
    }

    // RETURNS A STRING REPRESENTING A GUESS AT WHAT THE INPUT MEANT 
    // (e.g. a sort of "Did you mean 'x'?" that can be embedded in a confirm card
    /*
     * Submit natural language to be processed by node. 
     * This results in 
     *  - string representing what the node THINKS the input is trying to say.
     *      (this could be returned as a confirm card
     * This method does not update the conceptual model.
     *
     * Returns: str 
     */
    var parse_nl = function(t){
        t = t.replace(/'/g, '').replace(/\./g, '');
        var tokens = t.split(" ");
        var and_facts = t.split(/\band\b/);

        // Try to find any mentions of known instances and tie them together using
        // values and relationships.
        
        var common_words = ["there", "what", "who", "where", "theres", "is", "as", "and", "has", "that", "the", "a", "an", "named", "called", "name", "with", "conceptualise", "on", "at", "in"];
        var focus_instance=null;
        var smallest_index = 999999;
        for(var i = 0; i < instances.length; i++){
            if(t.toLowerCase().indexOf(instances[i].name.toLowerCase()) > -1){
                if(t.toLowerCase().indexOf(instances[i].name.toLowerCase()) < smallest_index){
                    focus_instance = instances[i];
                    smallest_index = t.toLowerCase().indexOf(instances[i].name.toLowerCase());
                }
            }
        }
        if(focus_instance != null){
            var focus_concept = get_concept_by_id(focus_instance.concept_id);

            var focus_instance_words = focus_instance.name.toLowerCase().split(" ");
            var focus_concept_words = focus_concept.name.toLowerCase().split(" ");
            for(var i = 0; i < focus_instance_words.length; i++){common_words.push(focus_instance_words[i]);}
            for(var i = 0; i < focus_concept_words.length; i++){common_words.push(focus_concept_words[i]);}

            var ce = "the "+focus_concept.name+" '"+focus_instance.name+"' ";
            var facts = [];

            var parents = get_recursive_parents(focus_concept);
            var possible_relationships = [];
            var possible_values = [];
            for (var i = 0; i<parents.length; i++) {
                possible_relationships = possible_relationships.concat(parents[i].relationships);
                possible_values = possible_values.concat(parents[i].values);
            }

            var and_facts = t.split(/\band\b/g);
            for(var k = 0; k < and_facts.length; k++){
                var f = and_facts[k].toLowerCase(); 
                var fact_tokens = f.split(" ");
                for(var i = 0; i < possible_values.length; i++){
                    var value_words = possible_values[i].descriptor.toLowerCase().split(" ");
                    for(var j = 0; j < value_words.length; j++){common_words.push(value_words[j]);}

                    if(possible_values[i].type > 0){
                        var value_concept = get_concept_by_id(possible_values[i].type);
                        var value_instances = node.get_instances(value_concept.name, true);
                        for(var j = 0; j < value_instances.length; j++){
                            if(f.toLowerCase().indexOf(value_instances[j].name.toLowerCase())>-1){
                                facts.push("has the "+value_concept.name+" '"+value_instances[j].name+"' as "+possible_values[i].descriptor);
                                break;
                            }
                        }
                    }
                    else{
                        if(f.toLowerCase().indexOf(possible_values[i].descriptor.toLowerCase()) > -1){
                            var value_name = "";
                            for(var j = 0; j < fact_tokens.length; j++){
                                if(common_words.indexOf(fact_tokens[j].toLowerCase()) == -1 ){
                                    value_name += fact_tokens[j]+" ";
                                }
                            }
                            if(value_name != ""){
                                facts.push("has '"+value_name.trim()+"' as "+possible_values[i].descriptor);
                            }   
                        }
                    }
                }
                for(var i = 0; i < possible_relationships.length; i++){
                    if(possible_relationships[i].target > 0){
                        var rel_concept = get_concept_by_id(possible_relationships[i].target);
                        var rel_instances = node.get_instances(rel_concept.name, true);
                        for(var j = 0; j < rel_instances.length; j++){
                            if(f.toLowerCase().indexOf(rel_instances[j].name.toLowerCase())>-1){
                                facts.push(possible_relationships[i].label+" the "+rel_concept.name+" '"+rel_instances[j].name+"'");
                                break;
                            }
                        }
                    }
                }
            }
            if(facts.length > 0){
                return [true,ce+facts.join(" and ")];
            }
        }

        for(var i = 0; i < concepts.length; i++){
            if(t.toLowerCase().indexOf(concepts[i].name.toLowerCase()) > -1){
                var concept_words = concepts[i].name.toLowerCase().split(" ");
                common_words.push(concepts[i].name.toLowerCase());
                for(var j = 0; j < concept_words; j++){
                    common_words.push(concept_words[j]);
                }
                var new_instance_name = "";
                for(var j = 0; j < tokens.length; j++){
                    if(common_words.indexOf(tokens[j].toLowerCase()) == -1){
                        new_instance_name += tokens[j]+" ";
                    }
                }
                if(new_instance_name != ""){
                    return [true, "there is a "+concepts[i].name+" named '"+new_instance_name.trim()+"'"];
                }
                return [true, "there is a "+concepts[i].name+" named '"+concepts[i].name+" "+instances.length+1+"'"];
            }
        }
        return [false, "Un-parseable input: "+t];
    }

    /*
     * Return a string representing a guess at what the user is trying to say next.
     * Actually what is returned is the input string + the next word/phrase based on:
     *  - current state of conceptual model (i.e. names/relationships of concepts/instances)
     *  - key words/phrases (e.g. "conceptualise a ")
     *
     * Returns: str
     */
    this.guess_next = function(t){
        var s = t.trim().toLowerCase();
        var tokens = t.split(" ");
        var last_word = tokens[tokens.length-1];
        var last_concept = concepts[concepts.length-1];
        var number_of_tildes = 0;
        var index_of_first_tilde = 0;
        for(var i = 0; i < tokens.length; i++){if(tokens[i] == "~"){number_of_tildes++;if(number_of_tildes==1){index_of_first_tilde=i;}}}
        var possible_words = [];
        if(t == ""){return t;}
        if(number_of_tildes == 1){
            return t+" ~ "+tokens[index_of_first_tilde+1].charAt(0).toUpperCase()+" ";
        }
        if(s.match(/^conceptualise a ~ (.*) ~ [A-Z] /)){
            return t+" that ";
        }   

        if(tokens.length < 2){
            possible_words.push("conceptualise a ~ ");
            possible_words.push("there is a ");
            possible_words.push("where is ");
            possible_words.push("what is ");
            possible_words.push("who is ");
        }
        if(tokens.length > 2){
            possible_words.push("named '");
            possible_words.push("that ");
            possible_words.push("is a ");
            possible_words.push("and is ");
            possible_words.push("and has the ");
            possible_words.push("the ");
        } 

        var mentioned_instances = [];

        if(s.indexOf("there is") == -1 || tokens.length == 1){
            for(var i = 0; i < instances.length; i++){
                possible_words.push(instances[i].name);
                if(s.indexOf(instances[i].name.toLowerCase()) > -1){
                    mentioned_instances.push(instances[i]);
                }
            }
        }
        for(var i = 0; i < concepts.length; i++){
            possible_words.push(concepts[i].name);
            var concept_mentioned = false;
            for(var j = 0; j < mentioned_instances.length; j++){
                if(mentioned_instances[j].concept_id == concepts[i].id){concept_mentioned = true;break;}
            }
            if(s.indexOf(concepts[i].name.toLowerCase()) > -1 || concept_mentioned){
                for(var j = 0; j < concepts[i].values.length; j++){possible_words.push(concepts[i].values[j].descriptor);}
                for(var j = 0; j < concepts[i].relationships.length; j++){possible_words.push(concepts[i].relationships[j].label);}
            }
        }
        for(var i = 0; i < possible_words.length; i++){
            if(possible_words[i].toLowerCase().indexOf(tokens[tokens.length-1].toLowerCase()) == 0){
                tokens[tokens.length-1] = possible_words[i];
                return tokens.join(" ");
            }
        }
        return t;
    }

    /*
     * Get the current set of instances maintained by the node.
     *
     * If concept_type and recurse NULL:
     *  - Return ALL instances
     *
     * If concept_type not NULL and recurse NULL|FALSE:
     *  - Return all instances with concept type name 'concept_type'
     *
     * If recurse TRUE:
     *  - Return all instances of concepts that are children, grandchildren, etc.
     *      of concept with name 'concept_type'
     *
     * Returns: [obj{instance}]
     */
    this.get_instances = function(concept_type, recurse){
        var instance_list = [];
        if(concept_type == null){
            instance_list = instances;
        }
        else if(concept_type != null && (recurse == null || recurse == false)){
            var concept = get_concept_by_name(concept_type);
            if(concept == null){
                return instance_list;
            }
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

    /*
     * Get all concepts known by the node
     *
     * Returns: [obj{concept}]
     */
    this.get_concepts = function(){
        return concepts;
    }

    /*
     * Set the name of the local agent
     *
     * Returns: void
     */
    this.set_agent_name = function(new_name){
        if(new_name != null){
            agent.set_name(new_name);
        }
    }

    /*
     * Get the current name of the local agent
     *
     * Returns: str
     */
    this.get_agent_name = function(){
        return agent.get_name();
    }   

    /*
     * Get the CEAgent object attached to this node
     *
     * Returns: CEAgent obj
     */
    this.get_agent = function(){
        return agent;
    }
    
    /*
     * Generate CE that describes the instance.
     * e.g.: "there is a teacher named 'T1' that..."
     *
     * Returns: str
     */
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
        return ce+".";
    }

    /* 
     * Generate gist describing the instance.
     * e.g.: "T1 is a teahcer. T1 teaches the..."
     *
     * Returns: str
     */
    this.get_instance_gist = function(instance){
        var vowels = ["a", "e", "i", "o", "u"];
        var concept = get_concept_by_id(instance.concept_id);
        if(concept == null){return;}
        var ce = instance.name+" is";
        if(vowels.indexOf(concept.name.toLowerCase()[0]) > -1){ce+=" an "+concept.name+".";}
        else{ce+=" a "+concept.name+".";}
        var facts = {};
        var fact_found = false;
        if(instance.values!=null){for(var i = 0; i < instance.values.length; i++){
            fact_found = true;
            var value = instance.values[i];
            var fact = "";
            if(value.type_id == 0){
                fact = "has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.descriptor;
            }
            else{
                var value_instance = get_instance_by_id(value.type_id);
                var value_concept = get_concept_by_id(value_instance.concept_id);
                fact = "has the "+value_concept.name+" '"+value_instance.name+"' as "+value.descriptor;
            }
            if(!(fact in facts)){
                facts[fact] = 0;
            }
            facts[fact]++;
        }}
        if(instance.relationships!=null){for(var i = 0; i < instance.relationships.length; i++){
            fact_found = true;
            var relationship = instance.relationships[i];
            var relationship_instance = get_instance_by_id(relationship.target_id);
            var relationship_concept = get_concept_by_id(relationship_instance.concept_id);
            var fact = relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'";
            if(!(fact in facts)){
                facts[fact] = 0;
            }
            facts[fact]++;
        }}
        if(fact_found){
            ce += " "+instance.name;
            for(fact in facts){
                ce += " "+fact;
                if(facts[fact] > 1){
                    ce += " ("+facts[fact]+" times)";
                }
                ce += " and";
            }
            ce = ce.substring(0, ce.length - 4)+"."; // Remove last ' and' and add full stop

        }
        return ce;     
    }

    /*
     * Generate CE describing conceptualising the given concept.
     * e.g.: "conceptualise a ~ teacher ~ T that..."
     *
     * Returns: str
     */
    this.get_concept_ce = function(concept){
        var ce = "conceptualise a ~ "+concept.name+" ~ "+concept.name.charAt(0).toUpperCase();
        if(concept.parents.length > 0){ce += " that";}
        for(var i = 0; i < concept.parents.length; i++){
            p = get_concept_by_id(concept.parents[i]);
            ce+= " is a "+p.name;
            if(i < concept.parents.length-1){ce+=" and";}
        }
        var facts = [];
        var alph = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"];
        for(var i = 0; i < concept.values.length; i++){
            if(concept.values[i].type == 0){
                facts.push("has the value "+alph[i]+" as "+concept.values[i].descriptor);
            }
            else{
                var val_type = get_concept_by_id(concept.values[i].type);
                facts.push("has the "+val_type.name+" "+val_type.name.charAt(0).toUpperCase()+" as "+concept.values[i].descriptor);
            }
        }    
        if(facts.length > 0){
            ce += " "+facts.join(" and ");
        }
        ce+=".";
        if(concept.relationships.length > 0){
            facts = [];
            ce += "\nconceptualise the "+concept.name+" "+concept.name.charAt(0).toUpperCase();
            for(var i = 0; i < concept.relationships.length; i++){
                var rel_type = get_concept_by_id(concept.relationships[i].target);
                facts.push("~ "+concept.relationships[i].label+" ~ the "+rel_type.name+" "+rel_type.name.charAt(0).toUpperCase());
            }
            if(facts.length > 0){
                ce += " "+facts.join(" and ")+".";
            }
        }

        return ce;
    }

    /* 
     * Generate gist describing the given concept.
     * e.g. "A teacher is a type of person and teaches a type of class and ..."
     *
     * Returns: str
     */
    this.get_concept_gist = function(concept){
        var ce = "";
        if(concept.parents.length > 0){ce += "A "+concept.name;}
        for(var i = 0; i < concept.parents.length; i++){
            p = get_concept_by_id(concept.parents[i]);
            ce+= " is a type of "+p.name;
            if(i < concept.parents.length-1){ce+=" and";}
        }
        if(concept.parents.length > 0){ce+=".";}
        var facts = [];
        for(var i = 0; i < concept.values.length; i++){
            if(concept.values[i].type == 0){
                facts.push("has a value called "+concept.values[i].descriptor);
            }
            else{
                var val_type = get_concept_by_id(concept.values[i].type);
                facts.push("has a type of "+val_type.name+" called "+concept.values[i].descriptor);
            }
        }    
        for(var i = 0; i < concept.relationships.length; i++){
            var rel_type = get_concept_by_id(concept.relationships[i].target);
            facts.push(concept.relationships[i].label+" a type of "+rel_type.name);
        }
        if(facts.length > 0){
            ce += " An instance of "+concept.name+" "+facts.join(" and ")+".";
        }
        else if(facts.length == 0 && concept.parents.length == 0){
            ce += "A "+concept.name+" has no attributes or relationships.";
        }
        return ce;
    }

    /*
     * Adds a sentence to be processed by the node.
     * This method will ALWAYS return a response by dynamically
     * checking whether input is pure CE, a question, or NL.
     *
     * Method will initially attempt to parse any CE.
     * If CE-parsing unsuccessful, then try to parse a question.
     * If no meaning can be found (CE or question), then make a guess.
     *
     * Method returns an object with useful information. The 'type' field
     * specifies the type of the card to respond with (e.g. tell/gist/confirm).
     * The 'data' field contains the actual body.
     *
     * Returns: {type: str, data: str}
     */
    this.add_sentence = function(sentence){
        sentence = sentence.trim();
        sentence = sentence.replace("{now}", new Date().getTime());
        sentence = sentence.replace("{uid}", new_card_id());
        var return_data = {};

        var ce_success = parse_ce(sentence);
        if(ce_success[0] == false){
            var question_success = parse_question(sentence);
            if(question_success[0] == false){
                var nl_success = parse_nl(sentence);
                if(nl_success[0] == false){
                    return_data.type = "gist";
                }
                else{
                    return_data.type = "confirm";
                }
                return_data.data = nl_success[1];
            }
            else{
                return_data.type = "gist";
                return_data.data = question_success[1];
            }
        }
        else{
            return_data.type = "tell";
            return_data.data = ce_success[1];
        }
        return return_data;
    }

    /*
     * Attempt to parse CE and add data to the node.
     * Indicates whether CE was successfully parsed.
     * Output data string is the input text.
     *
     * nowrite is an optional argument that asks parse_ce() not
     * to actually update the model.
     *
     * Returns: {success: bool, type: str, data: str}
     */
    this.add_ce = function(sentence, nowrite){
        sentence = sentence.trim();
        sentence = sentence.replace("{now}", new Date().getTime());
        sentence = sentence.replace("{uid}", new_card_id());
        var return_data = {};
        var success = parse_ce(sentence, nowrite);
        return_data.success = success[0];
        return_data.type = "gist";
        return_data.data = success[1];
        return return_data;
    }

    /*
     * Attempt to query the node.
     * Indicates success of whether a valid question was parsed
     * Output data string is the response, if any.
     *
     * Returns: {success: bool, type: str, data: str}
     * (Note that type and data will be null unless success = true)
     */
    this.ask_question = function(sentence){
        var return_data = {};
        var success = parse_question(sentence);
        return_data.success = success[0];
        if(success[0] == true){
            return_data.type = "gist";
            return_data.data = success[1];
        }
        return return_data;
    }

    /*
     * Attempt to parse NL.
     * Method does not update the conceptual model.
     * Method returns a response representing a CE 'guess' of the input sentence
     *
     * Returns: {type: str, data: str}
     */
    this.add_nl = function(sentence){
        var return_data = {};
        var success = parse_nl(sentence);
        if(success[0] == true){
            return_data.type = "confirm";
        }
        else{
            return_data.type = "gist";
        }
        return_data.data = success[1];
        return return_data;
    }

    /*
     * Add an array of sentences to the node. Uses add_sentence()
     * to process these so refer to that method for information.
     *
     * Returns an array of responses generated by add_sentence()
     *
     * Returns: [[bool, str]...]
     */
    this.add_sentences = function(sentences){
        var responses = [];
        for(var i = 0; i < sentences.length; i++){
            responses.push(this.add_sentence(sentences[i]));
        }
        return responses;
    }

    /*
     * Add an array of CE sentences to the node.
     *
     * Returns an array of responses generated by add_ce()
     *
     * Returns: [[bool, str]...]
     */
    this.load_model = function(sentences){
        var responses = [];
        for(var i = 0; i < sentences.length; i++){
            responses.push(this.add_ce(sentences[i]));
        }
        return responses;
    }

    /*
     * Reset store to 'factory settings' by removing all known instances
     * and concepts.
     *
     * Returns: void
     */
    this.reset_all = function(){
        instances = [];
        concepts = [];
    }

    /* 
     * Initialise node by adding any passed models as
     * sentence sets to be processed.
     */
    this.init = function(){
        for(var i = 0; i < this.models.length; i++){
            this.load_model(this.models[i]);
        }
    }
    this.init();
}


function CEAgent(n){
    var name = "Moira";
    var last_successful_request = 0;
    var node = n;
    var unsent_tell_cards = {};
    var unsent_ask_cards = {};
    var handled_cards = [];

    this.set_name = function(n){
        name = n;
    }
    this.get_name = function(){
        return name;
    }
    this.get_last_successful_request = function(){
        return last_successful_request;
    }

    var handle_card = function(card){
      try{
        var from = node.get_instance_relationship(card, "is from");
        var tos = node.get_instance_relationships(card, "is to");
        var content = node.get_instance_value(card, "content");
        var type = node.get_instance_type(card);
        var sent_to_this_agent = false;

        // Determine whether or not to read or ignore this card:
        if(handled_cards.indexOf(card.name) > -1){return;}
        handled_cards.push(card.name);
        if(content == null){return;}
        for(var i = 0; i < tos.length; i++){
            if(tos[i].name.toLowerCase() == name.toLowerCase()){
                sent_to_this_agent = true;
                break;
            }
        }
        if(sent_to_this_agent == false){return;}

        /*
         * Now handle the actual card:
         */

        if(type == "ask card"){
            // Get the relevant information from the node
            var data = node.ask_question(content);

            var ask_policies = node.get_instances("ask policy");
            for(var j = 0; j < ask_policies.length; j++){
                if(node.get_instance_value(ask_policies[j], "enabled") == 'true'){
                    var target_name = node.get_instance_value(ask_policies[j], "target").name;
                    if(!(target_name in unsent_ask_cards)){unsent_ask_cards[target_name] = [];}
                    unsent_ask_cards[target_name].push(card); 
                }
            }


            // Prepare the response 'tell card' to the input 'ask card' and add this back to the local model
            var froms = node.get_instance_relationships(card, "is from");
            var urls, c;
            if(data.data){
              urls = data.data.match(/(https?:\/\/[a-zA-Z0-9\.\/\-\+_&=\?\!%]*)/gi);
              c = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content";
            }
            else{
              c = "there is a gist card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has 'Sorry; your question was not understood.' as content";
            }

            for(var j = 0; j < froms.length; j++){
                var type = node.get_instance_type(froms[j]);
                c+=" and is to the "+type+" '"+froms[j].name+"'";
            }
            if(urls!=null){for(var j = 0; j < urls.length; j++){
                c+=" and has '"+urls[j]+"' as linked content";
            }}
            node.add_sentence(c);
        }
        else if(type == "tell card"){
            // Add the CE sentence to the node
            var data = node.add_ce(content); 

            if(data.success == true){
                // Add sentence to any active tell policy queues
                var tell_policies = node.get_instances("tell policy");
                for(var j = 0; j < tell_policies.length; j++){
                    if(node.get_instance_value(tell_policies[j], "enabled") == 'true'){
                        var target_name = node.get_instance_value(tell_policies[j], "target").name;
                        if(!(target_name in unsent_tell_cards)){unsent_tell_cards[target_name] = [];}
                        unsent_tell_cards[target_name].push(card); 
                    }
                }
            }

            // Check feedback policies to see if input 'tell card' requires a response
            // The type of response card is determined by the way it was handled by the node (nl, gist, tell, etc.)
            var feedback_policies = node.get_instances("feedback policy");
            for(var j = 0; j < feedback_policies.length; j++){
                var target = node.get_instance_value(feedback_policies[j], "target");
                var enabled = node.get_instance_value(feedback_policies[j], "enabled");
                var ack = node.get_instance_value(feedback_policies[j], "acknowledgement");
                if(target.name.toLowerCase() == from.name.toLowerCase() && enabled == 'true'){
                    var target_concept = node.get_instance_type(target);
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
                    node.add_sentence("there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+target_concept+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+c.replace(/'/g, "\\'")+"' as content.");
                }
            }
        }
        else if(type == "nl card"){
            var new_card = null;
            // Firstly, check if card content is valid CE, but without writing to model:
            var data = node.add_ce(content, true);

            // If valid CE, then replicate the nl card as a tell card and re-add to model (i.e. 'autoconfirm')
            if(data.success == true){
                new_card = "there is a tell card named 'msg_{uid}' that is from the "+node.get_instance_type(from)+" '"+from.name.replace(/'/g, "\\'")+"' and is to the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+content.replace(/'/g, "\\'")+"' as content.";
            }   
            // If invalid CE, then try responding to a question 
            else{
                data = node.ask_question(content);
                
                // If question was success, return a response
                if(data.success == true){
                  new_card = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+node.get_instance_type(from)+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content.";
                }
      
                // If question not understood then place the response to the NL card in a new response
                else{
                  data = node.add_nl(content);       
                  new_card = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+node.get_instance_type(from)+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content.";
                }
            }
            node.add_sentence(new_card);
        }
      }
      catch(err){
        console.log(err);
      }
    }

    var poll_cards = function(){
        setTimeout(function(){
            var card_list = node.get_instances("card", true);
            for(var i = 0; i < card_list.length; i++){
                handle_card(card_list[i]); 
            }
            poll_cards();
        }
        , 200);
    }

    var get_instance = function(){
        var instances = node.get_instances("agent");
        for(var i = 0; i < instances.length; i++){
            if(instances[i].name.toLowerCase() == name.toLowerCase()){
                return instances[i];
            }
        }
        return null;
    }

    var enact_policies = function(){
        setTimeout(function(){//try{
            var tell_policies = node.get_instances("tell policy");
            var ask_policies = node.get_instances("ask policy");
            var listen_policies = node.get_instances("listen policy");
            var forwardall_policies = node.get_instances("forwardall policy");

            // For each tell policy in place, send all currently-untold cards to each target
            // To save on transit costs, if there are multiple cards to be sent to one target, they are 
            // separated by new line (\n)
            for(var i = 0; i < tell_policies.length; i++){
                var target = node.get_instance_value(tell_policies[i], "target");
                var cards = unsent_tell_cards[target.name];
                if(cards){
                    var data = "";
                    for(var j = 0; j < cards.length; j++){
                        var card = cards[j];
                        var from = node.get_instance_relationship(card, "is from");
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
                        net.make_request("POST", node.get_instance_value(target, "address"), POST_SENTENCES_ENDPOINT, data, function(resp){
                            last_successful_request = new Date().getTime();
                            unsent_tell_cards[target.name] = [];
                        });
                    }
                }
            }

            // For each ask policy in place, send all currently-untold cards to each target
            // To save on transit costs, if there are multiple cards to be sent to one target, they are 
            // separated by new line (\n)
            for(var i = 0; i < ask_policies.length; i++){
                var target = node.get_instance_value(ask_policies[i], "target");
                var cards = unsent_ask_cards[target.name];
                if(cards){
                    var data = "";
                    for(var j = 0; j < cards.length; j++){
                        var card = cards[j];
                        var from = node.get_instance_relationship(card, "is from");
                        if(from.name.toLowerCase() != target.name.toLowerCase()){ // Don't send back a card sent from target agent
                            var rel = {};
                            rel.target_name = target.name;
                            rel.target_id = target.id;
                            rel.label = "is to";
                            var rel2 = {};
                            rel2.target_name = name;
                            rel2.target_id = get_instance().id;
                            rel2.label = "is from";
                            card.relationships.push(rel);
                            card.relationships.push(rel2);
                            data += node.get_instance_ce(card)+"\n";
                        }
                    }
                    if(data != ""){
                        net.make_request("POST", node.get_instance_value(target, "address"), POST_SENTENCES_ENDPOINT, data, function(resp){
                            last_successful_request = new Date().getTime();
                            unsent_ask_cards[target.name] = [];
                        });
                    }
                }
            }

            // For each listen policy in place, make a GET request to get cards addressed to THIS agent, and add to node
            for(var i = 0; i < listen_policies.length; i++){
                var target = node.get_instance_value(listen_policies[i], "target");
                net.make_request("GET", node.get_instance_value(target, "address"), GET_CARDS_ENDPOINT+"?agent="+name, null, function(resp){
                    last_successful_request = new Date().getTime();
                    var cards = resp.split("\n");
                    node.add_sentences(cards);
                });
            }

            // If there is one enabled forwardall policy, then forward any cards sent to THIS agent
            // to every other known agent.
            for(var i = 0; i < forwardall_policies.length; i++){
                var policy = forwardall_policies[i];
                if(node.get_instance_value(policy, "enabled") == "true"){
                    var agents = [];
                    if(node.get_instance_value(policy, "all agents") == "true"){
                        agents = node.get_instances("agent");
                    }
                    else{
                        agents = node.get_instance_values(policy, "target");
                    }
                    var cards = node.get_instances("tell card");
                    var start_time = node.get_instance_value(policy, "start time").name;
                    for(var i = 0; i < cards.length; i++){
                        var card = cards[i];
                        var to_agent = false;
                        var tos = node.get_instance_relationships(card, "is to");
                        var card_timestamp = node.get_instance_value(card, "timestamp").name;
                        if(parseInt(card_timestamp) > parseInt(start_time)){
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
                }
            }
            //}catch(err){
            //    console.log(err);
            //}
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
 * HELPER UTILITIES
 */

/*
 * Utility object to support writing the node to storage.
 */
var util = {
    on_client: function(){
        if(typeof window != 'undefined' && window.document){
            return true;
        }
    },
    store_node: function(key, node){
        if(util.onclient()){store_node_client(key, node);}
        else{store_node_node(key, node);}
    },
    store_node_client: function(key, node){
        try{
            localStorage.setItem(key+"_instances", JSON.stringify(node.get_instances()));
            localStortage.setItem(key+"_concepts", JSON.stringify(node.get_concepts()));
        }
        catch(err){console.log(err);}
    },
    store_node_node: function(key, node){
        var fs = require('fs');
        var file = JSON.stringify(node.get_concepts())+"NODESEPARATOR"+JSON.stringify(node.get_instances());
        fs.writeFile("./"+key+"_node", file, function(err){u
            if(err){console.log(err);}
        });
    },
    load_node: function(key){
        if(util.onclient()){load_node_client(key);}
        else{load_node_node(key);}
    },
    load_node_client: function(key){
        try{
            var data = {};
            data.instances = JSON.parse(localStorage.getItem(key+"_instances"));
            data.concepts = JSON.parse(localStorage.getItem(key+"_concepts"));
            return node;
        }
        catch(err){console.log(err);}
    },
    load_instances_node: function(key, callback){
        var fs = require('fs');
        var data = {};
        fs.readFile("./"+key+"_node", 'utf8', function(err, str){
            if(err){console.log(err);}
            else{
                try{
                    var split = str.split("NODESEPARATOR");
                    data.concepts = JSON.parse(split[0]);
                    data.instances = JSON.parse(split[1]);
                    if(callback){callback(data);}
                }
                catch(err){console.log(err);if(callback){callback();}}
            }
        });
    }
}

/*
 * Utility object to support network tasks.
 */
var net = {
    make_request: function(method, node_url, path, data, callback){
        if(util.on_client()){net.make_request_client(method, node_url, path, data, callback);}
        else{make_request_node(net.method, node_url, path, data, callback);}
    },  
    make_request_client: function(method, node_url, path, data, callback){
        console.log(method+" "+path);
        var xhr = new XMLHttpRequest();
        xhr.open(method, node_url+path);
        xhr.onreadystatechange = function(){
            if(xhr.readyState==4 && (xhr.status==200 || xhr.status==302) && callback != null){
                callback(xhr.responseText);
            }
        };
        if(data != null){
            xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            xhr.send(data);
        }
        else{
            xhr.send();
        }

    },
    make_request_node: function(method, node_url, path, data, callback){
        var http = require('http');
        var options = {
            host: node_url,
            path: path,
            method: method,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };
        var req = http.request(options, function(response){
            var body = '';
            response.on('data', function(chunk){body+=data;});
            response.on('end', function(){
                body = decodeURIComponent(body.replace(/\+/g, ' '));
                callback(body);
            });
        });
        if(data != null){req.write(data);}
        req.end();
    }
}

// If running as a Node.js app, export CENode class and MODELS object.
if(!util.on_client()){
    exports.MODELS = MODELS;
    exports.CENode = CENode;
}

// If running as a Node.js service, start the server.
if(!util.on_client() && require.main === module){
    var http = require('http');
    var PORT = 5555;
    var node = new CENode(MODELS.CORE);
    node.add_sentence("there is a forwardall policy named 'p1' that has 'true' as all agents and has the timestamp '0' as start time and has 'true' as enabled");

    if(process.argv.length > 2){node.set_agent_name(process.argv[2]);}
    if(process.argv.length > 3){PORT = parseInt(process.argv[3]);}
    console.log("Set local agent's name to '"+node.get_agent_name()+"'.");

    function post_sentences(request, response){
        var body = "";
        request.on('data', function(chunk){
            body+=chunk;
        });       
        request.on('end', function(){
            body = decodeURIComponent(body.replace("sentence=","").replace(/\+/g, ' '));
            var sentences = body.split("\\n");
            var responses = node.add_sentences(sentences);
            response.write(responses.join("\n"));
            response.end();
        });
    }

    function get_cards(request, response){
        var url = decodeURIComponent(request.url);
        var agent_regex = url.match(/agent=(.*)/);
        var agent_str = null;
        var agents = [];
        if(agent_regex != null){agent_str = agent_regex[1];}
        if(agent_str != null){
            agents = agent_str.toLowerCase().split(",");
        }
        var cards = node.get_instances("card", true);
        var s = "";
        for(var i = 0; i < cards.length; i++){
            if(agents == null || agents.length == 0){
                s += node.get_instance_ce(cards[i])+"\n";
            }
            else{
                var tos = node.get_instance_relationships(cards[i], "is to");
                for(var j = 0; j < tos.length; j++){
                    for(var k = 0; k < agents.length; k++){
                        if(tos[j].name.toLowerCase() == agents[k]){
                            s += node.get_instance_ce(cards[i])+"\n";
                            break;
                        }
                    }
                }
            }
        }
        response.write(s);
        response.end();
    }

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
                s+='<p>Add CE sentences to the node:</p><form action="/ui/sentences" enctype="application/x-www-form-urlencoded" method="POST"><textarea name="sentence" style="width:95%;height:100px;"></textarea><br /><br /><input type="submit" /></form></div>';
                s+='<div style="width:48%;float:left;"><h2>Node settings</h2><p>Update local agent name:</p><form method="POST" action="/agent_name"><input type="text" name="name" value="'+node.get_agent_name()+'" /><input type="submit" /></form>';
                s+='<p>Other options:</p><button onclick="window.location=\'/reset\';">Empty model</button>';
                s+='<p>Available endpoints on this node server instance:</p><p style="font-family:\'monospace\';font-size:11px;">- POST '+POST_SENTENCES_ENDPOINT+' (body = newline-delimited set of sentences)<br />- GET '+GET_CARDS_ENDPOINT+'?agent=NAME (get all known cards sent to NAME)</p>';
                s+='</div><div style="clear:both;"></div>';
                s+='<div style="display:inline-block;width:45%;float:left;"><h2>Concepts</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(con, undefined, 2)+'</textarea></div>';
                s+='<div style="display:inline-block;width:45%;float:right;"><h2>Instances</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(ins, undefined, 2)+'</textarea></div>';
                s+='</ul><body></html>';
                response.writeHead(200, {"Content-Type": "text/html"});
                response.end(s);
            }
            else if(request.url.indexOf(GET_CARDS_ENDPOINT) == 0){
                response.writeHead(200, {"Content-Type": "text/ce"});
                get_cards(request, response);            
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
            if(request.url == POST_SENTENCES_ENDPOINT){
                response.writeHead(200, {"Content-Type": "text/ce"});
                post_sentences(request, response);            
            }
            else if(request.url == "/ui/sentences"){
                response.writeHead(302, {"Location": "/"});
                post_sentences(request, response);            
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
                        node.add_sentences(model);
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
