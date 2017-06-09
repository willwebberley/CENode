/*
 * Copyright 2017 W.M. Webberley & A.D. Preece (Cardiff University)
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

const CEConcept = require('./CEConcept.js');
const CEInstance = require('./CEInstance.js');
const en = require('../langs/en.js');

const quotes = {
  escape(string) {
    return string.replace(/'/g, "\\'");
  },
  unescape(string) {
    return string.replace(/\\'/g, "'").replace(/^'/, '').replace(/'$/, '');
  },
};

const newConcept = new RegExp(en.concept.create, 'i');
const editConcept = new RegExp(en.concept.edit);
const newInstance = new RegExp(en.instance.create);
const editInstance = new RegExp(en.instance.edit);

const andRegex = new RegExp('\\b' + en.and + '\\b', 'gi');
const and = en.and;
const value = en.value;

class CEParser {

  /*
   * Submit CE to be processed by node.
   * This may result in
   *  - new concepts or instances being created
   *  - modifications to existing concepts or instances
   *  - no action (i.e. invalid)
   *
   *  Source is an optional identifier to tag stored information with an input source.
   *
   * Returns: [bool, str] (bool = success, str = error or parsed string)
   */
  parse(input, source) {
    const t = input.replace(/\s+/g, ' ').replace(/\.+$/, '').trim(); // Whitespace -> single space
    
    if (newConcept.test(t)){
      return this.newConcept(t, source);
    } else if (editConcept.test(t)) {
      return this.modifyConcept(t, source);
    } else if (newInstance.test(t)) {
      return this.newInstance(t, source);
    } else if (editInstance.test(t)) {
      return this.modifyInstance(t, source);
    }
    return [false, null];
  }

  newConcept(t, source) {
    const match = newConcept.exec(t);
    const conceptName = match[1];
    const storedConcept = this.node.getConceptByName(conceptName);
    let concept = null;
    if (storedConcept) {
      return [false, 'This concept already exists.'];
    }
    concept = new CEConcept(this.node, conceptName, source);

    const remainder = t.replace(newConcept, '');
    const facts = remainder.replace(andRegex, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    if (facts){
      for (const fact of facts) {
        this.processConceptFact(concept, fact, source);
      }
    }
    return [true, t, concept];
  }

  modifyConcept(t, source) {
    const conceptInfo = editConcept.exec(t);
    if (!conceptInfo) {
      return [false, 'Unable to parse sentence'];
    }
    const conceptName = conceptInfo[1];
    const conceptVar = conceptInfo[2];
    const concept = this.node.getConceptByName(conceptName);
    if (!concept) {
      return [false, `Concept ${conceptInfo[1]} not known.`];
    }

    const remainderRegex = new RegExp(`^conceptualise the ${conceptName} ${conceptVar}`, 'i');
    const remainder = t.replace(remainderRegex, '');
    const facts = remainder.replace(andRegex, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processConceptFact(concept, fact, source);
    }
    return [true, t, concept];
  }

  processConceptFact(concept, fact, source) {
    const parseVal = new RegExp(en.concept.parseValue);
    const parsePar = new RegExp(en.concept.parseParent);
    const parseRel = new RegExp(en.concept.parseRel);
    const parseSyn = new RegExp(en.concept.parseSyn);

    const input = fact.trim().replace(/\+/g, and);
    if (parseVal.test(input)){
      const match = parseVal.exec(input);
      const valConceptName = match[1];
      const label = match[3];
      const valConcept = valConceptName === value ? 0 : this.node.getConceptByName(valConceptName);
      concept.addValue(label, valConcept, source);
    }
    if (parsePar.test(input)){
      const match = parsePar.exec(input);
      const parentConceptName = match[1];
      const parentConcept = this.node.getConceptByName(parentConceptName);
      if (parentConcept) {
        concept.addParent(parentConcept);
      }
    }
    if (parseRel.test(input)){
      const match = parseRel.exec(input);
      const label = match[1];
      const relConceptName = match[2];
      const relConcept = this.node.getConceptByName(relConceptName);
      if (relConcept) {
        concept.addRelationship(label, relConcept, source);
      }
    }
    if (parseSyn.test(input)){
      const match = parseSyn.exec(input);
      const synonym = match[1];
      concept.addSynonym(synonym);
    }
  }

  newInstance(t, source) {
    const names = newInstance.exec(t)
    const conceptName = names[1];
    const instanceName = names[2].replace(/\\/g, '').replace(/'/g, '');
    const concept = this.node.getConceptByName(conceptName);
    const currentInstance = this.node.getInstanceByName(instanceName, concept);
    if (!concept) {
      return [false, `Instance type unknown: ${conceptName}`];
    }
    if (currentInstance && currentInstance.type.id === concept.id) {
      return [false, 'There is already an instance of this type with this name.', currentInstance];
    }
    const instance = new CEInstance(this.node, concept, instanceName, source);
    instance.sentences.push(t);

    const remainder = t.replace(newInstance, '');
    const facts = remainder.replace(andRegex, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    if (facts){
      for (const fact of facts) {
        this.processInstanceFact(instance, fact, source);
      }
    }
    return [true, t, instance];
  }

  modifyInstance(t, source) {
    let concept;
    let instance;
    const names = editInstance.exec(t);

    concept = this.node.getConceptByName(names[1]);
    if (concept){
      instance = this.node.getInstanceByName(names[2].replace(/\\/g, '').replace(/'/g, ''));
    }
    else {
      const nameTokens = names[1].split(' ');
      let currentName = '';
      for (const index in nameTokens){
        currentName += ' ' + nameTokens[index];
        concept = this.node.getConceptByName(currentName.trim());
        if (concept){
          break;
        }
      }
      if (concept){
        const possibleInstances = this.node.getInstances(concept.name, true);
        let lowestIndex = null;
        for (const potential of possibleInstances){
          const check = new RegExp('\\b(' + potential.name + (potential.synonyms.length ? '|' + potential.synonyms.join('|') : '') + ')\\b', 'i');
          const match = check.exec(t);
          if (match && (lowestIndex === null || match.index < lowestIndex)){
            lowestIndex = match.index;
            instance = potential;
          }
        }
      }
    }

    if (!concept || !instance) {
      return [false, `Unknown concept/instance combination in: ${t}`];
    }
    instance.sentences.push(t);
    const tokens = t.split(' ');
    tokens.splice(0, 1 + concept.name.split(' ').length + instance.name.split(' ').length);
    const remainder = tokens.join(' ');
    const facts = remainder.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    if (facts) {
      for (const fact of facts) {
        this.processInstanceFact(instance, fact, source);
      }
    }
    return [true, t, instance];
  }

  processInstanceFact(instance, fact, source) {
    const input = fact.trim().replace(/\+/g, 'and');
    if (input.match(/^(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_' ]*)/)) {
      const re = /^(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_' ]*)/;
      const match = re.exec(input);
      const label = match[1];
      const relConceptName = match[2];
      const relInstanceName = match[3].replace(/'/g, '');
      const relConcept = this.node.getConceptByName(relConceptName);

      if (relConcept) {
        let relInstance = this.node.getInstanceByName(relInstanceName, relConcept);
        if (!relInstance) {
          relInstance = new CEInstance(this.node, relConcept, relInstanceName, source);
        }
        instance.addRelationship(label, relInstance, true, source);
      }
    }
    if (input.match(/^has ([a-zA-Z0-9]*|'[^'\\]*(?:\\.[^'\\]*)*') as ([a-zA-Z0-9 ]*)/)) {
      const re = /^has ([a-zA-Z0-9]*|'[^'\\]*(?:\\.[^'\\]*)*') as ([a-zA-Z0-9 ]*)/;
      const match = re.exec(input);
      const value = quotes.unescape(match[1]);
      const label = match[2];
      instance.addValue(label, value, true, source);
    }
    if (input.match(/^has the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_]*|'[a-zA-Z0-9_ ]*') as ([a-zA-Z0-9 ]*)/)) {
      const re = /^has the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9]*|'[a-zA-Z0-9 ]*') as ([a-zA-Z0-9 ]*)/;
      const match = re.exec(input);
      const valConceptName = match[1];
      const valInstanceName = match[2].replace(/'/g, '');
      const label = match[3];
      const valConcept = this.node.getConceptByName(valConceptName);
      if (valConcept) {
        let valInstance = this.node.getInstanceByName(valInstanceName, valConcept);
        if (!valInstance) {
          valInstance = new CEInstance(this.node, valConcept, valInstanceName, source);
        }
        instance.addValue(label, valInstance, true, source);
      }
    }
    if (input.match(/(?:is| )?an? ([a-zA-Z0-9 ]*)/g)) {
      const re = /(?:is| )?an? ([a-zA-Z0-9 ]*)/g;
      const match = re.exec(input);
      instance.addSubConcept(this.node.getConceptByName(match && match[1] && match[1].trim()));
    }
    if (input.match(/is expressed by ('[a-zA-Z0-9 ]*'|[a-zA-Z0-9]*)/)) {
      const match = input.match(/is expressed by ('[a-zA-Z0-9 ]*'|[a-zA-Z0-9]*)/);
      const synonym = match && match[1] && match[1].replace(/'/g, '').trim();
      instance.addSynonym(synonym);
    }
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = CEParser;
