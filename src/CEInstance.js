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

class CEInstance {

  constructor(node, type, name, source) {
    if (!type || !name) {
      return;
    }
    for (const instance of node.instances) {
      if (instance.name.toLowerCase() === name.toLowerCase() && type.id === instance.concept.id) {
        return;
      }
    }
    this.node = node;
    this.name = name;
    this.source = source;
    this.id = node.newInstanceId();
    this.concept = type;
    this.conceptId = type.id;
    this.subConcepts = [];
    this.sentences = [];
    this.valueIds = [];
    this.relationshipIds = [];
    this.synonyms = [];
    this.reservedFields = ['values', 'relationships', 'synonyms', 'addValue', 'addRelationship', 'name', 'concept', 'id', 'instance', 'sentences', 'ce', 'gist'];
    node.instances.push(this);
    this.node.instanceDict[this.id] = this;

    if (isNaN(name[0])) {
      const instance = this;
      const helperName = name.toLowerCase().replace(/ /g, '_').replace(/'/g, '');
      Object.defineProperty(node.instances, helperName, {
        get() {
          return instance;
        },
        configurable: true,
      });
      Object.defineProperty(type, helperName, {
        get() {
          return instance;
        },
        configurable: true,
      });
    }
  }

  get type() {
    for (const concept of this.node.concepts) {
      if (concept.id === this.concept.id) {
        return concept;
      }
    }
    return null;
  }

  get relationships() {
    const rels = [];
    for (const id of this.relationshipIds) {
      const relationship = {};
      relationship.label = id.label;
      relationship.source = id.source;
      relationship.instance = this.node.getInstanceById(id.targetId);
      rels.push(relationship);
    }
    return rels;
  }

  get values() {
    const vals = [];
    for (const id of this.valueIds) {
      const value = {};
      value.label = id.label;
      value.source = id.source;
      if (id.conceptId === 0) {
        value.instance = id.typeName;
      } else {
        value.instance = this.node.getInstanceById(id.conceptId);
      }
      vals.push(value);
    }
    return vals;
  }

  addSentence(sentence) {
    this.sentences.push(sentence);
  }

  getPossibleProperties() {
    let ancestorInstances = this.concept.ancestors;
    ancestorInstances.push(this.concept);
    for (const subConcept of this.subConcepts) {
      ancestorInstances.push(subConcept);
      ancestorInstances = ancestorInstances.concat(subConcept.ancestors);
    }
    const properties = { values: [], relationships: [] };
    for (const ancestor of ancestorInstances) {
      for (const value of ancestor.values) {
        properties.values.push(value.label.toLowerCase());
      }
      for (const relationship of ancestor.relationships) {
        properties.relationships.push(relationship.label.toLowerCase());
      }
    }
    return properties;
  }

  addValue(label, valueInstance, propagate, source) {
    if (!(label && label.length && valueInstance)) {
      return null;
    }
    if (this.getPossibleProperties().values.indexOf(label.toLowerCase()) > -1) {
      const value = {};
      value.source = source;
      value.label = label;
      value.conceptId = typeof valueInstance === 'object' ? valueInstance.id : 0;
      value.typeName = typeof valueInstance === 'object' ? valueInstance.name : valueInstance;
      this.valueIds.push(value);
      const valueNameField = label.toLowerCase().replace(/ /g, '_');

      if (this.reservedFields.indexOf(valueNameField) === -1 && isNaN(valueNameField[0])) {
        Object.defineProperty(this, valueNameField, {
          get() {
            return value.conceptId === 0 ? value.typeName : this.node.getInstanceById(value.conceptId);
          },
          configurable: true,
        });

        if (this.reservedFields.indexOf(`${valueNameField}s`) === -1 && !Object.prototype.hasOwnProperty.call(this, `${valueNameField}s`)) {
          Object.defineProperty(this, `${valueNameField}s`, {
            get() {
              const instances = [];
              for (const id of this.valueIds) {
                if (id.label.toLowerCase().replace(/ /g, '_') === valueNameField) {
                  instances.push(id.conceptId === 0 ? id.typeName : this.node.getInstanceById(id.conceptId));
                }
              }
              return instances;
            },
          });
        }
      }
      if (propagate !== false) {
        this.node.ruleEngine.enactRules(this, 'value', valueInstance, source);
      }
    }
    return null;
  }

  addRelationship(label, relationshipInstance, propagate, source) {
    if (this.getPossibleProperties().relationships.indexOf(label.toLowerCase()) > -1) {
      const relationship = {};
      relationship.label = label;
      relationship.source = source;
      relationship.targetId = relationshipInstance.id;
      relationship.targetName = relationshipInstance.name;
      this.relationshipIds.push(relationship);
      const relNameField = label.toLowerCase().replace(/ /g, '_');

      if (this.reservedFields.indexOf(relNameField) === -1 && isNaN(relNameField[0])) {
        Object.defineProperty(this, relNameField, {
          get() {
            return this.node.getInstanceById(relationship.targetId);
          },
          configurable: true,
        });

        if (this.reservedFields.indexOf(`${relNameField}s`) === -1 && !Object.prototype.hasOwnProperty.call(this, `${relNameField}s`)) {
          Object.defineProperty(this, `${relNameField}s`, {
            get() {
              const instances = [];
              for (const id of this.relationshipIds) {
                if (id.label.toLowerCase().replace(/ /g, '_') === relNameField) {
                  instances.push(this.node.getInstanceById(id.targetId));
                }
              }
              return instances;
            },
          });
        }
      }
      if (propagate !== false) {
        this.node.ruleEngine.enactRules(this, 'relationship', relationshipInstance, source);
      }
    }
    return null;
  }

  addSynonym(synonym) {
    if (!synonym || !synonym.length) {
      return null;
    }
    for (const checkSynonym of this.synonyms) {
      if (checkSynonym.toLowerCase() === synonym.toLowerCase()) {
        return null;
      }
    }
    this.synonyms.push(synonym);
    if (isNaN(synonym[0])) {
      Object.defineProperty(this, synonym.toLowerCase().replace(/ /g, '_'), {
        get() {
          return this;
        },
      });
    }
    return null;
  }

  addSubConcept(concept) {
    if (!concept) {
      return;
    }
    let add = true;
    for (const existingConcept of this.subConcepts) {
      if (existingConcept.id === concept.id || concept.id === this.concept.id) {
        add = false;
        break;
      }
    }
    if (add) {
      this.subConcepts.push(concept);
    }
  }

  property(propertyName, source) {
    return this.properties(propertyName, source, true);
  }

  properties(propertyName, source, onlyOne) {
    const properties = [];
    for (let i = this.values.length - 1; i >= 0; i -= 1) { // Reverse so we get the latest prop first
      if (this.values[i].label.toLowerCase() === propertyName.toLowerCase()) {
        const inst = this.values[i].instance;
        const dat = source ? { instance: inst, source: this.values[i].source } : inst;
        if (onlyOne) { return dat; }
        properties.push(dat);
      }
    }
    for (let i = this.relationships.length - 1; i >= 0; i -= 1) { // Reverse so we get the latest prop first
      if (this.relationships[i].label.toLowerCase() === propertyName.toLowerCase()) {
        const inst = this.relationships[i].instance;
        const dat = source ? { instance: inst, source: this.relationships[i].source } : inst;
        if (onlyOne) { return dat; }
        properties.push(dat);
      }
    }
    return onlyOne ? null : properties;
  }

  getCE(isModification) {
    const concept = this.concept;
    if (!concept) { return ''; }

    let ce = '';
    if (isModification) {
      ce += `the ${concept.name} '${this.name}'`;
    } else {
      ce += `there is a ${concept.name} named '${this.name}'`;
    }
    const facts = [];
    for (const subConcept of this.subConcepts) {
      facts.push(`is a ${subConcept.name}`);
    }
    for (const id of this.valueIds) {
      if (id.conceptId === 0) {
        facts.push(`has '${id.typeName.replace(/'/g, "\\'")}' as ${id.label}`);
      } else {
        const valueInstance = this.node.getInstanceById(id.conceptId);
        const valueConcept = valueInstance.type;
        facts.push(`has the ${valueConcept.name} '${valueInstance.name}' as ${id.label}`);
      }
    }
    for (const id of this.relationshipIds) {
      const relationshipInstance = this.node.getInstanceById(id.targetId);
      const relationshipConcept = relationshipInstance.type;
      facts.push(`${id.label} the ${relationshipConcept.name} '${relationshipInstance.name}'`);
    }
    if (facts.length > 0) { ce += `${!isModification && ' that'} ${facts.join(' and ')}`; }
    return `${ce}.`;
  }

  get creationCE() {
    return `there is a ${this.concept && this.concept.name} named '${this.name}'`;
  }

  get ce() {
    return this.getCE();
  }

  get gist() {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const concept = this.concept;
    if (!concept) { return ''; }
    let gist = `${this.name} is`;
    if (vowels.indexOf(concept.name.toLowerCase()[0]) > -1) { gist += ` an ${concept.name}`; } else { gist += ` a ${concept.name}`; }
    for (const subConcept of this.subConcepts) {
      gist += ` and ${vowels.indexOf(subConcept.name.toLowerCase()[0]) > -1 ? 'an' : 'a'} ${subConcept.name}`;
    }
    gist += '.';

    const facts = {};
    let factFound = false;
    for (const id of this.valueIds) {
      factFound = true;
      let fact = '';
      if (id.conceptId === 0) {
        fact = `has '${id.typeName.replace(/'/g, "\\'")}' as ${id.label}`;
      } else {
        const valueInstance = this.node.getInstanceById(id.conceptId);
        const valueConcept = valueInstance.type;
        fact = `has the ${valueConcept.name} '${valueInstance.name}' as ${id.label}`;
      }
      if (!(fact in facts)) {
        facts[fact] = 0;
      }
      facts[fact] += 1;
    }
    for (const id of this.relationshipIds) {
      factFound = true;
      const relationshipInstance = this.node.getInstanceById(id.targetId);
      const relationshipConcept = relationshipInstance.type;
      const fact = `${id.label} the ${relationshipConcept.name} '${relationshipInstance.name}'`;
      if (!(fact in facts)) {
        facts[fact] = 0;
      }
      facts[fact] += 1;
    }
    if (factFound) {
      gist += ` ${this.name}`;
      for (const fact in facts) {
        gist += ` ${fact}`;
        if (facts[fact] > 1) {
          gist += ` (${facts[fact]} times)`;
        }
        gist += ' and';
      }
      gist = `${gist.substring(0, gist.length - 4)}.`; // Remove last ' and' and add full stop
    }
    return gist;
  }
}
module.exports = CEInstance;
