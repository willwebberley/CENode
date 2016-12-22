class CEConcept {

  constructor(node, name, source) {
    this.name = name;
    this.source = source;
    this.id = node.newConceptId();
    this.node = node;
    this.parents = [];
    this.values = [];
    this.relationships = [];
    this.synonyms = [];

    const concept = this;
    Object.defineProperty(node.concepts, name.toLowerCase().replace(/ /g, '_'), {
      get() {
        return concept;
      },
      configurable: true,
    });
  }

  get instances() {
    const instances = [];
    for (let i = 0; i < this.node.instances.length; i += 1) {
      if (this.node.instances[i].type.id === this.id) {
        instances.push(this.node.instances[i]);
      }
    }
    return instances;
  }

  get allInstances() {
    const allConcepts = this.descendants.concat(this);
    const instances = [];
    for (let i = 0; i < this.node.instances.length; i += 1) {
      for (let j = 0; j < allConcepts.length; j += 1) {
        if (this.node.instances[i].type.id === allConcepts[j].id) {
          instances.push(this.node.instances[i]);
        }
      }
    }
    return instances;
  }

  get parents() {
    const p = [];
    for (let i = 0; i < this.parents.length; i += 1) {
      p.push(this.node.getConceptById(this.parents[i]));
    }
    return p;
  }

  get ancestors() {
    const parents = [];
    const stack = [];
    for (let i = 0; i < this.parents.length; i += 1) {
      stack.push(this.parents[i]);
    }
    while (stack.length > 0) {
      const current = stack.pop();
      parents.push(current);
      for (let i = 0; i < current.parents.length; i += 1) {
        stack.push(current.parents[i]);
      }
    }
    return parents;
  }

  get children() {
    const children = [];
    for (let i = 0; i < this.node.concepts.length; i += 1) {
      for (let j = 0; j < this.node.concepts[i].parents.length; j += 1) {
        if (this.node.concepts[i].parents[j].id === this.id) {
          children.push(this.node.concepts[i]);
        }
      }
    }
    return children;
  }

  get descendants() {
    const children = [];
    const stack = [];
    for (let i = 0; i < this.children.length; i += 1) {
      stack.push(this.children[i]);
    }
    while (stack.length > 0) {
      const current = stack.pop();
      children.push(current);
      const currentChildren = current.children;
      if (currentChildren != null) {
        for (let i = 0; i < currentChildren.length; i += 1) {
          stack.push(currentChildren[i]);
        }
      }
    }
    return children;
  }

  get relationships() {
    const rels = [];
    for (let i = 0; i < this.relationships.length; i += 1) {
      const relationship = {};
      relationship.label = this.relationships[i].label;
      relationship.concept = this.node.getConceptById(this.relationships[i].target);
      rels.push(relationship);
    }
    return rels;
  }

  get values() {
    const vals = [];
    for (let i = 0; i < this.values.length; i += 1) {
      const value = {};
      value.label = this.values[i].label;
      if (this.values[i].typeId === 0) {
        value.concept = this.values[i].typeName;
      } else {
        value.concept = this.node.getConceptById(this.values[i].type);
      }
      vals.push(value);
    }
    return vals;
  }

  get synonyms() {
    return this.synonyms;
  }

  get ce() {
    let ce = `conceptualise a ~ ${this.name} ~ ${this.name.charAt(0).toUpperCase()}`;
    if (this.parents.length > 0 || this.values.length > 0 || this.relationships.length > 0) {
      ce += ' that';
    }
    if (this.parents.length > 0) {
      for (let i = 0; i < this.parents.length; i += 1) {
        ce += ` is a ${this.parents[i].name}`;
        if (i < this.parents.length - 1) { ce += ' and'; }
      }
    }
    let facts = [];
    const alph = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    for (let i = 0; i < this.values.length; i += 1) {
      if (this.values[i].type === 0) {
        facts.push(`has the value ${alph[i]} as ${this.values[i].label}`);
      } else {
        const valType = this.node.getConceptById(this.values[i].type);
        facts.push(`has the ${valType.name} ${valType.name.charAt(0).toUpperCase()} as ${this.values[i].label}`);
      }
    }
    if (facts.length > 0) {
      if (this.parents.length > 0) { ce += ' and'; }
      ce += ` ${facts.join(' and ')}`;
    }
    ce += '.';
    if (this.relationships.length > 0) {
      facts = [];
      ce += `\nconceptualise the ${this.name} ${this.name.charAt(0).toUpperCase()}`;
      for (let i = 0; i < this.relationships.length; i += 1) {
        const relType = this.node.getConceptById(this.relationships[i].target);
        facts.push(`~ ${this.relationships[i].label} ~ the ${relType.name} ${alph[i]}`);
      }
      if (facts.length > 0) {
        if (this.parents.length > 0 || this.values.length > 0) { ce += ' and'; }
        ce += ` ${facts.join(' and ')}.`;
      }
    }
    return ce;
  }

  get gist() {
    let gist = '';
    if (this.parents.length > 0) { gist += `A ${this.name}`; }
    for (let i = 0; i < this.parents.length; i += 1) {
      gist += ` is a type of ${this.parents[i].name}`;
      if (i < this.parents.length - 1) { gist += ' and'; }
    }
    if (this.parents.length > 0) { gist += '.'; }
    const facts = [];
    for (let i = 0; i < this.values.length; i += 1) {
      if (this.values[i].type === 0) {
        facts.push(`has a value called ${this.values[i].label}`);
      } else {
        const valType = this.node.getConceptById(this.values[i].type);
        facts.push(`has a type of ${valType.name} called ${this.values[i].label}`);
      }
    }
    for (let i = 0; i < this.relationships.length; i += 1) {
      const relType = this.node.getConceptById(this.relationships[i].target);
      facts.push(`${this.relationships[i].label} a type of ${relType.name}`);
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
    this.values.push(value);
    Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
      get() {
        return type === 0 ? 'value' : type;
      },
      configurable: true,
    });
  }

  addRelationship(label, target, source) {
    const relationship = {};
    relationship.source = source;
    relationship.label = label;
    relationship.target = target.id;
    this.relationships.push(relationship);
    Object.defineProperty(this, label.toLowerCase().replace(/ /g, '_'), {
      get() {
        return target;
      },
      configurable: true,
    });
  }

  addParent(parentConcept) {
    if (this.parents.indexOf(parentConcept.id) === -1) {
      this.parents.push(parentConcept.id);
    }
  }

  addSynonym(synonym) {
    for (let i = 0; i < this.synonyms.length; i += 1) {
      if (this.synonyms[i].toLowerCase() === synonym.toLowerCase()) {
        return;
      }
    }
    this.synonyms.push(synonym);
  }
}
module.exports = CEConcept;
