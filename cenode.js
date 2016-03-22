/*
 * Copyright 2015 W.M. Webberley & A.D. Preece (Cardiff University) 
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
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
    "conceptualise a ~ card ~ C that is an entity and has the timestamp T as ~ timestamp ~ and has the value V as ~ content ~ and has the value W as ~ linked content ~ and has the value V as ~ number of keystrokes ~ and has the timestamp T as ~ start time ~ and has the value W as ~ submit time ~ and has the value L as ~ latitude ~ and has the value M as ~ longitude ~",
    "conceptualise the card C ~ is to ~ the agent A and ~ is from ~ the agent B and ~ is in reply to ~ the card C",
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
  var models = arguments;

  // Data structures to maintain the instances and concepts maintained
  // by the node.
  var _concepts = [];
  var _instances = [];
  var _concept_dict = {};
  var _instance_dict = {};
  var rules = [];
  var concept_ids = {};

  this.agent = new CEAgent(this);
  var node = this;

  this.concepts = {};
  this.instances = {};

  /*
   * Code for generating instance, concept, and card IDs.
   *
   * Instance/concept IDs based on number of each type so far created
   * Returns int
   * 
   * Card IDs based on number of cards and the local agent's name
   * Returns str
   */
  var last_instance_id = _instances.length;
  var last_concept_id = _concepts.length;
  var last_card_id = 0;
  this.new_instance_id = function(){
    last_instance_id++;
    return last_instance_id;
  }
  this.new_concept_id = function(){
    last_concept_id++;
    return last_concept_id;
  }
  var new_card_id = function(){
    last_card_id++;
    return node.agent.get_name()+last_card_id;
  }

  function CEConcept(name, source){
    this.name = name;
    this.source = source;
    this.id = node.new_concept_id();
    this._parents = [];
    this._values = [];
    this._relationships = [];
    this._synonyms = [];
    var concept = this;
    var reserved_fields = ['values', 'relationships', 'synonyms', 'add_value', 'add_relationship', 'name', 'concept', 'id', 'sentences', 'ce', 'gist'];

    Object.defineProperty(concept, 'instances', {get: function(){
      var instances = [];
      for(var i = 0; i < _instances.length; i++){
        if(_instances[i].type.id == concept.id){
          instances.push(_instances[i]);
        } 
      }
      return instances;
    }});
    Object.defineProperty(concept, 'all_instances', {get: function(){
      var all_concepts = concept.descendants.concat(concept);
      var instances = [];
      for(var i = 0; i < _instances.length; i++){
        for(var j = 0; j < all_concepts.length; j++){
          if(_instances[i].type.id == all_concepts[j].id){
            instances.push(_instances[i]);
          } 
        }
      }
      return instances;
    }});
    Object.defineProperty(node.concepts, name.toLowerCase().replace(/ /g, '_'), {get: function(){
      return concept;
    }, configurable: true});
    Object.defineProperty(concept, 'parents', {get: function(){
      var p = [];
      for(var i = 0; i < concept._parents.length; i++){
        p.push(get_concept_by_id(concept._parents[i]));
      }
      return p;  
    }});
    Object.defineProperty(concept, 'ancestors', {get: function(){
      var parents = [];
      var stack = [];
      for(var i = 0; i < concept.parents.length; i++){
        stack.push(concept.parents[i]);
      }
      while(stack.length > 0){
        var current = stack.pop();
        parents.push(current);
        for(var i = 0; i < current.parents.length; i++){
          stack.push(current.parents[i]);
        }
      }
      return parents;
    }});
    Object.defineProperty(concept, 'children', {get: function(){  
      var children = [];
      for(var i = 0; i < _concepts.length; i++){
        for(var j = 0; j < _concepts[i].parents.length; j++){
          if(_concepts[i].parents[j].id == concept.id){
            children.push(_concepts[i]);
          }
        }
      }
      return children;
    }});
    Object.defineProperty(concept, 'descendants', {get: function(){  
      if(concept == null){return [];}
      var children = [];
      var stack = [];
      for(var i = 0; i < concept.children.length; i++){
        stack.push(concept.children[i]);
      }
      while(stack.length > 0){
        var current = stack.pop();
        children.push(current);
        var current_children = current.children;
        if(current_children != null){
          for(var i = 0; i < current_children.length; i++){
            stack.push(current_children[i]);
          }
        }
      }
      return children;
    }});
    Object.defineProperty(concept, 'relationships', {get: function(){
      var rels = [];
      for(var i = 0; i < concept._relationships.length; i++){
        var relationship = {};
        relationship.label = concept._relationships[i].label;
        relationship.concept = get_concept_by_id(concept._relationships[i].target);
        rels.push(relationship);
      }
      return rels;
    }});
    Object.defineProperty(concept, 'values', {get: function(){
      var vals = [];
      for(var i = 0; i < concept._values.length; i++){
        var value = {};
        value.label = concept._values[i].label;
        if(concept._values[i].type_id == 0){
          value.concept = concept._values[i].type_name;
        } 
        else{
          value.concept = get_concept_by_id(concept._values[i].type);
        }
        vals.push(value);
      }
      return vals;
    }});
    Object.defineProperty(concept, 'synonyms', {get: function(){
      return concept._synonyms;
    }});
   
    this.add_value = function(label, type, source){
      var value = {};
      value.source = source;
      value.label = label;
      value.type = typeof type === 'number' ? type : type.id;
      concept._values.push(value); 
      Object.defineProperty(concept, label.toLowerCase().replace(/ /g, '_'), {get: function(){return type == 0 ? 'value' : type;}, configurable: true});
    }
    this.add_relationship = function(label, target, source){
      var relationship = {};
      relationship.source = source;
      relationship.label = label;
      relationship.target = target.id;
      concept._relationships.push(relationship);
      Object.defineProperty(concept, label.toLowerCase().replace(/ /g, '_'), {get: function(){return target;}, configurable: true});
    } 
    this.add_parent = function(parent_concept){
      if(this.parents.indexOf(parent_concept.id) == -1){
        concept._parents.push(parent_concept.id);
      }
    }
    this.add_synonym = function(synonym){
      for(var i = 0; i < concept._synonyms.length; i++){
        if(concept._synonyms[i].toLowerCase() == synonym.toLowerCase()){
          return;
        }
      }
      concept._synonyms.push(synonym);
    }
  
    Object.defineProperty(concept, 'ce', {get: function(){ 
      var ce = "conceptualise a ~ "+concept.name+" ~ "+concept.name.charAt(0).toUpperCase();
      if(concept.parents.length > 0 || concept._values.length > 0 || concept._relationships.length > 0){
        ce += " that";
      }
      if(concept.parents.length > 0){
        for(var i = 0; i < concept.parents.length; i++){
          ce+= " is a "+concept.parents[i].name;
          if(i < concept.parents.length-1){ce+=" and";}
        }
      }
      var facts = [];
      var alph = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"];
      for(var i = 0; i < concept._values.length; i++){
        if(concept._values[i].type == 0){
          facts.push("has the value "+alph[i]+" as "+concept._values[i].label);
        }
        else{
          var val_type = get_concept_by_id(concept._values[i].type);
          facts.push("has the "+val_type.name+" "+val_type.name.charAt(0).toUpperCase()+" as "+concept._values[i].label);
        }
      }  
      if(facts.length > 0){
        if(concept.parents.length > 0){ce += " and";}
        ce += " "+facts.join(" and ");
      }
      ce+=".";
      if(concept._relationships.length > 0){
        facts = [];
        ce += "\nconceptualise the "+concept.name+" "+concept.name.charAt(0).toUpperCase();
        for(var i = 0; i < concept._relationships.length; i++){
          var rel_type = get_concept_by_id(concept._relationships[i].target);
          facts.push("~ "+concept._relationships[i].label+" ~ the "+rel_type.name+" "+alph[i]);
        }
        if(facts.length > 0){
          if(concept.parents.length > 0 || concept._values.length > 0){ce += " and";}
          ce += " "+facts.join(" and ")+".";
        }
      }
      return ce;
    }});
    Object.defineProperty(concept, 'gist', {get: function(){
      var gist = "";
      if(concept.parents.length > 0){gist += "A "+concept.name;}
      for(var i = 0; i < concept.parents.length; i++){
        gist += " is a type of "+concept.parents[i].name;
        if(i < concept.parents.length-1){gist+=" and";}
      }
      if(concept.parents.length > 0){gist += ".";}
      var facts = [];
      for(var i = 0; i < concept._values.length; i++){
        if(concept._values[i].type == 0){
          facts.push("has a value called "+concept._values[i].label);
        }
        else{
          var val_type = get_concept_by_id(concept._values[i].type);
          facts.push("has a type of "+val_type.name+" called "+concept._values[i].label);
        }
      }  
      for(var i = 0; i < concept._relationships.length; i++){
        var rel_type = get_concept_by_id(concept._relationships[i].target);
        facts.push(concept._relationships[i].label+" a type of "+rel_type.name);
      }
      if(facts.length > 0){
        gist += " An instance of "+concept.name+" "+facts.join(" and ")+".";
      }
      else if(facts.length == 0 && concept.parents.length == 0){
        gist += "A "+concept.name+" has no attributes or relationships.";
      }
      return gist;
    }});
  }

  function CEInstance(type, name, source){
    this.name = name;
    this.source = source;
    this.id = node.new_instance_id();
    this.type_id = type.id;
    this.sentences = [];
    this._values = [];
    this._relationships = [];
    this._synonyms = [];
    var instance = this;
    var reserved_fields = ['values', 'relationships', 'synonyms', 'add_value', 'add_relationship', 'name', 'concept', 'id', 'instance', 'sentences', 'ce', 'gist'];

    Object.defineProperty(node.instances, name.toLowerCase().replace(/ /g, '_').replace(/'/g, ''), {get: function(){
      return instance;
    }, configurable: true});
    Object.defineProperty(instance, 'type', {get: function(){for(var i = 0; i < _concepts.length; i++){if(_concepts[i].id == type.id){return _concepts[i];}}}});
    Object.defineProperty(type, name.toLowerCase(), {get: function(){return instance;}, configurable: true});
    Object.defineProperty(instance, 'relationships', {get: function(){
      var rels = [];
      for(var i = 0; i < instance._relationships.length; i++){
        var relationship = {};
        relationship.label = instance._relationships[i].label;
        relationship.source = instance._relationships[i].source;
        relationship.instance = get_instance_by_id(instance._relationships[i].target_id);
        rels.push(relationship);
      }
      return rels;
    }});
    Object.defineProperty(instance, 'values', {get: function(){
      var vals = [];
      for(var i = 0; i < instance._values.length; i++){
        var value = {};
        value.label = instance._values[i].label;
        value.source = instance._values[i].source;
        if(instance._values[i].type_id == 0){
          value.instance = instance._values[i].type_name;
        } 
        else{
          value.instance = get_instance_by_id(instance._values[i].type_id);
        }
        vals.push(value);
      }
      return vals;
    }});

    this.add_sentence = function(sentence){
      this.sentences.push(sentence);
    }

    var get_possible_properties = function(){
      var ancestor_instances = instance.type.ancestors;
      ancestor_instances.push(instance.type);
      var properties = {values: [], relationships: []};
      for(var i = 0; i < ancestor_instances.length; i++){
        for(var j = 0; j < ancestor_instances[i].values.length; j++){
          properties.values.push(ancestor_instances[i].values[j].label.toLowerCase());
        }
        for(var j = 0; j < ancestor_instances[i].relationships.length; j++){
          properties.relationships.push(ancestor_instances[i].relationships[j].label.toLowerCase());
        }
      }
      return properties;
    }

    this.add_value = function(label, value_instance, propagate, source){
      if(get_possible_properties().values.indexOf(label.toLowerCase()) > -1){
        var value = {};
        value.source = source;
        value.label = label;
        value.type_id = typeof value_instance === 'object' ? value_instance.id : 0;
        value.type_name = typeof value_instance === 'object' ? value_instance.name : value_instance;
        instance._values.push(value);
        var value_name_field = label.toLowerCase().replace(/ /g, '_');
        if(reserved_fields.indexOf(value_name_field) == -1){
          Object.defineProperty(instance, value_name_field, {get: function(){return value.type_id == 0 ? value.type_name : get_instance_by_id(value.type_id);}, configurable: true});
          if(reserved_fields.indexOf(value_name_field+'s') == -1 && !instance.hasOwnProperty(value_name_field+'s')){
            Object.defineProperty(instance, value_name_field+'s', {get: function(){
              var instances = [];
              for(var i = 0; i < instance._values.length; i++){
                if(instance._values[i].label.toLowerCase().replace(/ /g, '_') == value_name_field){
                  instances.push(instance._values[i].type_id == 0 ? instance._values[i].type_name : get_instance_by_id(instance._values[i].type_id));
                }
              }
              return instances;
            }});
          }
        }
        if(propagate == null || propagate != false){
          enact_rules(instance, 'value', value_instance, source);
        }
      }
    }

    this.add_relationship = function(label, relationship_instance, propagate, source){
      if(get_possible_properties().relationships.indexOf(label.toLowerCase()) > -1){
        var relationship = {};
        relationship.label = label;
        relationship.source = source;
        relationship.target_id = relationship_instance.id;
        relationship.target_name = relationship_instance.name;
        instance._relationships.push(relationship);
        var rel_name_field = label.toLowerCase().replace(/ /g, '_');
        if(reserved_fields.indexOf(rel_name_field) == -1){
          Object.defineProperty(instance, rel_name_field, {get: function(){return get_instance_by_id(relationship.target_id);}, configurable: true});
          if(reserved_fields.indexOf(rel_name_field+'s') == -1 && !instance.hasOwnProperty(rel_name_field+'s')){
            Object.defineProperty(instance, rel_name_field+'s', {get: function(){
              var instances = [];
              for(var i = 0; i < instance._relationships.length; i++){
                if(instance._relationships[i].label.toLowerCase().replace(/ /g, '_') == rel_name_field){
                  instances.push(get_instance_by_id(instance._relationships[i].target_id));
                }
              }
              return instances;
            }});
          }
        }
        if(propagate == null || propagate != false){
          enact_rules(instance, 'relationship', relationship_instance, source);
        }
      }
    }

    this.add_synonym = function(synonym){
      for(var i = 0; i < instance._synonyms.length; i++){
        if(instance._synonyms[i].toLowerCase() == synonym.toLowerCase()){
          return;
        }
      }
      instance._synonyms.push(synonym);
      Object.defineProperty(instance, synonym.toLowerCase().replace(/ /g, '_'), {get: function(){return instance;}});
    }

    this.property = function(property_name, source){
      return instance.properties(property_name, source, true);
    }   

    this.properties = function(property_name, source, only_one){
      var properties = [];
      for(var i = instance.values.length - 1; i >= 0; i--){ // Reverse so we get the latest prop first
        if(instance.values[i].label.toLowerCase() == property_name.toLowerCase()){
          var inst = instance.values[i].instance;
          var dat = source ? {instance: inst, source: instance.values[i].source} : inst;
          if(only_one){return dat;}
          properties.push(dat);
        }
      }
      for(var i = instance.relationships.length - 1; i >= 0; i--){ // Reverse so we get the latest prop first
        if(instance.relationships[i].label.toLowerCase() == property_name.toLowerCase()){
          var inst = instance.relationships[i].instance;
          var dat = source ? {instance: inst, source: instance.relationships[i].source} : inst;
          if(only_one){return dat;}
          properties.push(dat);
        }
      }
      return only_one ? null : properties;
    }
  
    Object.defineProperty(instance, 'synonyms', {get: function(){
      return instance._synonyms;
    }});
    Object.defineProperty(instance, 'ce', {get: function() {
      var concept = instance.type;
      if(concept == null){return;}
      var ce = "there is a "+concept.name+" named '"+instance.name+"'";
      var facts = [];
      for(var i = 0; i < instance._values.length; i++){
        var value = instance._values[i];
        if(value.type_id == 0){
          facts.push("has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.label)
        }
        else{
          var value_instance = get_instance_by_id(value.type_id);
          var value_concept = value_instance.type; 
          facts.push("has the "+value_concept.name+" '"+value_instance.name+"' as "+value.label);
        }
      }
      for(var i = 0; i < instance._relationships.length; i++){
        var relationship = instance._relationships[i];
        var relationship_instance = get_instance_by_id(relationship.target_id);
        var relationship_concept = relationship_instance.type;
        facts.push(relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'");
      }
      if(facts.length > 0){ce += " that "+facts.join(" and ");}
      return ce+".";
    }});

    Object.defineProperty(instance, 'gist', {get: function() {
      var vowels = ["a", "e", "i", "o", "u"];
      var concept = instance.type;
      if(concept == null){return;}
      var gist = instance.name+" is";
      if(vowels.indexOf(concept.name.toLowerCase()[0]) > -1){gist+=" an "+concept.name+".";}
      else{gist+=" a "+concept.name+".";}
      var facts = {};
      var fact_found = false;
      for(var i = 0; i < instance._values.length; i++){
        fact_found = true;
        var value = instance._values[i];
        var fact = "";
        if(value.type_id == 0){
          fact = "has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.label;
        }
        else{
          var value_instance = get_instance_by_id(value.type_id);
          var value_concept = value_instance.type;
          fact = "has the "+value_concept.name+" '"+value_instance.name+"' as "+value.label;
        }
        if(!(fact in facts)){
          facts[fact] = 0;
        }
        facts[fact]++;
      }
      for(var i = 0; i < instance._relationships.length; i++){
        fact_found = true;
        var relationship = instance._relationships[i];
        var relationship_instance = get_instance_by_id(relationship.target_id);
        var relationship_concept = relationship_instance.type;
        var fact = relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'";
        if(!(fact in facts)){
          facts[fact] = 0;
        }
        facts[fact]++;
      }
      if(fact_found){
        gist += " "+instance.name;
        for(fact in facts){
          gist += " "+fact;
          if(facts[fact] > 1){
            gist += " ("+facts[fact]+" times)";
          }
          gist += " and";
        }
        gist = gist.substring(0, gist.length - 4)+"."; // Remove last ' and' and add full stop
      }
      return gist;   
    }});
  }

  /*
   * Get the concept with ID 'id'
   *
   * Returns: obj{concept}
   */
  var get_concept_by_id = function(id){
    return _concept_dict[id];
  }

  /*
   * Get the concept with name 'name'
   *
   * Returns: obj{concept}
   */
  var get_concept_by_name = function(name){
    if(name == null){return null;}
    for(var i = 0; i < _concepts.length; i++){
      if(_concepts[i].name.toLowerCase() == name.toLowerCase()){
        return _concepts[i];
      }
      for(var j = 0; j < _concepts[i].synonyms.length; j++){
        if(_concepts[i].synonyms[j].toLowerCase() == name.toLowerCase()){
          return _concepts[i];
        }
      }
    }
  }

  /* 
   * Get the instance with ID 'id'
   *
   * Returns: obj{instance}
   */
  var get_instance_by_id = function(id) {
    return _instance_dict[id];
  }

  /*
   * Get the instance with name 'name'
   *
   * Returns: obj{instance}
   */
  var get_instance_by_name = function(name) {
    if(name==null){return null;}
    for(var i = 0; i<_instances.length; i++) {
      if(_instances[i].name.toLowerCase() == name.toLowerCase()){
        return _instances[i];
      }
      for(var j = 0; j < _instances[i].synonyms.length; j++){
        if(_instances[i].synonyms[j].toLowerCase() == name.toLowerCase()){
          return _instances[i];
        }
      }
    }
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
      rule.if.value.label = val_facts[5];
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
        rule.then.value.label = then_val_facts[5];
      }
    }
    return rule;
  }

  var enact_rules = function(subject_instance, property_type, object_instance, source){
    if(typeof object_instance == "string"){
      return;
    }
    var rules = node.get_instances("rule");
    for(var i = 0; i < rules.length; i++){
      var rule = node.parse_rule(rules[i].instruction);
      if(rule == null){return;}
      if(rule.if.concept == subject_instance.type.name){
        if((property_type == "relationship" && rule.if.relationship != null) || (property_type == "value" && rule.if.value != null)){
          var ancestor_concepts = object_instance.type.ancestors;
          ancestor_concepts.push(object_instance.type);
          for(var j = 0; j < ancestor_concepts.length; j++){
            if(ancestor_concepts[j].name.toLowerCase() == rule.if[property_type].type.toLowerCase()){
              if(rule.then.relationship && rule.then.relationship.type == subject_instance.type.name){
                object_instance.add_relationship(rule.then.relationship.label, subject_instance, false, source); 
              }
              else if(rule.then.value && rule.then.value.type == subject_instance.type.name){
                object_instance.add_value(rule.then.value.label, subject_instance, false, source);
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
  var parse_ce = function(t, nowrite, source){
    t = t.replace(/\s+/g, " ").replace(/\.+$/, "").trim(); // Replace all whitespace with a single space (e.g. removes tabs/newlines)
    var message = "";

    if(t.match(/^conceptualise an?/i)){
      var concept_name = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/i)[1];
      var stored_concept = get_concept_by_name(concept_name);
      var concept = null;
      if(stored_concept != null){ // if exists, simply modify existing concept
        message = "This concept already exists.";
        return [false, message];
      }
      else{ // otherwise create a new one and add it to list
        concept = new CEConcept(concept_name, source);
        
        // Writepoint
        if(nowrite == null || nowrite == false){
          _concepts.push(concept);
          _concept_dict[concept.id] = concept;
        }
      }

      var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b)/g);
      for (var i=0; i<facts.length; i++) {
        var fact = facts[i].trim();

        // "has the type X as ~ label ~"
        if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
          var facts_info = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
          var value_type = get_concept_by_name(facts_info[1]);

          if(facts_info[1] == "value"){value_type = 0;}
          else if(value_type == null){
            message = "A property type is unknown: "+facts_info[1];
            return [false, message];
          }

          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_value(facts_info[3], value_type, source);
          }
        } 

        // "is a parent_concept"
        if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
          var parent_name = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
          var parent_concept = get_concept_by_name(parent_name);
          if(parent_concept == null){
            message = "Parent concept is unknown: "+parent_name;
            return [false, message];
          }
          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_parent(parent_concept);
          }
        }
       }
      return [true, t, concept];
    }

    else if(t.match(/^conceptualise the/i)){
      var concept_info = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z])/i);
      concept = get_concept_by_name(concept_info[1]);
      if(!concept){
         message = "Concept "+concept_info[1]+" not known."; // if can't find concept, then fail
         return [false, message];
      }

      var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b|)/g);
      for(var i = 0; i < facts.length; i++){
        var fact = facts[i].trim();

        if(fact.match(/~ is expressed by ~ '([a-zA-Z0-9 ]*)'/)){
          var facts_info = fact.match(/~ is expressed by ~ '([a-zA-Z0-9 ]*)'/);
          if(nowrite == null || nowrite == false){
            concept.add_synonym(facts_info[1]);
          }
        }

        // "concept C ~ label ~ the target T"  (e.g. the teacher T ~ teaches ~ the student S)
        if(fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
          var facts_info = fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
          target = get_concept_by_name(facts_info[4]);
          if(target == null){
            message = "The target of one of your input relationships is of an unknown type: "+facts_info[4];
            return [false, message];
          }
          
          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_relationship(facts_info[3], target, source);
          }
        }

        // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
        if(fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)){
          var facts_info = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
          target = get_concept_by_name(facts_info[2]);
          if(target == null){
            message = "The target of one of your input relationships is of an unknown type: "+facts_info[2];
            return [false, message];
          }
          
          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_relationship(facts_info[1], target, source);
          }
        }

        // "has the type X as ~ label ~" (e.g. and has the room R as ~ location ~)
        if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
          var facts_info = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
          var type = get_concept_by_name(facts_info[1]);
          if(facts_info[1] == "value"){type = 0;}
          else if(type == null){
            message = "There is an invalid value in your sentence: "+facts_info[1];
            return [false, message];
          }

          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_value(facts_info[3], type, source);
          }
        }

        // "is a parent_concept" (e.g. and is a entity)
        else if(fact.match(/^an? ([a-zA-Z0-9 ]*)/)){
          var parent_info = fact.match(/^an? ([a-zA-Z0-9 ]*)/);

          // Writepoint
          if(nowrite == null || nowrite == false){
            concept.add_parent(get_concept_by_name(parent_info[1]));
          }
        }
      }
      return [true, t, concept];
    }

    else if(t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i) || t.match(/^the ([a-zA-Z0-9 ]*)/i)){
      var concept_facts_multiword, concept_facts_singleword, value_facts, relationship_facts_multiword, relationship_facts_singleword, synonym_facts;
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
        if(current_instance != null && current_instance.type.id == concept.id){
          message = "There is already an instance of this type with this name."; // Don't create 2 instances with same name and same concept id
          return [true, message, current_instance];
        }
        
        instance = new CEInstance(concept, instance_name, source);
        instance.sentences.push(t);
        
        // Writepoint
        if(nowrite == null || nowrite == false){
          _instances.push(instance);
          _instance_dict[instance.id] = instance;
        }
        
        concept_facts_multiword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
        concept_facts_singleword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/g);
        value_facts = t.match(/(?:\bthat\b|\band\b) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
        relationship_facts_multiword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/g); 
        relationship_facts_singleword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/g);
        synonym_facts = t.match(/is expressed by '([^'\\]*(?:\\.[^'\\]*)*)'/g);
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
          for(var i = 0; i < _concepts.length; i++){
            if(names[1].toLowerCase().indexOf(_concepts[i].name.toLowerCase()) == 0){
              concept_name = _concepts[i].name;
              concept = _concepts[i];
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
        synonym_facts = t.match(/is expressed by '([^'\\]*(?:\\.[^'\\]*)*)'/g);
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

      if(concept_facts){for(var i = 0; i < concept_facts.length; i++){
        if(concept_facts[i] != null){
          var fact = concept_facts[i].trim();
          var value_type, value_instance_name, value_label;
          var facts_info = fact.match(/the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
          if(facts_info != null){
            value_type = facts_info[1];
            value_instance_name = facts_info[2].replace(/\\/g, '');
            value_label = facts_info[3];
          }
          else{
            facts_info = fact.match(/(?:\bthat\b|\band\b) ?has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/);
            var value_type = "";
            var type_name_tokens = facts_info[1].split(" ");
            for(var j = 0; j < type_name_tokens.length-1; j++){value_type+=type_name_tokens[j]+" ";}
            value_type = value_type.trim();
            value_instance_name = type_name_tokens[type_name_tokens.length-1].trim();
            value_label = facts_info[2];   
          }
          if(value_label!=""&&value_type!=""&&value_instance_name!=""){
            var value_instance = get_instance_by_name(value_instance_name);
            if(value_instance == null) {
              value_instance = new CEInstance(get_concept_by_name(value_type), value_instance_name, source);
              // Writepoint 
              if(nowrite == null || nowrite == false){
                value_instance.sentences.push(t);
                _instances.push(value_instance);
                _instance_dict[value_instance.id] = value_instance;
              }
            }

            // Writepoint 
            if(nowrite == null || nowrite == false){
              instance.add_value(value_label, value_instance, true, source);
            }
          }
        }
      }}

      if(value_facts){for(var i = 0; i < value_facts.length; i++){
        if(value_facts[i] != null){
          var fact = value_facts[i].trim();
          var facts_info = fact.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
          var value_value = facts_info[1].replace(/\\/g, '');
          var value_label = facts_info[2];
          
          // Writepoint 
          if(nowrite == null || nowrite == false){
            instance.add_value(value_label, value_value, true, source);
          }
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
          if(relationship_label!=""&&relationship_type_name!=""&&relationship_instance_name!=""){
            var relationship_type = get_concept_by_name(relationship_type_name);
            var relationship_instance = get_instance_by_name(relationship_instance_name);
            if(relationship_type == null){
              //message = "Unknown relationship type: "+relationship_type_name;
              //return [false, message];
            }
            else{
              if(relationship_instance == null){
                relationship_instance = new CEInstance(get_concept_by_name(relationship_type_name), relationship_instance_name, source);

                // Writepoint
                if(nowrite == null || nowrite == false){
                  relationship_instance.sentences.push(t);
                  _instances.push(relationship_instance);
                  _instance_dict[relationship_instance.id] = relationship_instance
                }
              }

              // Writepoint
              if(nowrite == null || nowrite == false){
                instance.add_relationship(relationship_label, relationship_instance, true, source);
              }
            }
          }
        }
      }}
      
      if(synonym_facts){for(var i = 0; i < synonym_facts.length; i++){
        if(synonym_facts[i] != null){
          var fact = synonym_facts[i].trim();
          var facts_info = fact.match(/is expressed by ('([^'\\]*(?:\\.[^'\\]*)*)')/);
          if(nowrite == null || nowrite == false){
            instance.add_synonym(facts_info[2]);
          }
        }
      }}
      return [true, t, instance];
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
      var places = {};
      var place_found = false;
      for(var i = 0; i < locatable_instances.length; i++){locatable_ids.push(locatable_instances[i].id);}
      
      for(var i = 0; i < instance.values.length; i++){
        if(locatable_ids.indexOf(instance.values[i].instance.id) > -1){
          var place = "has "+instance.values[i].instance.name+" as "+instance.values[i].label;
          if(!(place in places)){
            places[place] = 0;
          }
          places[place]++;
          place_found = true;
        }
      }
      for(var i = 0; i < instance.relationships.length; i++){
        if(locatable_ids.indexOf(instance.relationships[i].instance.id) > -1){
          var place = instance.relationships[i].label+" "+instance.relationships[i].instance.name;
          if(!(place in places)){
            places[place] = 0;
          }
          places[place]++;
          place_found = true;
        }
      }
      if(!place_found){
        message = "I don't know where "+instance.name+" is.";
        return [true, message];
      }
      message = instance.name;
      for(place in places){
        message += " "+place;
        if(places[place] > 1){
          message += " ("+places[place]+" times)";
        }
        message += " and";
      }
      return [true, message.substring(0, message.length - 4)+"."];
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
      var things = {};
      var thing_found = false;
      for(var i = 0; i < _instances.length; i++){
        var vals = _instances[i].values;
        var rels = _instances[i].relationships;
        if(vals!=null){for(var j = 0; j < vals.length; j++){
          if(vals[j].instance.id == instance.id){
            var thing = "the "+_instances[i].type.name+" "+_instances[i].name+" has the "+instance.type.name+" "+instance.name+" as "+vals[j].label;
            if(!(thing in things)){
              things[thing] = 0;
            }
            things[thing]++;
            thing_found = true;
          }
        }}   
        if(rels!=null){for(var j = 0; j < rels.length; j++){
          if(rels[j].instance.id == instance.id){
            var thing = "the "+_instances[i].type.name+" "+_instances[i].name+" "+rels[j].label+" the "+instance.type.name+" "+instance.name;
            if(!(thing in things)){
              things[thing] = 0;
            }
            things[thing]++;
            thing_found = true;
          }
        }}
      }
      if(!thing_found){
        message = "I don't know what is located in/on/at the "+instance.type.name+" "+instance.name+".";
        return [true, message];
      }

      message = '';
      for(thing in things){
        message += " "+thing;
        if(things[thing] > 1){
          message += " ("+things[thing]+" times)";
        }
        message += " and";
      }
      return [true, message.substring(0, message.length - 4)+"."];
    }

    else if(t.match(/^(\bwho\b|\bwhat\b) (?:is|are)/i)){
      t = t.replace(/\?/g,'').replace(/'/g, '').replace(/\./g, '');

      // If we have an exact match (i.e. 'who is The Doctor?')
      var name = t.match(/^(\bwho\b|\bwhat\b) (?:is|are) ([a-zA-Z0-9_ ]*)/i);
      var instance;
      if(name){
        instance = get_instance_by_name(name[2]);
        if(instance != null){
          return [true, instance.gist];
        }      
      }

      // Otherwise, try and infer it
      name = t.match(/^(?:\bwho\b|\bwhat\b) (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9_ ]*)/i)[1].replace(/\?/g, '').replace(/'/g, '');
      instance = get_instance_by_name(name);
      if(instance == null){
        var concept = get_concept_by_name(name);
        if(concept == null){
          var possibilities = [];
          for(var i = 0; i < _concepts.length; i++){
            for(var j = 0; j < _concepts[i].values.length; j++){
              var v = _concepts[i].values[j];
              if(v.label.toLowerCase() == name.toLowerCase()){
                if(v.type == 0){
                  possibilities.push("is a possible value of a type of "+_concepts[i].name+" (e.g. \"the "+_concepts[i].name+" '"+_concepts[i].name.toUpperCase()+" NAME' has 'VALUE' as "+name+"\")");
                }
                else{
                  possibilities.push("is a possible "+v.concept.name+" type of a type of "+_concepts[i].name+" (e.g. \"the "+_concepts[i].name+" '"+_concepts[i].name.toUpperCase()+" NAME' has the "+v.concept.name+" '"+v.concept.name.toUpperCase()+" NAME' as "+name+"\")");
                }
              }     
            }
            for(var j = 0; j < _concepts[i].relationships.length; j++){
              var r = _concepts[i].relationships[j];
              if(r.label.toLowerCase() == name.toLowerCase()){
                possibilities.push("describes the relationship between a type of "+_concepts[i].name+" and a type of "+r.concept.name+" (e.g. \"the "+_concepts[i].name+" '"+_concepts[i].name.toUpperCase()+" NAME' "+name+" the "+r.concept.name+" '"+r.concept.name.toUpperCase()+" NAME'\")");
              }
            }
          }
          if(possibilities.length > 0){
            return [true, "'"+name+"' "+possibilities.join(" and ")+"."];
          }
          else{return [true, "I don't know who or what that is."];}
        }
        else{
          return [true, concept.gist];
        }
      }
      else{
        return [true, instance.gist];
      }
    }

    else if(t.match(/^(\bwho\b|\bwhat\b) does/i)){
      try{
        var data = t.match(/^(\bwho\b|\bwhat\b) does ([a-zA-Z0-9_ ]*)/i);      
        var body = data[2].replace(/\ban\b/gi, '').replace(/\bthe\b/gi, '').replace(/\ba\b/gi, '');
        var tokens = body.split(' ');
        var instance;
        for(var i = 0; i < tokens.length; i++){
          var test_string = tokens.slice(0, i).join(' ').trim();
          if(!instance){
            instance = get_instance_by_name(test_string);
          }
          else{
            break;
          }
        }
        if(instance){
          var property_name = tokens.splice(instance.name.split(' ').length, tokens.length - 1).join(' ').trim();
          var fixed_property_name = property_name;
          var property = instance.property(property_name);
          if (!property){
            fixed_property_name = property_name.replace(/s/ig, '');
            property = instance.property(fixed_property_name); 
          }
          if (!property){
            var prop_tokens = property_name.split(' ');
            prop_tokens[0] = prop_tokens[0] + 's';
            fixed_property_name = prop_tokens.join(' ').trim();
            property = instance.property(fixed_property_name);
          }
          if(property){
            return [true, instance.name+' '+fixed_property_name+' the '+property.type.name+' '+property.name+'.'];
          }
          return [true, "Sorry - I don't know that property about the "+instance.type.name+" "+instance.name+"."];
        }
      }
      catch(err){
        return [false, "Sorry - I can't work out what you're asking."];
      }
    }

    else if(t.match(/^(\bwho\b|\bwhat\b)/i)){
      try{
        var data = t.match(/^(\bwho\b|\bwhat\b) ([a-zA-Z0-9_ ]*)/i);
        var body = data[2].replace(/\ban\b/gi, '').replace(/\bthe\b/gi, '').replace(/\ba\b/gi, '');
        var tokens = body.split(' ');
        var instance;
        for(var i = 0; i < tokens.length; i++){
          var test_string = tokens.slice(tokens.length - (i+1), tokens.length).join(' ').trim();
          if(!instance){
            instance = get_instance_by_name(test_string);
          }
          if(!instance && test_string[test_string.length-1].toLowerCase() == 's'){
            instance = get_instance_by_name(test_string.substring(0, test_string.length - 1));
          }
          if(instance){
            break;
          }
        } 
        if(instance){
          var property_name = tokens.splice(0, tokens.length - instance.name.split(' ').length).join(' ').trim();
          for(var i = 0; i < _instances.length; i++){
            var subject = _instances[i];
            var fixed_property_name = property_name;
            var property = subject.property(property_name);
            if (!property){
              var prop_tokens = property_name.split(' ');
              if(prop_tokens[0][prop_tokens[0].length-1].toLowerCase() == 's'){
                prop_tokens[0] = prop_tokens[0].substring(0, prop_tokens[0].length - 1);
              }
              fixed_property_name = prop_tokens.join(' ').trim();
              property = subject.property(fixed_property_name);
            }
            if (!property){
              var prop_tokens = property_name.split(' ');
              prop_tokens[0] = prop_tokens[0] + 's';
              fixed_property_name = prop_tokens.join(' ').trim();
              property = subject.property(fixed_property_name);
            }
            if(property && property.name == instance.name){
               return [true, subject.name+' '+fixed_property_name+' the '+property.type.name+' '+property.name+'.'];
            }            
          }
          return [true, "Sorry - I don't know that property about the "+instance.type.name+" "+instance.name+"."];
        }
      }
      catch(err){
        console.log(err);
        return [false, "Sorry - I can't work out what you're asking."];
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
        ins = _instances;    
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
   *    (this could be returned as a confirm card
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
    for(var i = 0; i < _instances.length; i++){
      var possible_names = _instances[i].synonyms.concat(_instances[i].name);
      for(var j = 0; j < possible_names.length; j++){
        if(t.toLowerCase().indexOf(possible_names[j].toLowerCase()) > -1){
          if(t.toLowerCase().indexOf(possible_names[j].toLowerCase()) < smallest_index){
            focus_instance = _instances[i];
            smallest_index = t.toLowerCase().indexOf(possible_names[j].toLowerCase());
            break;
          }
        }
      }
    }
    if(focus_instance != null){
      var focus_concept = focus_instance.type;

      var focus_instance_words = focus_instance.name.toLowerCase().split(" ");
      var focus_concept_words = focus_concept.name.toLowerCase().split(" ");
      for(var i = 0; i < focus_instance_words.length; i++){common_words.push(focus_instance_words[i]);}
      for(var i = 0; i < focus_concept_words.length; i++){common_words.push(focus_concept_words[i]);}

      var ce = "the "+focus_concept.name+" '"+focus_instance.name+"' ";
      var facts = [];

      var parents = focus_concept.ancestors;
      parents.push(focus_concept);

      var possible_relationships = [];
      var possible_values = [];
      for (var i = 0; i < parents.length; i++) {
        possible_relationships = possible_relationships.concat(parents[i].relationships);
        possible_values = possible_values.concat(parents[i].values);
      }

      var and_facts = t.split(/\band\b/g);
      for(var k = 0; k < and_facts.length; k++){
        var f = and_facts[k].toLowerCase(); 
        var fact_tokens = f.split(" ");
        for(var i = 0; i < possible_values.length; i++){
          var value_words = possible_values[i].label.toLowerCase().split(" ");
          for(var j = 0; j < value_words.length; j++){common_words.push(value_words[j]);}

          if(possible_values[i].concept){
            var value_concept = possible_values[i].concept;
            var value_instances = node.get_instances(value_concept.name, true);
            for(var j = 0; j < value_instances.length; j++){
              var possible_names = value_instances[j].synonyms.concat(value_instances[j].name);
              for(var l = 0; l < possible_names.length; l++){
                if(f.toLowerCase().indexOf(possible_names[l].toLowerCase())>-1){
                  facts.push("has the "+value_concept.name+" '"+value_instances[j].name+"' as "+possible_values[i].label);
                  break;
                }
              }
            }
          }
          else{
            if(f.toLowerCase().indexOf(possible_values[i].label.toLowerCase()) > -1){
              var value_name = "";
              for(var j = 0; j < fact_tokens.length; j++){
                if(common_words.indexOf(fact_tokens[j].toLowerCase()) == -1 ){
                  value_name += fact_tokens[j]+" ";
                }
              }
              if(value_name != ""){
                facts.push("has '"+value_name.trim()+"' as "+possible_values[i].label);
              }   
            }
          }
        }

        var used_indices = [];
        for(var i = 0; i < possible_relationships.length; i++){
          if(possible_relationships[i].concept){
            var rel_concept = possible_relationships[i].concept;
            var rel_instances = node.get_instances(rel_concept.name, true);
            for(var j = 0; j < rel_instances.length; j++){
              var possible_names = rel_instances[j].synonyms.concat(rel_instances[j].name);
              for(var k = 0; k < possible_names.length; k++){
                var index = f.toLowerCase().indexOf(' '+possible_names[k].toLowerCase()); // ensure object at least starts with the phrase (but not ends with, as might be plural)
                if(index >- 1 && used_indices.indexOf(index) == -1){
                  facts.push(possible_relationships[i].label+" the "+rel_concept.name+" '"+rel_instances[j].name+"'");
                  used_indices.push(index);
                  break;
                }
              }
            }
          }
        }
      }
      if(facts.length > 0){
        return [true,ce+facts.join(" and ")];
      }
    }

    for(var i = 0; i < _concepts.length; i++){
      if(t.toLowerCase().indexOf(_concepts[i].name.toLowerCase()) > -1){
        var concept_words = _concepts[i].name.toLowerCase().split(" ");
        common_words.push(_concepts[i].name.toLowerCase());
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
          return [true, "there is a "+_concepts[i].name+" named '"+new_instance_name.trim()+"'"];
        }
        return [true, "there is a "+_concepts[i].name+" named '"+_concepts[i].name+" "+_instances.length+1+"'"];
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
    var last_concept = _concepts[_concepts.length-1];
    var number_of_tildes = 0;
    var index_of_first_tilde = 0;
    for(var i = 0; i < tokens.length; i++){if(tokens[i] == "~"){number_of_tildes++;if(number_of_tildes==1){index_of_first_tilde=i;}}}
    var possible_words = [];
    if(t == ""){return t;}
    if(number_of_tildes == 1){
      try{
        return t+" ~ "+tokens[index_of_first_tilde+1].charAt(0).toUpperCase()+" ";
      } catch(err){
        console.log(err);
      }
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
      for(var i = 0; i < _instances.length; i++){
        possible_words.push(_instances[i].name);
        if(s.indexOf(_instances[i].name.toLowerCase()) > -1){
          mentioned_instances.push(_instances[i]);
        }
      }
    }
    for(var i = 0; i < _concepts.length; i++){
      possible_words.push(_concepts[i].name);
      var concept_mentioned = false;
      for(var j = 0; j < mentioned_instances.length; j++){
        if(mentioned_instances[j].concept_id == _concepts[i].id){concept_mentioned = true;break;}
      }
      if(s.indexOf(_concepts[i].name.toLowerCase()) > -1 || concept_mentioned){
        for(var j = 0; j < _concepts[i].values.length; j++){possible_words.push(_concepts[i].values[j].label);}
        for(var j = 0; j < _concepts[i].relationships.length; j++){possible_words.push(_concepts[i].relationships[j].label);}
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
   *    of concept with name 'concept_type'
   *
   * Returns: [obj{instance}]
   */
  this.get_instances = function(concept_type, recurse){
    var instance_list = [];
    if(concept_type == null){
      instance_list = _instances;
    }
    else if(concept_type != null && (recurse == null || recurse == false)){
      var concept = get_concept_by_name(concept_type);
      if(concept){
        for(var i = 0; i < _instances.length; i++){
          if(_instances[i].type.id == concept.id){
            instance_list.push(_instances[i]);
          }
        }
      }
    }
    else if(concept_type != null && recurse == true){
      var concept = get_concept_by_name(concept_type);
      if(concept){
        var descendants = concept.descendants.concat(concept);
        var children_ids = [];
        for(var i = 0; i < descendants.length; i++){children_ids.push(descendants[i].id);}
        for(var i = 0; i < _instances.length; i++){
          if(children_ids.indexOf(_instances[i].type.id) > -1){
            instance_list.push(_instances[i]);
          }
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
    return _concepts;
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
  this.add_sentence = function(sentence, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", new_card_id());
    var return_data = {};
    var ce_success = parse_ce(sentence, false, source);
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
      return_data.result = ce_success[2];
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
  this.add_ce = function(sentence, nowrite, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", new_card_id());
    var return_data = {};
    var success = parse_ce(sentence, nowrite, source);
    return_data.success = success[0];
    return_data.type = "gist";
    return_data.data = success[1];
    if(success[2]){return_data.result = success[2];}
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
  this.add_sentences = function(sentences, source){
    var responses = [];
    for(var i = 0; i < sentences.length; i++){
      if(sentences[i] && sentences[i].length > 0){
        responses.push(this.add_sentence(sentences[i], source));
      }
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
    _instances = [];
    _concepts = [];
  }

  /* 
   * Initialise node by adding any passed models as
   * sentence sets to be processed.
   */
  this.init = function(){
    for(var i = 0; i < models.length; i++){
      this.load_model(models[i]);
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
  var ce_agent = this;

  this.set_name = function(n){
    name = n;
  }
  this.get_name = function(){
    return name;
  }
  this.get_last_successful_request = function(){
    return last_successful_request;
  }
  this.handle_card = function(card){
      var from = card.is_from;
      var tos = card.is_tos;
      var content = card.content;
      var sent_to_this_agent = false;

      if(!tos || !content){
        return;
      }

      // Determine whether or not to read or ignore this card:
      if(handled_cards.indexOf(card.name) > -1){return;}
      handled_cards.push(card.name);
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

      if(from && card.type.name == "ask card"){
        // Get the relevant information from the node
        var data = node.ask_question(content);
        var ask_policies = node.get_instances("ask policy");
        for(var j = 0; j < ask_policies.length; j++){
          if(ask_policies[j].enabled == 'true'){
            var target_name = ask_policies[j].target.name;
            if(!(target_name in unsent_ask_cards)){unsent_ask_cards[target_name] = [];}
            unsent_ask_cards[target_name].push(card); 
          }
        }
        // Prepare the response 'tell card' to the input 'ask card' and add this back to the local model
        var froms = card.is_froms;
        var urls, c;
        if(data.data){
          urls = data.data.match(/(https?:\/\/[a-zA-Z0-9\.\/\-\+_&=\?\!%]*)/gi);
          c = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content";
        }
        else{
          c = "there is a gist card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has 'Sorry; your question was not understood.' as content";
        }

        for(var j = 0; j < froms.length; j++){
          c+=" and is to the "+froms[j].type.name+" '"+froms[j].name+"'";
        }
        if(urls!=null){for(var j = 0; j < urls.length; j++){
          c+=" and has '"+urls[j]+"' as linked content";
        }}
        c += " and is in reply to the card '"+card.name+"'";
        return node.add_sentence(c);
      }

      else if(from && card.type.name == "tell card"){
        // Add the CE sentence to the node
        var data = node.add_ce(content, false, from.name); 
        if(!data.success){
          return node.add_sentence("there is a gist card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has 'Sorry. Your input was not understood.' as content and is in reply to the card '"+card.name+"'.");
        }
        var response_card;
        if(data.success == true){
          // Add sentence to any active tell policy queues
          var tell_policies = node.get_instances("tell policy");
          for(var j = 0; j < tell_policies.length; j++){
            if(tell_policies[j].enabled == 'true'){
              var target_name = tell_policies[j].target.name;
              if(!(target_name in unsent_tell_cards)){unsent_tell_cards[target_name] = [];}
              unsent_tell_cards[target_name].push(card); 
            }
          }
        }
        // Check feedback policies to see if input 'tell card' requires a response
        // The type of response card is determined by the way it was handled by the node (nl, gist, tell, etc.)
        var feedback_policies = node.get_instances("feedback policy");
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
            response_card = node.add_sentence("there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+c.replace(/'/g, "\\'")+"' as content and is in reply to the card '"+card.name+"'.");
          }
        }
        return response_card;
      }

      else if(from && card.type.name == "nl card"){
        var new_card = null;
        // Firstly, check if card content is valid CE, but without writing to model:
        var data = node.add_ce(content, true, from.name);
        // If valid CE, then replicate the nl card as a tell card and re-add to model (i.e. 'autoconfirm')
        if(data.success == true){
          new_card = "there is a tell card named 'msg_{uid}' that is from the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and is to the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+content.replace(/'/g, "\\'")+"' as content.";
        }   
        // If invalid CE, then try responding to a question 
        else{
          data = node.ask_question(content);
          // If question was success, replicate the nl card as an ask card and re-add to model (i.e. 'autoask')
          if(data.success == true){
            new_card = "there is an ask card named 'msg_{uid}' that is from the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and is to the agent '"+name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+content.replace(/'/g, "\\'")+"' as content.";
          }
          // If question not understood then place the response to the NL card in a new response
          else{
            data = node.add_nl(content);     
            new_card = "there is a "+data.type+" card named 'msg_{uid}' that is from the agent '"+name.replace(/'/g, "\\'")+"' and is to the "+from.type.name+" '"+from.name.replace(/'/g, "\\'")+"' and has the timestamp '{now}' as timestamp and has '"+data.data.replace(/'/g, "\\'")+"' as content and is in reply to the card '"+card.name+"'.";
          }
        }
        node.add_sentence(new_card);
        return new_card;
      }
  }

  var poll_cards = function(){
    if(setTimeout){
      setTimeout(function(){
        var card_list = node.get_instances("card", true);
        for(var i = 0; i < card_list.length; i++){
          ce_agent.handle_card(card_list[i]); 
        }
        poll_cards();
      }, 500);
    }
  }

  var get_instance = function(){
    var instances = node.get_instances("agent");
    for(var i = 0; i < instances.length; i++){
      if(instances[i].name.toLowerCase() == name.toLowerCase()){
        return instances[i];
      }
    }
  }

  var enact_policies = function(){
    if(setTimeout){
      setTimeout(function(){
        try{
          var tell_policies = node.get_instances("tell policy");
          var ask_policies = node.get_instances("ask policy");
          var listen_policies = node.get_instances("listen policy");
          var forwardall_policies = node.get_instances("forwardall policy");

          // For each tell policy in place, send all currently-untold cards to each target
          // To save on transit costs, if there are multiple cards to be sent to one target, they are 
          // separated by new line (\n)
          for(var i = 0; i < tell_policies.length; i++){
            var target = tell_policies[i].target;
            if(target && target.name){
              var cards = unsent_tell_cards[target.name];
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
                    last_successful_request = new Date().getTime();
                    unsent_tell_cards[target.name] = [];
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
              var cards = unsent_ask_cards[target.name];
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
                    last_successful_request = new Date().getTime();
                    unsent_ask_cards[target.name] = [];
                  });
                }
              }
            }
          }

          // For each listen policy in place, make a request to get cards addressed to THIS agent, and add to node, ignoring already-seen cards
          for(var i = 0; i < listen_policies.length; i++){
            var target = listen_policies[i].target;
            var data = '';
            var all_cards = node.get_instances('card', true);
            for(var j = 0; j < all_cards.length; j++){
              data = data + all_cards[j].name+'\n';
            }
            net.make_request("POST", target.address, GET_CARDS_ENDPOINT+"?agent="+name, data, function(resp){
              last_successful_request = new Date().getTime();
              var cards = resp.split("\n");
              node.add_sentences(cards);
            });
          }

          // If there is one enabled forwardall policy, then forward any cards sent to THIS agent
          // to every other known agent.
          for(var i = 0; i < forwardall_policies.length; i++){
            var policy = forwardall_policies[i];
            if(policy.enabled == "true"){
              var agents = policy.all_agents == "true" ? node.get_instances("agent") : policy.targets;
              var cards = node.get_instances("tell card");
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
        enact_policies();
      }, 5000); 
    }
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
    } catch(err){console.log(err);}
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
    } catch(err){console.log(err);}
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
        } catch(err){console.log(err);if(callback){callback();}}
      }
    });
  }
}

/*
 * Utility object to support network tasks.
 */
var net = {
  make_request: function(method, node_url, path, data, callback){
    try{
      if(util.on_client()){net.make_request_client(method, node_url, path, data, callback);}
      else{net.make_request_node(method, node_url, path, data, callback);}
    } catch(err){
      console.log('CENode network error: '+err);
    }
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
      response.on('data', function(chunk){body+=chunk;});
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

  if(process.argv.length > 2){node.agent.set_name(process.argv[2]);}
  if(process.argv.length > 3){PORT = parseInt(process.argv[3]);}
  console.log("Set local agent's name to '"+node.agent.get_name()+"'.");

  function post_sentences(request, response){
    var body = "";
    request.on('data', function(chunk){
      body+=chunk;
    });     
    request.on('end', function(){
      body = decodeURIComponent(body.replace("sentence=","").replace(/\+/g, ' '));
      var sentences = body.split(/\\n|\n/);
      var responses = node.add_sentences(sentences);
      response.write(responses.map(function(resp){return resp.data;}).join("\n"));
      response.end();
    });
  }

  function get_cards(request, response, ignores){
    var url = decodeURIComponent(request.url);
    var agent_regex = url.match(/agent=(.*)/);
    var agent_str = null;
    var agents = [];
    var ignores = ignores ? ignores : [];
    if(agent_regex != null){agent_str = agent_regex[1];}
    if(agent_str != null){
      agents = agent_str.toLowerCase().split(",");
    }
    var cards = node.get_instances("card", true);
    var s = "";
    for(var i = 0; i < cards.length; i++){
      if(ignores.indexOf(cards[i].name) == -1){
        if(agents == null || agents.length == 0){
          s += cards[i].ce+"\n";
        }
        else{
          var tos = cards[i].is_tos;
          if(tos){
            for(var j = 0; j < tos.length; j++){
              for(var k = 0; k < agents.length; k++){
                if(tos[j].name.toLowerCase() == agents[k]){
                  s += cards[i].ce+"\n";
                  break;
                }
              }
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
        s+='<div style="width:48%;float:left;"><h2>Node settings</h2><p>Update local agent name:</p><form method="POST" action="/agent_name"><input type="text" name="name" value="'+node.agent.get_name()+'" /><input type="submit" /></form>';
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
      if(request.url.indexOf(GET_CARDS_ENDPOINT) == 0){
        var body = "";
        request.on('data', function(chunk){
          body+=chunk;
        });
        request.on('end', function(){
          var ignores = body.split(/\\n|\n/);
          response.writeHead(200, {"Content-Type": "text/ce"});
          get_cards(request, response, ignores);
        });
      }
      else if(request.url == POST_SENTENCES_ENDPOINT){
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
          node.agent.set_name(body);
          console.log("Set local agent's name to '"+node.agent.get_name()+"'.");
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
