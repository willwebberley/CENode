exports.CEInstance = function CEInstance(node, type, name, source){
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
  Object.defineProperty(instance, 'type', {get: function(){for(var i = 0; i < node._concepts.length; i++){if(node._concepts[i].id == type.id){return node._concepts[i];}}}});
  Object.defineProperty(type, name.toLowerCase(), {get: function(){return instance;}, configurable: true});
  Object.defineProperty(instance, 'relationships', {get: function(){
    var rels = [];
    for(var i = 0; i < instance._relationships.length; i++){
      var relationship = {};
      relationship.label = instance._relationships[i].label;
      relationship.source = instance._relationships[i].source;
      relationship.instance = node.get_instance_by_id(instance._relationships[i].target_id);
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
        value.instance = node.get_instance_by_id(instance._values[i].type_id);
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
        Object.defineProperty(instance, value_name_field, {get: function(){return value.type_id == 0 ? value.type_name : node.get_instance_by_id(value.type_id);}, configurable: true});
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
        Object.defineProperty(instance, rel_name_field, {get: function(){return node.get_instance_by_id(relationship.target_id);}, configurable: true});
        if(reserved_fields.indexOf(rel_name_field+'s') == -1 && !instance.hasOwnProperty(rel_name_field+'s')){
          Object.defineProperty(instance, rel_name_field+'s', {get: function(){
            var instances = [];
            for(var i = 0; i < instance._relationships.length; i++){
              if(instance._relationships[i].label.toLowerCase().replace(/ /g, '_') == rel_name_field){
                instances.push(node.get_instance_by_id(instance._relationships[i].target_id));
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
        var value_instance = node.get_instance_by_id(value.type_id);
        var value_concept = value_instance.type; 
        facts.push("has the "+value_concept.name+" '"+value_instance.name+"' as "+value.label);
      }
    }
    for(var i = 0; i < instance._relationships.length; i++){
      var relationship = instance._relationships[i];
      var relationship_instance = node.get_instance_by_id(relationship.target_id);
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
        var value_instance = node.get_instance_by_id(value.type_id);
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
      var relationship_instance = node.get_instance_by_id(relationship.target_id);
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
