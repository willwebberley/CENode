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
    if (!type) {
      return;
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

    const instance = this;
    Object.defineProperty(node.instances, name.toLowerCase().replace(/ /g, '_').replace(/'/g, ''), {
      get() {
        return instance;
      },
      configurable: true,
    });

    Object.defineProperty(type, name.toLowerCase(), {
      get() {
        return instance;
      },
      configurable: true,
    });
  }

  get type() {
    for (let i = 0; i < this.node.concepts.length; i += 1) {
      if (this.node.concepts[i].id === this.concept.id) {
        return this.node.concepts[i];
      }
    }
    return null;
  }

  get relationships() {
    const rels = [];
    for (let i = 0; i < this.relationshipIds.length; i += 1) {
      const relationship = {};
      relationship.label = this.relationshipIds[i].label;
      relationship.source = this.relationshipIds[i].source;
      relationship.instance = this.node.getInstanceById(this.relationshipIds[i].targetId);
      rels.push(relationship);
    }
    return rels;
  }

  get values() {
    const vals = [];
    for (let i = 0; i < this.valueIds.length; i += 1) {
      const value = {};
      value.label = this.valueIds[i].label;
      value.source = this.valueIds[i].source;
      if (this.valueIds[i].conceptId === 0) {
        value.instance = this.valueIds[i].typeName;
      } else {
        value.instance = this.node.getInstanceById(this.valueIds[i].conceptId);
      }
      vals.push(value);
    }
    return vals;
  }

  addSentence(sentence) {
    this.sentences.push(sentence);
  }

  getPossibleProperties() {
    const ancestorInstances = this.concept.ancestors;
    ancestorInstances.push(this.concept);
    const properties = { values: [], relationships: [] };
    for (let i = 0; i < ancestorInstances.length; i += 1) {
      for (let j = 0; j < ancestorInstances[i].values.length; j += 1) {
        properties.values.push(ancestorInstances[i].values[j].label.toLowerCase());
      }
      for (let j = 0; j < ancestorInstances[i].relationships.length; j += 1) {
        properties.relationships.push(ancestorInstances[i].relationships[j].label.toLowerCase());
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

      if (this.reservedFields.indexOf(valueNameField) === -1) {
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
              for (let i = 0; i < this.valueIds.length; i += 1) {
                if (this.valueIds[i].label.toLowerCase().replace(/ /g, '_') === valueNameField) {
                  instances.push(this.valueIds[i].conceptId === 0 ? this.valueIds[i].typeName : this.node.getInstanceById(this.valueIds[i].conceptId));
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

      if (this.reservedFields.indexOf(relNameField) === -1) {
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
              for (let i = 0; i < this.relationshipIds.length; i += 1) {
                if (this.relationshipIds[i].label.toLowerCase().replace(/ /g, '_') === relNameField) {
                  instances.push(this.node.getInstanceById(this.relationshipIds[i].targetId));
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
    for (let i = 0; i < this.synonyms.length; i += 1) {
      if (this.synonyms[i].toLowerCase() === synonym.toLowerCase()) {
        return null;
      }
    }
    this.synonyms.push(synonym);
    Object.defineProperty(this, synonym.toLowerCase().replace(/ /g, '_'), {
      get() {
        return this;
      },
    });
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
      ce += `there is a ${concept.name} named '${this.name}' that`;
    }
    const facts = [];
    for (const subConcept of this.subConcepts) {
      facts.push(`is a ${subConcept.name}`);
    }
    for (let i = 0; i < this.valueIds.length; i += 1) {
      const value = this.valueIds[i];
      if (value.conceptId === 0) {
        facts.push(`has '${value.typeName.replace(/'/g, "\\'")}' as ${value.label}`);
      } else {
        const valueInstance = this.node.getInstanceById(value.conceptId);
        const valueConcept = valueInstance.type;
        facts.push(`has the ${valueConcept.name} '${valueInstance.name}' as ${value.label}`);
      }
    }
    for (let i = 0; i < this.relationshipIds.length; i += 1) {
      const relationship = this.relationshipIds[i];
      const relationshipInstance = this.node.getInstanceById(relationship.targetId);
      const relationshipConcept = relationshipInstance.type;
      facts.push(`${relationship.label} the ${relationshipConcept.name} '${relationshipInstance.name}'`);
    }
    if (facts.length > 0) { ce += ` ${facts.join(' and ')}`; }
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
    if (vowels.indexOf(concept.name.toLowerCase()[0]) > -1) { gist += ` an ${concept.name}.`; } else { gist += ` a ${concept.name}`; }
    for (let i = 0; i < this.subConcepts.length; i += 1) {
      gist += ` and a ${this.subConcepts[i].name}`;
    }
    gist += '.';

    const facts = {};
    let factFound = false;
    for (let i = 0; i < this.valueIds.length; i += 1) {
      factFound = true;
      const value = this.valueIds[i];
      let fact = '';
      if (value.conceptId === 0) {
        fact = `has '${value.typeName.replace(/'/g, "\\'")}' as ${value.label}`;
      } else {
        const valueInstance = this.node.getInstanceById(value.conceptId);
        const valueConcept = valueInstance.type;
        fact = `has the ${valueConcept.name} '${valueInstance.name}' as ${value.label}`;
      }
      if (!(fact in facts)) {
        facts[fact] = 0;
      }
      facts[fact] += 1;
    }
    for (let i = 0; i < this.relationshipIds.length; i += 1) {
      factFound = true;
      const relationship = this.relationshipIds[i];
      const relationshipInstance = this.node.getInstanceById(relationship.targetId);
      const relationshipConcept = relationshipInstance.type;
      const fact = `${relationship.label} the ${relationshipConcept.name} '${relationshipInstance.name}'`;
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
