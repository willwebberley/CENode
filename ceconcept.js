exports.CEConcept = function CEConcept(node, name, source){
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
          instances.push(node._instances[i]);
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
      p.push(node.get_concept_by_id(concept._parents[i]));
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
    for(var i = 0; i < node._concepts.length; i++){
      for(var j = 0; j < node._concepts[i].parents.length; j++){
        if(node._concepts[i].parents[j].id == concept.id){
          children.push(node._concepts[i]);
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
      relationship.concept = node.get_concept_by_id(concept._relationships[i].target);
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
        value.concept = node.get_concept_by_id(concept._values[i].type);
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
        var rel_type = node.get_concept_by_id(concept._relationships[i].target);
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
        var val_type = node.get_concept_by_id(concept._values[i].type);
        facts.push("has a type of "+val_type.name+" called "+concept._values[i].label);
      }
    }  
    for(var i = 0; i < concept._relationships.length; i++){
      var rel_type = node.get_concept_by_id(concept._relationships[i].target);
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
