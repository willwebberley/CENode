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

const CEAgent = require('./CEAgent.js');
const CEParser = require('./CEParser.js');
const QuestionParser = require('./QuestionParser.js');

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
  newInstanceId (){
    this.lastInstanceId++;
    return this.lastInstanceId;
  }
  newConceptId (){
    this.lastConceptId++;
    return this.lastConceptId;
  }
  newCardId (){
    this.lastCardId++;
    return this.agent.getName() + this.lastCardId;
  }

  /*
   * Get the concept with ID 'id'
   *
   * Returns: obj{concept}
   */
  getConceptById (id){
    return this._conceptDict[id];
  }

  /*
   * Get the concept with name 'name'
   *
   * Returns: obj{concept}
   */
  getConceptByName (name){
    if(name == null){return null;}
    for(let i = 0; i < this._concepts.length; i++){
      if(this._concepts[i].name.toLowerCase() == name.toLowerCase()){
        return this._concepts[i];
      }
      for(let j = 0; j < this._concepts[i].synonyms.length; j++){
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
  getInstanceById (id) {
    return this._instanceDict[id];
  }

  /*
   * Get the instance with name 'name'
   *
   * Returns: obj{instance}
   */
  getInstanceByName (name) {
    if(name==null){return null;}
    for(let i = 0; i < this._instances.length; i++) {
      if(this._instances[i].name.toLowerCase() == name.toLowerCase()){
        return this._instances[i];
      }
      for(let j = 0; j < this._instances[i].synonyms.length; j++){
        if(this._instances[i].synonyms[j].toLowerCase() == name.toLowerCase()){
          return this._instances[i];
        }
      }
    }
  }

  parseRule (instruction){
    if(instruction == null){return null;}
    const rule = {};
    let thenString = null;
    const relFacts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z]) then the (.*)/i);
    const valFacts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~ then the (.*)/i);
    if(relFacts){
      rule.if = {};
      rule.if.concept = relFacts[1];
      rule.if.relationship = {};
      rule.if.relationship.type = relFacts[4];
      rule.if.relationship.label = relFacts[3];
      thenString = relFacts[6];
    }
    else if(valFacts){
      rule.if = {};
      rule.if.concept = valFacts[1];
      rule.if.value = {};
      rule.if.value.type = valFacts[3];
      rule.if.value.label = valFacts[5];
      thenString = valFacts[6];
    }

    if(thenString){
      const thenRelFacts = thenString.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/i);
      const thenValFacts = thenString.match(/^([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~/i);
      if(thenRelFacts){
        rule.then = {};
        rule.then.concept = thenRelFacts[1];
        rule.then.relationship = {};
        rule.then.relationship.type = thenRelFacts[4];
        rule.then.relationship.label = thenRelFacts[3];
      }
      else if(thenValFacts){
        rule.then = {};
        rule.then.concept = thenValFacts[1];
        rule.then.value = {};
        rule.then.value.type = thenValFacts[3];
        rule.then.value.label = thenValFacts[5];
      }
    }
    return rule;
  }

  enactRules (subjectInstance, propertyType, objectInstance, source){
    if(typeof objectInstance == 'string'){
      return;
    }
    const rules = this.getInstances('rule');
    for(let i = 0; i < this.rules.length; i++){
      const rule = this.parseRule(this.rules[i].instruction);
      if(rule == null){return;}
      if(rule.if.concept == subjectInstance.type.name){
        if((propertyType == 'relationship' && rule.if.relationship != null) || (propertyType == 'value' && rule.if.value != null)){
          const ancestorConcepts = objectInstance.type.ancestors;
          ancestorConcepts.push(objectInstance.type);
          for(let j = 0; j < ancestorConcepts.length; j++){
            if(ancestorConcepts[j].name.toLowerCase() == rule.if[propertyType].type.toLowerCase()){
              if(rule.then.relationship && rule.then.relationship.type == subjectInstance.type.name){
                objectInstance.addRelationship(rule.then.relationship.label, subjectInstance, false, source); 
              }
              else if(rule.then.value && rule.then.value.type == subjectInstance.type.name){
                objectInstance.addValue(rule.then.value.label, subjectInstance, false, source);
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
   *  The nowrite argument is optional. If set to 'true', the method will behave
   *  as normal, but will not actually modify the node's model.
   * 
   * Returns: [bool, str] (bool = success, str = error or parsed string)
   */
  parseCE (t, nowrite, source){
    t = t.replace(/\s+/g, ' ').replace(/\.+$/, '').trim(); // Whitespace -> single space

    if (t.match(/^conceptualise an?/i)){
      return this.ceParser.newConcept(t, nowrite, source);  
    }
    else if (t.match(/^conceptualise the/i)){
      return this.ceParser.modifyConcept(t, nowrite, source);
    }
    else if (t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i) || t.match(/^the ([a-zA-Z0-9 ]*)/i)){
      return this.ceParser.newInstance(t, nowrite, source); 
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
  parseQuestion (t){
    if(t.match(/^where (is|are)/i)){
      return this.questionParser.whereIs(t);   
    }
    else if(t.match(/^(\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)/i)){
      return this.questionParser.whatIsIn(t);
    }
    else if(t.match(/^(\bwho\b|\bwhat\b) (?:is|are)/i)){
      return this.questionParser.whatIs(t);
    }
    else if(t.match(/^(\bwho\b|\bwhat\b) does/i)){
      return this.questionParser.whatDoes(t);
    }
    else if(t.match(/^(\bwho\b|\bwhat\b)/i)){
      return this.questionParser.whatRelationship(t);   
    }
    else if(t.match(/^list (\ball\b|\binstances\b)/i)){
      return this.questionParser.listInstances(t);  
    }
    return [false, null];
  }

  /*
   * Submit natural language to be processed by node. 
   * This results in 
   *  - string representing what the node THINKS the input is trying to say.
   *    (this could be returned as a confirm card
   * This method does not update the conceptual model.
   *
   * Returns: str 
   */
  parseNL (t){
    t = t.replace(/'/g, '').replace(/\./g, '');
    const tokens = t.split(" ");
    const andFacts = t.split(/\band\b/);

    // Try to find any mentions of known instances and tie them together using
    // values and relationships.
    
    const commonWords = ["there", "what", "who", "where", "theres", "is", "as", "and", "has", "that", "the", "a", "an", "named", "called", "name", "with", "conceptualise", "on", "at", "in"];
    let focusInstance=null;
    let smallestIndex = 999999;
    for(let i = 0; i < this._instances.length; i++){
      const possibleNames = this._instances[i].synonyms.concat(this._instances[i].name);
      for(let j = 0; j < possibleNames.length; j++){
        if(t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) > -1){
          if(t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) < smallestIndex){
            focusInstance = this._instances[i];
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
            const valueInstances = this.getInstances(valueConcept.name, true);
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
            const relInstances = this.getInstances(relConcept.name, true);
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

    for(let i = 0; i < this._concepts.length; i++){
      if(t.toLowerCase().indexOf(this._concepts[i].name.toLowerCase()) > -1){
        const conceptWords = this._concepts[i].name.toLowerCase().split(" ");
        commonWords.push(this._concepts[i].name.toLowerCase());
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
          return [true, "there is a "+this._concepts[i].name+" named '"+this.newInstanceName.trim()+"'"];
        }
        return [true, "there is a "+this._concepts[i].name+" named '"+this._concepts[i].name+" "+this._instances.length+1+"'"];
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
  guessNext (t){
    const s = t.trim().toLowerCase();
    const tokens = t.split(" ");
    const lastWord = tokens[tokens.length-1];
    const lastConcept = this._concepts[this._concepts.length-1];
    let numberOfTildes = 0;
    let indexOfFirstTilde = 0;
    for(let i = 0; i < tokens.length; i++){if(tokens[i] == "~"){numberOfTildes++;if(numberOfTildes==1){indexOfFirstTilde=i;}}}
    const possibleWords = [];
    if(t == ""){return t;}
    if(numberOfTildes == 1){
      try{
        return t+" ~ "+tokens[indexOfFirstTilde+1].charAt(0).toUpperCase()+" ";
      } catch(err){
        console.log(err);
      }
    }
    if(s.match(/^conceptualise a ~ (.*) ~ [A-Z] /)){
      return t+" that ";
    }   

    if(tokens.length < 2){
      possibleWords.push("conceptualise a ~ ");
      possibleWords.push("there is a ");
      possibleWords.push("where is ");
      possibleWords.push("what is ");
      possibleWords.push("who is ");
    }
    if(tokens.length > 2){
      possibleWords.push("named '");
      possibleWords.push("that ");
      possibleWords.push("is a ");
      possibleWords.push("and is ");
      possibleWords.push("and has the ");
      possibleWords.push("the ");
    } 

    const mentionedInstances = [];

    if(s.indexOf("there is") == -1 || tokens.length == 1){
      for(let i = 0; i < this._instances.length; i++){
        possibleWords.push(this._instances[i].name);
        if(s.indexOf(this._instances[i].name.toLowerCase()) > -1){
          mentionedInstances.push(this._instances[i]);
        }
      }
    }
    for(let i = 0; i < this._concepts.length; i++){
      possibleWords.push(this._concepts[i].name);
      let conceptMentioned = false;
      for(let j = 0; j < mentionedInstances.length; j++){
        if(mentionedInstances[j].conceptId == this._concepts[i].id){conceptMentioned = true;break;}
      }
      if(s.indexOf(this._concepts[i].name.toLowerCase()) > -1 || conceptMentioned){
        for(let j = 0; j < this._concepts[i].values.length; j++){possibleWords.push(this._concepts[i].values[j].label);}
        for(let j = 0; j < this._concepts[i].relationships.length; j++){possibleWords.push(this._concepts[i].relationships[j].label);}
      }
    }
    for(let i = 0; i < possibleWords.length; i++){
      if(possibleWords[i].toLowerCase().indexOf(tokens[tokens.length-1].toLowerCase()) == 0){
        tokens[tokens.length-1] = possibleWords[i];
        return tokens.join(" ");
      }
    }
    return t;
  }

  /*
   * Get the current set of instances maintained by the node.
   *
   * If conceptType and recurse NULL:
   *  - Return ALL instances
   *
   * If conceptType not NULL and recurse NULL|FALSE:
   *  - Return all instances with concept type name 'conceptType'
   *
   * If recurse TRUE:
   *  - Return all instances of concepts that are children, grandchildren, etc.
   *    of concept with name 'conceptType'
   *
   * Returns: [obj{instance}]
   */
  getInstances (conceptType, recurse){
    let instanceList = [];
    if(conceptType == null){
      instanceList = this._instances;
    }
    else if(conceptType != null && (recurse == null || recurse == false)){
      const concept = this.getConceptByName(conceptType);
      if(concept){
        for(let i = 0; i < this._instances.length; i++){
          if(this._instances[i].type.id == concept.id){
            instanceList.push(this._instances[i]);
          }
        }
      }
    }
    else if(conceptType != null && recurse == true){
      const concept = this.getConceptByName(conceptType);
      if(concept){
        const descendants = concept.descendants.concat(concept);
        const childrenIds = [];
        for(let i = 0; i < descendants.length; i++){childrenIds.push(descendants[i].id);}
        for(let i = 0; i < this._instances.length; i++){
          if(childrenIds.indexOf(this._instances[i].type.id) > -1){
            instanceList.push(this._instances[i]);
          }
        }
      }
    }
    return instanceList;
  }

  get instances (){
    return this._instances;
  }

  /*
   * Get all concepts known by the node
   *
   * Returns: [obj{concept}]
   */
  getConcepts (){
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
  addSentence (sentence, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", this.newCardId());
    const returnData = {};
    const ceSuccess = this.parseCE(sentence, false, source);
    if(ceSuccess[0] == false){
      const questionSuccess = this.parseQuestion(sentence);
      if(questionSuccess[0] == false){
        const nlSuccess = this.parseNL(sentence);
        if(nlSuccess[0] == false){
          returnData.type = "gist";
        }
        else{
          returnData.type = "confirm";
        }
        returnData.data = nlSuccess[1];
      }
      else{
        returnData.type = "gist";
        returnData.data = questionSuccess[1];
      }
    }
    else{
      returnData.type = "tell";
      returnData.data = ceSuccess[1];
      returnData.result = ceSuccess[2];
    }
    return returnData;
  }

  /*
   * Attempt to parse CE and add data to the node.
   * Indicates whether CE was successfully parsed.
   * Output data string is the input text.
   *
   * nowrite is an optional argument that asks parseCE() not
   * to actually update the model.
   *
   * Returns: {success: bool, type: str, data: str}
   */
  addCE (sentence, nowrite, source){
    sentence = sentence.trim();
    sentence = sentence.replace("{now}", new Date().getTime());
    sentence = sentence.replace("{uid}", this.newCardId());
    const returnData = {};
    const success = this.parseCE(sentence, nowrite, source);
    returnData.success = success[0];
    returnData.type = "gist";
    returnData.data = success[1];
    if(success[2]){returnData.result = success[2];}
    return returnData;
  }

  /*
   * Attempt to query the node.
   * Indicates success of whether a valid question was parsed
   * Output data string is the response, if any.
   *
   * Returns: {success: bool, type: str, data: str}
   * (Note that type and data will be null unless success = true)
   */
  askQuestion (sentence){
    const returnData = {};
    const success = this.parseQuestion(sentence);
    returnData.success = success[0];
    if(success[0] == true){
      returnData.type = "gist";
      returnData.data = success[1];
    }
    return returnData;
  }

  /*
   * Attempt to parse NL.
   * Method does not update the conceptual model.
   * Method returns a response representing a CE 'guess' of the input sentence
   *
   * Returns: {type: str, data: str}
   */
  addNL (sentence){
    const returnData = {};
    const success = this.parseNL(sentence);
    if(success[0] == true){
      returnData.type = "confirm";
    }
    else{
      returnData.type = "gist";
    }
    returnData.data = success[1];
    return returnData;
  }

  /*
   * Add an array of sentences to the node. Uses addSentence()
   * to process these so refer to that method for information.
   *
   * Returns an array of responses generated by addSentence()
   *
   * Returns: [[bool, str]...]
   */
  addSentences (sentences, source){
    const responses = [];
    for(let i = 0; i < sentences.length; i++){
      if(sentences[i] && sentences[i].length > 0){
        responses.push(this.addSentence(sentences[i], source));
      }
    }
    return responses;
  }

  /*
   * Add an array of CE sentences to the node.
   *
   * Returns an array of responses generated by addCE()
   *
   * Returns: [[bool, str]...]
   */
  loadModel (sentences){
    const responses = [];
    for(let i = 0; i < sentences.length; i++){
      responses.push(this.addCE(sentences[i]));
    }
    return responses;
  }

  /*
   * Reset store to 'factory settings' by removing all known instances
   * and concepts.
   *
   * Returns: void
   */
  resetAll (){
    this._instances = [];
    this._concepts = [];
  }

  /* 
   * Initialise node by adding any passed models as
   * sentence sets to be processed.
   */
  constructor (){
    this.agent = new CEAgent(this);
    this.ceParser = new CEParser(this);
    this.questionParser = new QuestionParser(this);
    this._concepts = [];
    this._instances = [];
    this._conceptDict = {};
    this._instanceDict = {};
    this.rules = [];
    this.conceptIds = {};
    this.lastInstanceId = this._instances.length;
    this.lastConceptId = this._concepts.length;
    this.lastCardId = 0;
    for(let i = 0; i < arguments.length; i++){
      this.loadModel(arguments[i]);
    }
  }
}
module.exports = CENode;
