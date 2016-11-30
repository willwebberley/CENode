class CEInstance{
  
  constructor (node, type, name, source){
    this.name = name;
    this.source = source;
    this.id = node.new_instance_id();
    this.concept = type;
    this.node = node;
    this.type_id = type.id;
    this.sentences = [];
    this._values = [];
    this._relationships = [];
    this._synonyms = [];
    this.reserved_fields = ['values', 'relationships', 'synonyms', 'add_value', 'add_relationship', 'name', 'concept', 'id', 'instance', 'sentences', 'ce', 'gist'];

    const instance = this;
    Object.defineProperty(node.instances, name.toLowerCase().replace(/ /g, '_').replace(/'/g, ''), {
      get (){
        return instance;
      }, 
      configurable: true
    });

    Object.defineProperty(type, name.toLowerCase(), {
      get (){
        return instance;
      },
      configurable: true
    });
  }
  
  get type (){
    for(var i = 0; i < this.node._concepts.length; i++){
      if(this.node._concepts[i].id == this.concept.id){
        return this.node._concepts[i];
      }
    }
  }

  get relationships (){
    var rels = [];
    for(var i = 0; i < this._relationships.length; i++){
      var relationship = {};
      relationship.label = this._relationships[i].label;
      relationship.source = this._relationships[i].source;
      relationship.instance = this.node.get_instance_by_id(this._relationships[i].target_id);
      rels.push(relationship);
    }
    return rels;
  }

  get values (){
    var vals = [];
    for(var i = 0; i < this._values.length; i++){
      var value = {};
      value.label = this._values[i].label;
      value.source = this._values[i].source;
      if(this._values[i].type_id == 0){
        value.instance = this._values[i].type_name;
      } 
      else{
        value.instance = this.node.get_instance_by_id(this._values[i].type_id);
      }
      vals.push(value);
    }
    return vals;
  }

  add_sentence (sentence){
    this.sentences.push(sentence);
  }

  get_possible_properties (){
    var ancestor_instances = this.concept.ancestors;
    ancestor_instances.push(this.concept);
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

  add_value (label, value_instance, propagate, source){
    if(this.get_possible_properties().values.indexOf(label.toLowerCase()) > -1){
      var value = {};
      value.source = source;
      value.label = label;
      value.type_id = typeof value_instance === 'object' ? value_instance.id : 0;
      value.type_name = typeof value_instance === 'object' ? value_instance.name : value_instance;
      this._values.push(value);
      var value_name_field = label.toLowerCase().replace(/ /g, '_');

      if(this.reserved_fields.indexOf(value_name_field) == -1){
        Object.defineProperty(this, value_name_field, {
          get (){
            return value.type_id == 0 ? value.type_name : this.node.get_instance_by_id(value.type_id);},
          configurable: true
        });

        if(this.reserved_fields.indexOf(value_name_field+'s') == -1 && !this.hasOwnProperty(value_name_field+'s')){
          Object.defineProperty(this, value_name_field+'s', {
            get (){
              var instances = [];
              for(var i = 0; i < this._values.length; i++){
                if(this._values[i].label.toLowerCase().replace(/ /g, '_') == value_name_field){
                  instances.push(this._values[i].type_id == 0 ? this._values[i].type_name : this.node.get_instance_by_id(this._values[i].type_id));
                }
              }
              return instances;
            }
          });
        }
      }
      if(propagate == null || propagate != false){
        this.node.enact_rules(this, 'value', value_instance, source);
      }
    }
  }

  add_relationship (label, relationship_instance, propagate, source){
    if(this.get_possible_properties().relationships.indexOf(label.toLowerCase()) > -1){
      var relationship = {};
      relationship.label = label;
      relationship.source = source;
      relationship.target_id = relationship_instance.id;
      relationship.target_name = relationship_instance.name;
      this._relationships.push(relationship);
      var rel_name_field = label.toLowerCase().replace(/ /g, '_');

      if(this.reserved_fields.indexOf(rel_name_field) == -1){
        Object.defineProperty(this, rel_name_field, {
          get (){
            return this.node.get_instance_by_id(relationship.target_id);
          },
          configurable: true
        });

        if(this.reserved_fields.indexOf(rel_name_field+'s') == -1 && !this.hasOwnProperty(rel_name_field+'s')){
          Object.defineProperty(this, rel_name_field+'s', {
            get (){
              var instances = [];
              for(var i = 0; i < this._relationships.length; i++){
                if(this._relationships[i].label.toLowerCase().replace(/ /g, '_') == rel_name_field){
                  instances.push(this.node.get_instance_by_id(this._relationships[i].target_id));
                }
              }
              return instances;
            }
          });
        }
      }
      if(propagate == null || propagate != false){
        this.node.enact_rules(this, 'relationship', relationship_instance, source);
      }
    }
  }

  add_synonym (synonym){
    for(var i = 0; i < this._synonyms.length; i++){
      if(this._synonyms[i].toLowerCase() == synonym.toLowerCase()){
        return;
      }
    }
    this._synonyms.push(synonym);
    Object.defineProperty(this, synonym.toLowerCase().replace(/ /g, '_'), {
      get (){
        return instance;
      }
    });
  }

  property (property_name, source){
    return this.properties(property_name, source, true);
  }   

  properties (property_name, source, only_one){
    var properties = [];
    for(var i = this.values.length - 1; i >= 0; i--){ // Reverse so we get the latest prop first
      if(this.values[i].label.toLowerCase() == property_name.toLowerCase()){
        var inst = this.values[i].instance;
        var dat = source ? {instance: inst, source: this.values[i].source} : inst;
        if(only_one){return dat;}
        properties.push(dat);
      }
    }
    for(var i = this.relationships.length - 1; i >= 0; i--){ // Reverse so we get the latest prop first
      if(this.relationships[i].label.toLowerCase() == property_name.toLowerCase()){
        var inst = this.relationships[i].instance;
        var dat = source ? {instance: inst, source: this.relationships[i].source} : inst;
        if(only_one){return dat;}
        properties.push(dat);
      }
    }
    return only_one ? null : properties;
  }

  get synonyms (){
    return this._synonyms;
  }

  get ce () {
    var concept = this.concept;
    if(concept == null){return;}
    var ce = "there is a "+concept.name+" named '"+this.name+"'";
    var facts = [];
    for(var i = 0; i < this._values.length; i++){
      var value = this._values[i];
      if(value.type_id == 0){
        facts.push("has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.label)
      }
      else{
        var value_instance = this.node.get_instance_by_id(value.type_id);
        var value_concept = value_instance.type; 
        facts.push("has the "+value_concept.name+" '"+value_instance.name+"' as "+value.label);
      }
    }
    for(var i = 0; i < this._relationships.length; i++){
      var relationship = this._relationships[i];
      var relationship_instance = this.node.get_instance_by_id(relationship.target_id);
      var relationship_concept = relationship_instance.type;
      facts.push(relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'");
    }
    if(facts.length > 0){ce += " that "+facts.join(" and ");}
    return ce+".";
  }

  get gist () {
    var vowels = ["a", "e", "i", "o", "u"];
    var concept = this.concept;
    if(concept == null){return;}
    var gist = this.name+" is";
    if(vowels.indexOf(concept.name.toLowerCase()[0]) > -1){gist+=" an "+concept.name+".";}
    else{gist+=" a "+concept.name+".";}
    var facts = {};
    var fact_found = false;
    for(var i = 0; i < this._values.length; i++){
      fact_found = true;
      var value = this._values[i];
      var fact = "";
      if(value.type_id == 0){
        fact = "has '"+value.type_name.replace(/'/g, "\\'")+"' as "+value.label;
      }
      else{
        var value_instance = this.node.get_instance_by_id(value.type_id);
        var value_concept = value_instance.type;
        fact = "has the "+value_concept.name+" '"+value_instance.name+"' as "+value.label;
      }
      if(!(fact in facts)){
        facts[fact] = 0;
      }
      facts[fact]++;
    }
    for(var i = 0; i < this._relationships.length; i++){
      fact_found = true;
      var relationship = this._relationships[i];
      var relationship_instance = this.node.get_instance_by_id(relationship.target_id);
      var relationship_concept = relationship_instance.type;
      var fact = relationship.label+" the "+relationship_concept.name+" '"+relationship_instance.name+"'";
      if(!(fact in facts)){
        facts[fact] = 0;
      }
      facts[fact]++;
    }
    if(fact_found){
      gist += " "+this.name;
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
  }
}
module.exports = CEInstance;
