'use strict';

class NLParser{
  
  parse (t){
    const tokens = t.split(" ");
    const andFacts = t.split(/\band\b/);

    // Try to find any mentions of known instances and tie them together using
    // values and relationships.
    
    const commonWords = ["there", "what", "who", "where", "theres", "is", "as", "and", "has", "that", "the", "a", "an", "named", "called", "name", "with", "conceptualise", "on", "at", "in"];
    let focusInstance=null;
    let smallestIndex = 999999;
    for(let i = 0; i < this.node._instances.length; i++){
      const possibleNames = this.node._instances[i].synonyms.concat(this.node._instances[i].name);
      for(let j = 0; j < possibleNames.length; j++){
        if(t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) > -1){
          if(t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) < smallestIndex){
            focusInstance = this.node._instances[i];
            smallestIndex = t.toLowerCase().indexOf(possibleNames[j].toLowerCase());
            break;
          }
        }
      }
    }
    if(focusInstance != null){
      const focusConcept = focusInstance.type;
      const focusInstanceWords = focusInstance.name.toLowerCase().split(" ");
      const focusConceptWords = focusConcept.name.toLowerCase().split(" ");
      for(let i = 0; i < focusInstanceWords.length; i++){commonWords.push(focusInstanceWords[i]);}
      for(let i = 0; i < focusConceptWords.length; i++){commonWords.push(focusConceptWords[i]);}

      let ce = "the "+focusConcept.name+" '"+focusInstance.name+"' ";
      const facts = [];

      const parents = focusConcept.ancestors;
      parents.push(focusConcept);

      let possibleRelationships = [];
      let possibleValues = [];
      for (let i = 0; i < parents.length; i++) {
        possibleRelationships = possibleRelationships.concat(parents[i].relationships);
        possibleValues = possibleValues.concat(parents[i].values);
      }

      const andFacts = t.split(/\band\b/g);
      for(let k = 0; k < andFacts.length; k++){
        const f = andFacts[k].toLowerCase(); 
        const factTokens = f.split(" ");
        for(let i = 0; i < possibleValues.length; i++){
          const valueWords = possibleValues[i].label.toLowerCase().split(" ");
          for(let j = 0; j < valueWords.length; j++){commonWords.push(valueWords[j]);}

          if(possibleValues[i].concept){
            const valueConcept = possibleValues[i].concept;
            const valueInstances = this.node.getInstances(valueConcept.name, true);
            for(let j = 0; j < valueInstances.length; j++){
              const possibleNames = valueInstances[j].synonyms.concat(valueInstances[j].name);
              for(let l = 0; l < possibleNames.length; l++){
                if(f.toLowerCase().indexOf(possibleNames[l].toLowerCase())>-1){
                  facts.push("has the "+valueConcept.name+" '"+valueInstances[j].name+"' as "+possibleValues[i].label);
                  break;
                }
              }
            }
          }
          else{
            if(f.toLowerCase().indexOf(possibleValues[i].label.toLowerCase()) > -1){
              let valueName = "";
              for(let j = 0; j < factTokens.length; j++){
                if(commonWords.indexOf(factTokens[j].toLowerCase()) == -1 ){
                  valueName += factTokens[j]+" ";
                }
              }
              if(valueName != ""){
                facts.push("has '"+valueName.trim()+"' as "+possibleValues[i].label);
              }   
            }
          }
        }

        const usedIndices = [];
        for(let i = 0; i < possibleRelationships.length; i++){
          if(possibleRelationships[i].concept){
            const relConcept = possibleRelationships[i].concept;
            const relInstances = this.node.getInstances(relConcept.name, true);
            for(let j = 0; j < relInstances.length; j++){
              const possibleNames = relInstances[j].synonyms.concat(relInstances[j].name);
              for(let k = 0; k < possibleNames.length; k++){
                const index = f.toLowerCase().indexOf(' '+possibleNames[k].toLowerCase()); // ensure object at least starts with the phrase (but not ends with, as might be plural)
                if(index >- 1 && usedIndices.indexOf(index) == -1){
                  facts.push(possibleRelationships[i].label+" the "+relConcept.name+" '"+relInstances[j].name+"'");
                  usedIndices.push(index);
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

    for(let i = 0; i < this.node._concepts.length; i++){
      if(t.toLowerCase().indexOf(this.node._concepts[i].name.toLowerCase()) > -1){
        const conceptWords = this.node._concepts[i].name.toLowerCase().split(" ");
        commonWords.push(this.node._concepts[i].name.toLowerCase());
        for(let j = 0; j < conceptWords; j++){
          commonWords.push(conceptWords[j]);
        }
        let newInstanceName = "";
        for(let j = 0; j < tokens.length; j++){
          if(commonWords.indexOf(tokens[j].toLowerCase()) == -1){
            newInstanceName += tokens[j]+" ";
          }
        }
        if(newInstanceName != ""){
          return [true, "there is a "+this.node._concepts[i].name+" named '"+this.node.newInstanceName.trim()+"'"];
        }
        return [true, "there is a "+this.node._concepts[i].name+" named '"+this.node._concepts[i].name+" "+this.node._instances.length+1+"'"];
      }
    }
    return [false, "Un-parseable input: "+t];
  } 

  constructor (node){
    this.node = node;
  }
}
module.exports = NLParser;
