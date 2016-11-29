class CEConcept{

  constructor (node, name, source){
    this.name = name;
    this.source = source;
    this.id = node.new_concept_id();
    this.node = node;
    this._parents = [];
    this._values = [];
    this._relationships = [];
    this._synonyms = [];
    this.concept = this;
    this.reserved_fields = ['values', 'relationships', 'synonyms', 'add_value', 'add_relationship', 'name', 'concept', 'id', 'sentences', 'ce', 'gist'];
    const concept = this;
    Object.defineProperty(node.concepts, name.toLowerCase().replace(/ /g, '_'), {
      get (){
        return concept;
      },
      configurable: true
    });
  }

  get instances (){ 
    var instances = [];
    for(var i = 0; i < this.node._instances.length; i++){
      if(this.node._instances[i].type.id == this.id){
        instances.push(this.node._instances[i]);
      } 
    }
    return instances;
  };

  get all_instances (){
    var all_concepts = this.descendants.concat(this);
    var instances = [];
    for(var i = 0; i < this.node._instances.length; i++){
      for(var j = 0; j < all_concepts.length; j++){
        if(this.node._instances[i].type.id == all_concepts[j].id){
          instances.push(this.node._instances[i]);
        } 
      }
    }
    return instances;
  };

  get parents (){
    var p = [];
    for(var i = 0; i < this._parents.length; i++){
      p.push(this.node.get_concept_by_id(this._parents[i]));
    }
    return p;  
  };

  get ancestors (){
    var parents = [];
    var stack = [];
    for(var i = 0; i < this.parents.length; i++){
      stack.push(this.parents[i]);
    }
    while(stack.length > 0){
      var current = stack.pop();
      parents.push(current);
      for(var i = 0; i < current.parents.length; i++){
        stack.push(current.parents[i]);
      }
    }
    return parents;
  };

  get children (){  
    var children = [];
    for(var i = 0; i < this.node._concepts.length; i++){
      for(var j = 0; j < this.node._concepts[i].parents.length; j++){
        if(this.node._concepts[i].parents[j].id == this.id){
          children.push(this.node._concepts[i]);
        }
      }
    }
    return children;
  };

  get descendants (){  
    var children = [];
    var stack = [];
    for(var i = 0; i < this.children.length; i++){
      stack.push(this.children[i]);
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
  };

  get relationships (){
    var rels = [];
    for(var i = 0; i < this._relationships.length; i++){
      var relationship = {};
      relationship.label = this._relationships[i].label;
      relationship.concept = this.node.get_concept_by_id(this._relationships[i].target);
      rels.push(relationship);
    }
    return rels;
  };

  get values (){
    var vals = [];
    for(var i = 0; i < this._values.length; i++){
      var value = {};
      value.label = this._values[i].label;
      if(this._values[i].type_id == 0){
        value.concept = this._values[i].type_name;
      } 
      else{
        value.concept = this.node.get_concept_by_id(this._values[i].type);
      }
      vals.push(value);
    }
    return vals;
  };

  get synonyms (){
    return this._synonyms;
  };

  get ce (){ 
    var ce = "conceptualise a ~ "+this.name+" ~ "+this.name.charAt(0).toUpperCase();
    if(this.parents.length > 0 || this._values.length > 0 || this._relationships.length > 0){
      ce += " that";
    }
    if(this.parents.length > 0){
      for(var i = 0; i < this.parents.length; i++){
        ce+= " is a "+this.parents[i].name;
        if(i < this.parents.length-1){ce+=" and";}
      }
    }
    var facts = [];
    var alph = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"];
    for(var i = 0; i < this._values.length; i++){
      if(this._values[i].type == 0){
        facts.push("has the value "+alph[i]+" as "+this._values[i].label);
      }
      else{
        var val_type = this.node.get_concept_by_id(this._values[i].type);
        facts.push("has the "+val_type.name+" "+val_type.name.charAt(0).toUpperCase()+" as "+this._values[i].label);
      }
    }  
    if(facts.length > 0){
      if(this.parents.length > 0){ce += " and";}
      ce += " "+facts.join(" and ");
    }
    ce+=".";
    if(this._relationships.length > 0){
      facts = [];
      ce += "\nconceptualise the "+this.name+" "+this.name.charAt(0).toUpperCase();
      for(var i = 0; i < this._relationships.length; i++){
        var rel_type = this.node.get_concept_by_id(this._relationships[i].target);
        facts.push("~ "+this._relationships[i].label+" ~ the "+rel_type.name+" "+alph[i]);
      }
      if(facts.length > 0){
        if(this.parents.length > 0 || this._values.length > 0){ce += " and";}
        ce += " "+facts.join(" and ")+".";
      }
    }
    return ce;
  };

  get gist (){
    var gist = "";
    if(this.parents.length > 0){gist += "A "+this.name;}
    for(var i = 0; i < this.parents.length; i++){
      gist += " is a type of "+this.parents[i].name;
      if(i < this.parents.length-1){gist+=" and";}
    }
    if(this.parents.length > 0){gist += ".";}
    var facts = [];
    for(var i = 0; i < this._values.length; i++){
      if(this._values[i].type == 0){
        facts.push("has a value called "+this._values[i].label);
      }
      else{
        var val_type = this.node.get_concept_by_id(this._values[i].type);
        facts.push("has a type of "+val_type.name+" called "+this._values[i].label);
      }
    }  
    for(var i = 0; i < this._relationships.length; i++){
      var rel_type = this.node.get_concept_by_id(this._relationships[i].target);
      facts.push(this._relationships[i].label+" a type of "+rel_type.name);
    }
    if(facts.length > 0){
      gist += " An instance of "+this.name+" "+facts.join(" and ")+".";
    }
    else if(facts.length == 0 && this.parents.length == 0){
      gist += "A "+this.name+" has no attributes or relationships.";
    }
    return gist;
  };
   
  add_value (label, type, source){
    var value = {};
    value.source = source;
    value.label = label;
    value.type = typeof type === 'number' ? type : type.id;
    this._values.push(value); 
    Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
      get (){
        return type == 0 ? 'value' : type;
      }, 
      configurable: true
    });
  }

  add_relationship (label, target, source){
    var relationship = {};
    relationship.source = source;
    relationship.label = label;
    relationship.target = target.id;
    this._relationships.push(relationship);
    Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
      get (){
        return target;
      },
      configurable: true
    });
  } 

  add_parent (parent_concept){
    if(this.parents.indexOf(parent_concept.id) == -1){
      this._parents.push(parent_concept.id);
    }
  }

  add_synonym (synonym){
    for(var i = 0; i < this._synonyms.length; i++){
      if(this._synonyms[i].toLowerCase() == synonym.toLowerCase()){
        return;
      }
    }
    this._synonyms.push(synonym);
  }
}
module.exports = CEConcept;
