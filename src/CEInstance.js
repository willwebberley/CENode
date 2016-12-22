class CEInstance {

  constructor(node, type, name, source) {
    this.name = name;
    this.source = source;
    this.id = node.newInstanceId();
    this.concept = type;
    this.node = node;
    this.typeId = type.id;
    this.sentences = [];
    this.values = [];
    this.relationships = [];
    this.synonyms = [];
    this.reservedFields = ['values', 'relationships', 'synonyms', 'addValue', 'addRelationship', 'name', 'concept', 'id', 'instance', 'sentences', 'ce', 'gist'];

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
    for (let i = 0; i < this.relationships.length; i += 1) {
      const relationship = {};
      relationship.label = this.relationships[i].label;
      relationship.source = this.relationships[i].source;
      relationship.instance = this.node.getInstanceById(this.relationships[i].targetId);
      rels.push(relationship);
    }
    return rels;
  }

  get values() {
    const vals = [];
    for (let i = 0; i < this.values.length; i += 1) {
      const value = {};
      value.label = this.values[i].label;
      value.source = this.values[i].source;
      if (this.values[i].typeId === 0) {
        value.instance = this.values[i].typeName;
      } else {
        value.instance = this.node.getInstanceById(this.values[i].typeId);
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
    if (this.getPossibleProperties().values.indexOf(label.toLowerCase()) > -1) {
      const value = {};
      value.source = source;
      value.label = label;
      value.typeId = typeof valueInstance === 'object' ? valueInstance.id : 0;
      value.typeName = typeof valueInstance === 'object' ? valueInstance.name : valueInstance;
      this.values.push(value);
      const valueNameField = label.toLowerCase().replace(/ /g, '_');

      if (this.reservedFields.indexOf(valueNameField) === -1) {
        Object.defineProperty(this, valueNameField, {
          get() {
            return value.typeId === 0 ? value.typeName : this.node.getInstanceById(value.typeId);
          },
          configurable: true,
        });

        if (this.reservedFields.indexOf(`${valueNameField}s`) === -1 && !Object.prototype.hasOwnProperty.call(this, `${valueNameField}s`)) {
          Object.defineProperty(this, `${valueNameField}s`, {
            get() {
              const instances = [];
              for (let i = 0; i < this.values.length; i += 1) {
                if (this.values[i].label.toLowerCase().replace(/ /g, '_') === valueNameField) {
                  instances.push(this.values[i].typeId === 0 ? this.values[i].typeName : this.node.getInstanceById(this.values[i].typeId));
                }
              }
              return instances;
            },
          });
        }
      }
      if (propagate === null || propagate !== false) {
        this.node.enactRules(this, 'value', valueInstance, source);
      }
    }
  }

  addRelationship(label, relationshipInstance, propagate, source) {
    if (this.getPossibleProperties().relationships.indexOf(label.toLowerCase()) > -1) {
      const relationship = {};
      relationship.label = label;
      relationship.source = source;
      relationship.targetId = relationshipInstance.id;
      relationship.targetName = relationshipInstance.name;
      this.relationships.push(relationship);
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
              for (let i = 0; i < this.relationships.length; i += 1) {
                if (this.relationships[i].label.toLowerCase().replace(/ /g, '_') === relNameField) {
                  instances.push(this.node.getInstanceById(this.relationships[i].targetId));
                }
              }
              return instances;
            },
          });
        }
      }
      if (propagate === null || propagate !== false) {
        this.node.enactRules(this, 'relationship', relationshipInstance, source);
      }
    }
  }

  addSynonym(synonym) {
    for (let i = 0; i < this.synonyms.length; i += 1) {
      if (this.synonyms[i].toLowerCase() === synonym.toLowerCase()) {
        return;
      }
    }
    this.synonyms.push(synonym);
    Object.defineProperty(this, synonym.toLowerCase().replace(/ /g, '_'), {
      get() {
        return this;
      },
    });
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

  get synonyms() {
    return this.synonyms;
  }

  get ce() {
    const concept = this.concept;
    if (concept === null) { return ''; }
    let ce = `there is a ${concept.name} named '${this.name}'`;
    const facts = [];
    for (let i = 0; i < this.values.length; i += 1) {
      const value = this.values[i];
      if (value.typeId === 0) {
        facts.push(`has '${value.typeName.replace(/'/g, "\\'")}' as ${value.label}`);
      } else {
        const valueInstance = this.node.getInstanceById(value.typeId);
        const valueConcept = valueInstance.type;
        facts.push(`has the ${valueConcept.name} '${valueInstance.name}' as ${value.label}`);
      }
    }
    for (let i = 0; i < this.relationships.length; i += 1) {
      const relationship = this.relationships[i];
      const relationshipInstance = this.node.getInstanceById(relationship.targetId);
      const relationshipConcept = relationshipInstance.type;
      facts.push(`${relationship.label} the ${relationshipConcept.name} '${relationshipInstance.name}'`);
    }
    if (facts.length > 0) { ce += ` that ${facts.join(' and ')}`; }
    return `${ce}.`;
  }

  get gist() {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const concept = this.concept;
    if (concept === null) { return ''; }
    let gist = `${this.name} is`;
    if (vowels.indexOf(concept.name.toLowerCase()[0]) > -1) { gist += ` an ${concept.name}.`; } else { gist += ` a ${concept.name}.`; }
    const facts = {};
    let factFound = false;
    for (let i = 0; i < this.values.length; i += 1) {
      factFound = true;
      const value = this.values[i];
      let fact = '';
      if (value.typeId === 0) {
        fact = `has '${value.typeName.replace(/'/g, "\\'")}' as ${value.label}`;
      } else {
        const valueInstance = this.node.getInstanceById(value.typeId);
        const valueConcept = valueInstance.type;
        fact = `has the ${valueConcept.name} '${valueInstance.name}' as ${value.label}`;
      }
      if (!(fact in facts)) {
        facts[fact] = 0;
      }
      facts[fact] += 1;
    }
    for (let i = 0; i < this.relationships.length; i += 1) {
      factFound = true;
      const relationship = this.relationships[i];
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
      for (const fact of facts) {
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
