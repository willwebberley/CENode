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

class CEConcept {

  constructor(node, name, source) {
    if (!name) {
      return;
    }
    for (const concept of node.concepts) {
      if (concept.name.toLowerCase() === name.toLowerCase()) {
        return;
      }
    }
    this.name = name;
    this.source = source;
    this.id = node.newConceptId();
    this.node = node;
    this.parentIds = [];
    this.valueIds = [];
    this.relationshipIds = [];
    this.synonyms = [];
    node.concepts.push(this);
    this.node.conceptDict[this.id] = this;

    if (isNaN(name[0])) {
      const concept = this;
      Object.defineProperty(node.concepts, name.toLowerCase().replace(/ /g, '_'), {
        get() {
          return concept;
        },
        configurable: true,
      });
    }
  }

  get instances() {
    const array = [];
    for (const instance of this.node.instances) {
      if (instance.concept.id === this.id) {
        array.push(instance);
      }
    }
    return array;
  }

  get allInstances() {
    const allConcepts = this.descendants.concat(this);
    const array = [];
    for (const instance of this.node.instances) {
      for (const concept of allConcepts) {
        if (instance.concept.id === concept.id) {
          array.push(instance);
        }
      }
    }
    return array;
  }

  get parents() {
    const array = [];
    for (const id of this.parentIds) {
      array.push(this.node.getConceptById(id));
    }
    return array;
  }

  get ancestors() {
    const array = [];
    const stack = [];
    for (const parent of this.parents) {
      stack.push(parent);
    }
    while (stack.length > 0) {
      const current = stack.pop();
      array.push(current);
      for (const parent of current.parents) {
        stack.push(parent);
      }
    }
    return array;
  }

  get children() {
    const array = [];
    for (const concept of this.node.concepts) {
      for (const parent of concept.parents) {
        if (parent.id === this.id) {
          array.push(concept);
        }
      }
    }
    return array;
  }

  get descendants() {
    const array = [];
    const stack = [];
    for (const child of this.children) {
      stack.push(child);
    }
    while (stack.length > 0) {
      const current = stack.pop();
      array.push(current);
      const currentChildren = current.children;
      if (currentChildren) {
        for (const child of currentChildren) {
          stack.push(child);
        }
      }
    }
    return array;
  }

  get relationships() {
    const rels = [];
    for (const id of this.relationshipIds) {
      const relationship = {};
      relationship.label = id.label;
      relationship.concept = this.node.getConceptById(id.target);
      rels.push(relationship);
    }
    return rels;
  }

  get values() {
    const vals = [];
    for (const val of this.valueIds) {
      const value = {};
      value.label = val.label;
      value.concept = val.type && this.node.getConceptById(val.type);
      vals.push(value);
    }
    return vals;
  }

  getCE(isModification) {
    let ce = '';
    if (isModification) {
      ce += `conceptualise the ${this.name} ${this.name.charAt(0).toUpperCase()}`;
    } else {
      ce += `conceptualise a ~ ${this.name} ~ ${this.name.charAt(0).toUpperCase()}`;
    }
    if (!isModification && (this.parentIds.length > 0 || this.valueIds.length > 0 || this.relationshipIds.length > 0)) {
      ce += ' that';
    }
    if (this.parentIds.length > 0) {
      for (let i = 0; i < this.parents.length; i += 1) {
        ce += ` is a ${this.parents[i].name}`;
        if (i < this.parents.length - 1) { ce += ' and'; }
      }
    }
    const facts = [];
    const alph = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    for (let i = 0; i < this.valueIds.length; i += 1) {
      if (this.valueIds[i].type === 0) {
        facts.push(`has the value ${alph[i]} as ~ ${this.valueIds[i].label} ~`);
      } else {
        const valType = this.node.getConceptById(this.valueIds[i].type);
        facts.push(`has the ${valType.name} ${valType.name.charAt(0).toUpperCase()} as ~ ${this.valueIds[i].label} ~`);
      }
    }
    for (let i = 0; i < this.relationshipIds.length; i += 1) {
      const relType = this.node.getConceptById(this.relationshipIds[i].target);
      facts.push(`~ ${this.relationshipIds[i].label} ~ the ${relType.name} ${alph[i]}`);
    }
    if (facts.length > 0) {
      if (this.parentIds.length > 0) { ce += ' and'; }
      ce += ` ${facts.join(' and ')}`;
    }
    ce += '.';
    return ce;
  }

  get creationCE() {
    return `conceptualise a ~ ${this.name} ~ ${this.name.charAt(0).toUpperCase()}`;
  }

  get ce() {
    return this.getCE();
  }

  get gist() {
    let gist = '';
    if (this.parentIds.length > 0) { gist += `A ${this.name}`; }
    for (const parentIndex in this.parents) {
      gist += ` is a type of ${this.parents[parentIndex].name}`;
      if (parentIndex < this.parents.length - 1) { gist += ' and'; }
    }
    if (this.parentIds.length > 0) { gist += '.'; }
    const facts = [];
    for (let i = 0; i < this.valueIds.length; i += 1) {
      if (this.valueIds[i].type === 0) {
        facts.push(`has a value called ${this.valueIds[i].label}`);
      } else {
        const valType = this.node.getConceptById(this.valueIds[i].type);
        facts.push(`has a type of ${valType.name} called ${this.valueIds[i].label}`);
      }
    }
    for (let i = 0; i < this.relationshipIds.length; i += 1) {
      const relType = this.node.getConceptById(this.relationshipIds[i].target);
      facts.push(`${this.relationshipIds[i].label} a type of ${relType.name}`);
    }
    if (facts.length > 0) {
      gist += ` An instance of ${this.name} ${facts.join(' and ')}.`;
    } else if (facts.length === 0 && this.parents.length === 0) {
      gist += `A ${this.name} has no attributes or relationships.`;
    }
    return gist;
  }

  addValue(label, type, source) {
    const value = {};
    value.source = source;
    value.label = label;
    value.type = typeof type === 'number' ? type : type.id;
    this.valueIds.push(value);
    if (isNaN(label[0])) {
      Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
        get() {
          return type === 0 ? 'value' : type;
        },
        configurable: true,
      });
    }
  }

  addRelationship(label, target, source) {
    const relationship = {};
    relationship.source = source;
    relationship.label = label;
    relationship.target = target.id;
    this.relationshipIds.push(relationship);
    if (isNaN(label[0])) {
      Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
        get() {
          return target;
        },
        configurable: true,
      });
    }
  }

  addParent(parentConcept) {
    if (this.parentIds.indexOf(parentConcept.id) === -1) {
      this.parentIds.push(parentConcept.id);
    }
  }

  addSynonym(synonym) {
    for (const currentSynonym of this.synonyms) {
      if (currentSynonym.toLowerCase() === synonym.toLowerCase()) {
        return;
      }
    }
    this.synonyms.push(synonym);
  }
}
module.exports = CEConcept;
