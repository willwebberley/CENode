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
'use strict';

import CEAgent from './CEAgent.js';
import CEConcept from './CEConcept.js';
import CEInstance from './CEInstance.js';

class CENode{

 /*
 * Code for generating instance, concept, and card IDs.
 *
 * Instance/concept IDs based on number of each type so far created
 * Returns int
 * 
 * Card IDs based on number of cards and the local agent's name
 * Returns str
 */ 
  new_instance_id (){
    this.last_instance_id++;
    return this.last_instance_id;
  }
  new_concept_id (){
    this.last_concept_id++;
    return this.last_concept_id;
  }
  new_card_id (){
    this.last_card_id++;
    return this.agent.get_name() + this.last_card_id;
  }

  /*
   * Get the concept with ID 'id'
   *
   * Returns: obj{concept}
   */
  get_concept_by_id (id){
    return this._concept_dict[id];
  }

  /*
   * Get the concept with name 'name'
   *
   * Returns: obj{concept}
   */
  get_concept_by_name (name){
    if(name == null){return null;}
    for(var i = 0; i < this._concepts.length; i++){
      if(this._concepts[i].name.toLowerCase() == name.toLowerCase()){
        return this._concepts[i];
      }
      for(var j = 0; j < this._concepts[i].synonyms.length; j++){
        if(this._concepts[i].synonyms[j].toLowerCase() == name.toLowerCase()){
          return this._concepts[i];
        }
      }
    }
  }

  /* 
   * Get the instance with ID 'id'
   *
   * Returns: obj{instance}
   */
  get_instance_by_id (id) {
    return this._instance_dict[id];
  }

  /*
   * Get the instance with name 'name'
   *
   * Returns: obj{instance}
   */
  get_instance_by_name (name) {
    if(name==null){return null;}
    for(var i = 0; i < this._instances.length; i++) {
      if(this._instances[i].name.toLowerCase() == name.toLowerCase()){
        return this._instances[i];
      }
      for(var j = 0; j < this._instances[i].synonyms.length; j++){
        if(this._instances[i].synonyms[j].toLowerCase() == name.toLowerCase()){
          return this._instances[i];
        }
      }
    }
  }

  parse_rule (instruction){
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

  enact_rules (subject_instance, property_type, object_instance, source){
    if(typeof object_instance == "string"){
      return;
    }
    var rules = this.get_instances("rule");
    for(var i = 0; i < this.rules.length; i++){
      var rule = this.parse_rule(this.rules[i].instruction);
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
  parse_ce (t, nowrite, source){
    t = t.replace(/\s+/g, " ").replace(/\.+$/, "").trim(); // Replace all whitespace with a single space (e.g. removes tabs/newlines)
    var message = "";

    if(t.match(/^conceptualise an?/i)){
      var concept_name = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/i)[1];
      var stored_concept = this.get_concept_by_name(concept_name);
      var concept = null;
      if(stored_concept != null){ // if exists, simply modify existing concept
        message = "This concept already exists.";
        return [false, message];
      }
      else{ // otherwise create a new one and add it to list
        concept = new CEConcept(this, concept_name, source);
        
        // Writepoint
        if(nowrite == null || nowrite == false){
          this._concepts.push(concept);
          this._concept_dict[concept.id] = concept;
        }
      }

      var facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b)/g);
      for (var i=0; i<facts.length; i++) {
        var fact = facts[i].trim();

        // "has the type X as ~ label ~"
        if(fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
          var facts_info = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
          var value_type = this.get_concept_by_name(facts_info[1]);

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
          var parent_concept = this.get_concept_by_name(parent_name);
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
      concept = this.get_concept_by_name(concept_info[1]);
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
          var target = this.get_concept_by_name(facts_info[4]);
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
          target = this.get_concept_by_name(facts_info[2]);
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
          var type = this.get_concept_by_name(facts_info[1]);
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
        var concept = this.get_concept_by_name(concept_name);
        var current_instance = this.get_instance_by_name(instance_name);
        if(concept == null){
          message = "Instance type unknown: "+concept_name;
          return [false, message];
        }
        if(current_instance != null && current_instance.type.id == concept.id){
          message = "There is already an instance of this type with this name."; // Don't create 2 instances with same name and same concept id
          return [true, message, current_instance];
        }
        
        instance = new CEInstance(this, concept, instance_name, source);
        instance.sentences.push(t);
        
        // Writepoint
        if(nowrite == null || nowrite == false){
          this._instances.push(instance);
          this._instance_dict[instance.id] = instance;
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
          instance = this.get_instance_by_name(instance_name);
          concept = this.get_concept_by_name(concept_name);
        }
        if(names == null || concept == null || instance == null){
          names = t.match(/^the ([a-zA-Z0-9 ]*)/i);
          var name_tokens = names[1].split(" ");
          for(var i = 0; i < this._concepts.length; i++){
            if(names[1].toLowerCase().indexOf(this._concepts[i].name.toLowerCase()) == 0){
              concept_name = this._concepts[i].name;
              concept = this._concepts[i];
              instance_name = name_tokens[concept.name.split(" ").length];
              instance = this.get_instance_by_name(instance_name);
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
              value_instance = new CEInstance(this, this.get_concept_by_name(value_type), value_instance_name, source);
              // Writepoint 
              if(nowrite == null || nowrite == false){
                value_instance.sentences.push(t);
                this._instances.push(value_instance);
                this._instance_dict[value_instance.id] = value_instance;
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
            var relationship_type = this.get_concept_by_name(relationship_type_name);
            var relationship_instance = this.get_instance_by_name(relationship_instance_name);
            if(relationship_type == null){
              //message = "Unknown relationship type: "+relationship_type_name;
              //return [false, message];
            }
            else{
              if(relationship_instance == null){
                relationship_instance = new CEInstance(this, this.get_concept_by_name(relationship_type_name), relationship_instance_name, source);

                // Writepoint
                if(nowrite == null || nowrite == false){
                  relationship_instance.sentences.push(t);
                  this._instances.push(relationship_instance);
                  this._instance_dict[relationship_instance.id] = relationship_instance
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
  parse_question (t){
    if(t.match(/^where (is|are)/i)){
      var thing = t.match(/^where (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '');//.replace(/(\bthe\b|\ba\b)/g, '').trim();
      var instance = this.get_instance_by_name(thing);
      if(instance == null){
        message = "I don't know what "+thing+" is.";
        return [true, message];
      }
      var locatable_instances = this.get_instances("location", true);
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
      var locatable_instances = this.get_instances("location", true);
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
      for(var i = 0; i < this._instances.length; i++){
        var vals = this._instances[i].values;
        var rels = this._instances[i].relationships;
        if(vals!=null){for(var j = 0; j < vals.length; j++){
          if(vals[j].instance.id == instance.id){
            var thing = "the "+this._instances[i].type.name+" "+this._instances[i].name+" has the "+instance.type.name+" "+instance.name+" as "+vals[j].label;
            if(!(thing in things)){
              things[thing] = 0;
            }
            things[thing]++;
            thing_found = true;
          }
        }}   
        if(rels!=null){for(var j = 0; j < rels.length; j++){
          if(rels[j].instance.id == instance.id){
            var thing = "the "+this._instances[i].type.name+" "+this._instances[i].name+" "+rels[j].label+" the "+instance.type.name+" "+instance.name;
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
        instance = this.get_instance_by_name(name[2]);
        if(instance != null){
          return [true, instance.gist];
        }      
      }

      // Otherwise, try and infer it
      name = t.match(/^(?:\bwho\b|\bwhat\b) (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9_ ]*)/i)[1].replace(/\?/g, '').replace(/'/g, '');
      instance = this.get_instance_by_name(name);
      if(instance == null){
        var concept = this.get_concept_by_name(name);
        if(concept == null){
          var possibilities = [];
          for(var i = 0; i < this._concepts.length; i++){
            for(var j = 0; j < this._concepts[i].values.length; j++){
              var v = this._concepts[i].values[j];
              if(v.label.toLowerCase() == name.toLowerCase()){
                if(v.type == 0){
                  possibilities.push("is a possible value of a type of "+this._concepts[i].name+" (e.g. \"the "+this._concepts[i].name+" '"+this._concepts[i].name.toUpperCase()+" NAME' has 'VALUE' as "+name+"\")");
                }
                else{
                  possibilities.push("is a possible "+v.concept.name+" type of a type of "+this._concepts[i].name+" (e.g. \"the "+this._concepts[i].name+" '"+this._concepts[i].name.toUpperCase()+" NAME' has the "+v.concept.name+" '"+v.concept.name.toUpperCase()+" NAME' as "+name+"\")");
                }
              }     
            }
            for(var j = 0; j < this._concepts[i].relationships.length; j++){
              var r = this._concepts[i].relationships[j];
              if(r.label.toLowerCase() == name.toLowerCase()){
                possibilities.push("describes the relationship between a type of "+this._concepts[i].name+" and a type of "+r.concept.name+" (e.g. \"the "+this._concepts[i].name+" '"+this._concepts[i].name.toUpperCase()+" NAME' "+name+" the "+r.concept.name+" '"+r.concept.name.toUpperCase()+" NAME'\")");
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
            instance = this.get_instance_by_name(test_string);
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
            instance = this.get_instance_by_name(test_string);
          }
          if(!instance && test_string[test_string.length-1].toLowerCase() == 's'){
            instance = this.get_instance_by_name(test_string.substring(0, test_string.length - 1));
          }
          if(instance){
            break;
          }
        } 
        if(instance){
          var property_name = tokens.splice(0, tokens.length - instance.name.split(' ').length).join(' ').trim();
          for(var i = 0; i < this._instances.length; i++){
            var subject = this._instances[i];
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
        ins = this.get_instances(con);
        s = "Instances of type '"+con+"':";
      }
      else if(t.toLowerCase().indexOf("list all instances of type") == 0){
        var con = t.toLowerCase().replace("list all instances of type", "").trim();
        ins = this.get_instances(con, true);
        s = "All instances of type '"+con+"':";
      }
      else if(t.toLowerCase() == "list instances"){
        ins = this._instances;    
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
  parse_nl (t){
    t = t.replace(/'/g, '').replace(/\./g, '');
    var tokens = t.split(" ");
    var and_facts = t.split(/\band\b/);

    // Try to find any mentions of known instances and tie them together using
    // values and relationships.
    
    var common_words = ["there", "what", "who", "where", "theres", "is", "as", "and", "has", "that", "the", "a", "an", "named", "called", "name", "with", "conceptualise", "on", "at", "in"];
    var focus_instance=null;
    var smallest_index = 999999;
    for(var i = 0; i < this._instances.length; i++){
      var possible_names = this._instances[i].synonyms.concat(this._instances[i].name);
      for(var j = 0; j < possible_names.length; j++){
        if(t.toLowerCase().indexOf(possible_names[j].toLowerCase()) > -1){
          if(t.toLowerCase().indexOf(possible_names[j].toLowerCase()) < smallest_index){
            focus_instance = this._instances[i];
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
            var value_instances = this.get_instances(value_concept.name, true);
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
            var rel_instances = this.get_instances(rel_concept.name, true);
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

    for(var i = 0; i < this._concepts.length; i++){
      if(t.toLowerCase().indexOf(this._concepts[i].name.toLowerCase()) > -1){
        var concept_words = this._concepts[i].name.toLowerCase().split(" ");
        common_words.push(this._concepts[i].name.toLowerCase());
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
          return [true, "there is a "+this._concepts[i].name+" named '"+new_instance_name.trim()+"'"];
        }
        return [true, "there is a "+this._concepts[i].name+" named '"+_concepts[i].name+" "+_instances.length+1+"'"];
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
  guess_next (t){
    var s = t.trim().toLowerCase();
    var tokens = t.split(" ");
    var last_word = tokens[tokens.length-1];
    var last_concept = this._concepts[this._concepts.length-1];
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
      for(var i = 0; i < this._instances.length; i++){
        possible_words.push(this._instances[i].name);
        if(s.indexOf(this._instances[i].name.toLowerCase()) > -1){
          mentioned_instances.push(this._instances[i]);
        }
      }
    }
    for(var i = 0; i < this._concepts.length; i++){
      possible_words.push(this._concepts[i].name);
      var concept_mentioned = false;
      for(var j = 0; j < mentioned_instances.length; j++){
        if(mentioned_instances[j].concept_id == this._concepts[i].id){concept_mentioned = true;break;}
      }
      if(s.indexOf(this._concepts[i].name.toLowerCase()) > -1 || concept_mentioned){
        for(var j = 0; j < this._concepts[i].values.length; j++){possible_words.push(this._concepts[i].values[j].label);}
        for(var j = 0; j < this._concepts[i].relationships.length; j++){possible_words.push(this._concepts[i].relationships[j].label);}
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
  get_instances (concept_type, recurse){
    var instance_list = [];
    if(concept_type == null){
      instance_list = this._instances;
    }
    else if(concept_type != null && (recurse == null || recurse == false)){
      var concept = this.get_concept_by_name(concept_type);
      if(concept){
        for(var i = 0; i < this._instances.length; i++){
          if(this._instances[i].type.id == concept.id){
            instance_list.push(this._instances[i]);
          }
        }
      }
    }
    else if(concept_type != null && recurse == true){
      var concept = this.get_concept_by_name(concept_type);
      if(concept){
        var descendants = concept.descendants.concat(concept);
        var children_ids = [];
        for(var i = 0; i < descendants.length; i++){children_ids.push(descendants[i].id);}
        for(var i = 0; i < this._instances.length; i++){
          if(children_ids.indexOf(this._instances[i].type.id) > -1){
            instance_list.push(this._instances[i]);
          }
        }
      }
    }
    return instance_list;
  }

  get instances (){
    return this._instances;
  }

  /*
   * Get all concepts known by the node
   *
   * Returns: [obj{concept}]
   */
  get_concepts (){
    return this._concepts;
  }

  get concepts (){
    return this._concepts;
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
  add_sentence (sentence, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", this.new_card_id());
    var return_data = {};
    var ce_success = this.parse_ce(sentence, false, source);
    if(ce_success[0] == false){
      var question_success = this.parse_question(sentence);
      if(question_success[0] == false){
        var nl_success = this.parse_nl(sentence);
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
  add_ce (sentence, nowrite, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", this.new_card_id());
    var return_data = {};
    var success = this.parse_ce(sentence, nowrite, source);
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
  ask_question (sentence){
    var return_data = {};
    var success = this.parse_question(sentence);
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
  add_nl (sentence){
    var return_data = {};
    var success = this.parse_nl(sentence);
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
  add_sentences (sentences, source){
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
  load_model (sentences){
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
  reset_all (){
    this._instances = [];
    this._concepts = [];
  }

  /* 
   * Initialise node by adding any passed models as
   * sentence sets to be processed.
   */
  constructor (){
    this._concepts = [];
    this._instances = [];
    this._concept_dict = {};
    this._instance_dict = {};
    this.rules = [];
    this.concept_ids = {};
    this.agent = new CEAgent(this);
    this.last_instance_id = this._instances.length;
    this.last_concept_id = this._concepts.length;
    this.last_card_id = 0;
    for(var i = 0; i < arguments.length; i++){
      this.load_model(arguments[i]);
    }
  }
}
module.exports = CENode;


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
      localStorage.setItem(key+"_instances", JSON.stringify(this.get_instances()));
      localStortage.setItem(key+"_concepts", JSON.stringify(this.get_concepts()));
    } catch(err){console.log(err);}
  },
  store_node_node: function(key, node){
    var fs = require('fs');
    var file = JSON.stringify(this.get_concepts())+"NODESEPARATOR"+JSON.stringify(this.get_instances());
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

// If running as a Node.js service, start the server.
if(!util.on_client() && require.main === module){
  var POST_SENTENCES_ENDPOINT = "/sentences";
  var GET_CARDS_ENDPOINT = "/cards";
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
