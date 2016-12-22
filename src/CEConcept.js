'use strict';

class CEConcept{

  constructor (node, name, source){
    this.name = name;
    this.source = source;
    this.id = node.newConceptId();
    this.node = node;
    this._parents = [];
    this._values = [];
    this._relationships = [];
    this._synonyms = [];

    const concept = this;
    Object.defineProperty(node.concepts, name.toLowerCase().replace(/ /g, '_'), {
      get (){
        return concept;
      },
      configurable: true
    });
  }

  get instances (){ 
    const instances = [];
    for(let i = 0; i < this.node._instances.length; i++){
      if(this.node._instances[i].type.id == this.id){
        instances.push(this.node._instances[i]);
      } 
    }
    return instances;
  };

  get allInstances (){
    const allConcepts = this.descendants.concat(this);
    const  instances = [];
    for(let i = 0; i < this.node._instances.length; i++){
      for(let j = 0; j < allConcepts.length; j++){
        if(this.node._instances[i].type.id == allConcepts[j].id){
          instances.push(this.node._instances[i]);
        } 
      }
    }
    return instances;
  };

  get parents (){
    const p = [];
    for(let i = 0; i < this._parents.length; i++){
      p.push(this.node.getConceptById(this._parents[i]));
    }
    return p;  
  };

  get ancestors (){
    const parents = [];
    const stack = [];
    for(let i = 0; i < this.parents.length; i++){
      stack.push(this.parents[i]);
    }
    while(stack.length > 0){
      const current = stack.pop();
      parents.push(current);
      for(let i = 0; i < current.parents.length; i++){
        stack.push(current.parents[i]);
      }
    }
    return parents;
  };

  get children (){  
    const children = [];
    for(let i = 0; i < this.node._concepts.length; i++){
      for(let j = 0; j < this.node._concepts[i].parents.length; j++){
        if(this.node._concepts[i].parents[j].id == this.id){
          children.push(this.node._concepts[i]);
        }
      }
    }
    return children;
  };

  get descendants (){  
    const children = [];
    const stack = [];
    for(let i = 0; i < this.children.length; i++){
      stack.push(this.children[i]);
    }
    while(stack.length > 0){
      const current = stack.pop();
      children.push(current);
      const currentChildren = current.children;
      if(currentChildren != null){
        for(let i = 0; i < currentChildren.length; i++){
          stack.push(currentChildren[i]);
        }
      }
    }
    return children;
  };

  get relationships (){
    const rels = [];
    for(let i = 0; i < this._relationships.length; i++){
      const relationship = {};
      relationship.label = this._relationships[i].label;
      relationship.concept = this.node.getConceptById(this._relationships[i].target);
      rels.push(relationship);
    }
    return rels;
  };

  get values (){
    const vals = [];
    for(let i = 0; i < this._values.length; i++){
      let value = {};
      value.label = this._values[i].label;
      if(this._values[i].typeId == 0){
        value.concept = this._values[i].typeName;
      } 
      else{
        value.concept = this.node.getConceptById(this._values[i].type);
      }
      vals.push(value);
    }
    return vals;
  };

  get synonyms (){
    return this._synonyms;
  };

  get ce (){ 
    let ce = 'conceptualise a ~ '+this.name+' ~ '+this.name.charAt(0).toUpperCase();
    if(this.parents.length > 0 || this._values.length > 0 || this._relationships.length > 0){
      ce += ' that';
    }
    if(this.parents.length > 0){
      for(let i = 0; i < this.parents.length; i++){
        ce+= ' is a '+this.parents[i].name;
        if(i < this.parents.length-1){ce+=' and';}
      }
    }
    let facts = [];
    const alph = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];
    for(let i = 0; i < this._values.length; i++){
      if(this._values[i].type == 0){
        facts.push('has the value '+alph[i]+' as '+this._values[i].label);
      }
      else{
        const valType = this.node.getConceptById(this._values[i].type);
        facts.push('has the '+valType.name+' '+valType.name.charAt(0).toUpperCase()+' as '+this._values[i].label);
      }
    }  
    if(facts.length > 0){
      if(this.parents.length > 0){ce += ' and';}
      ce += ' '+facts.join(' and ');
    }
    ce+='.';
    if(this._relationships.length > 0){
      facts = [];
      ce += '\nconceptualise the '+this.name+' '+this.name.charAt(0).toUpperCase();
      for(let i = 0; i < this._relationships.length; i++){
        const relType = this.node.getConceptById(this._relationships[i].target);
        facts.push('~ '+this._relationships[i].label+' ~ the '+relType.name+' '+alph[i]);
      }
      if(facts.length > 0){
        if(this.parents.length > 0 || this._values.length > 0){ce += ' and';}
        ce += ' '+facts.join(' and ')+'.';
      }
    }
    return ce;
  };

  get gist (){
    let gist = '';
    if(this.parents.length > 0){gist += 'A '+this.name;}
    for(let i = 0; i < this.parents.length; i++){
      gist += ' is a type of '+this.parents[i].name;
      if(i < this.parents.length-1){gist+=' and';}
    }
    if(this.parents.length > 0){gist += '.';}
    const facts = [];
    for(let i = 0; i < this._values.length; i++){
      if(this._values[i].type == 0){
        facts.push('has a value called '+this._values[i].label);
      }
      else{
        const valType = this.node.getConceptById(this._values[i].type);
        facts.push('has a type of '+valType.name+' called '+this._values[i].label);
      }
    }  
    for(let i = 0; i < this._relationships.length; i++){
      const relType = this.node.getConceptById(this._relationships[i].target);
      facts.push(this._relationships[i].label+' a type of '+relType.name);
    }
    if(facts.length > 0){
      gist += ' An instance of '+this.name+' '+facts.join(' and ')+'.';
    }
    else if(facts.length == 0 && this.parents.length == 0){
      gist += 'A '+this.name+' has no attributes or relationships.';
    }
    return gist;
  };
   
  addValue (label, type, source){
    const value = {};
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

  addRelationship (label, target, source){
    const relationship = {};
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

  addParent (parentConcept){
    if(this.parents.indexOf(parentConcept.id) == -1){
      this._parents.push(parentConcept.id);
    }
  }

  addSynonym (synonym){
    for(let i = 0; i < this._synonyms.length; i++){
      if(this._synonyms[i].toLowerCase() == synonym.toLowerCase()){
        return;
      }
    }
    this._synonyms.push(synonym);
  }
}
module.exports = CEConcept;
