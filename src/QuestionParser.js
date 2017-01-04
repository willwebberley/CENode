class QuestionParser {

  /*
   * Submit a who/what/where question to be processed by node.
   * This may result in
   *  - a response to the question returned
   *  - error returned (i.e. invalid question)
   * This method does not update the conceptual model.
   *
   * Returns: [bool, str] (bool = success, str = error or response)
   */
  parse(t) {
    if (t.match(/^where (is|are)/i)) {
      return this.whereIs(t);
    } else if (t.match(/^(\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)/i)) {
      return this.whatIsIn(t);
    } else if (t.match(/^(\bwho\b|\bwhat\b) (?:is|are)/i)) {
      return this.whatIs(t);
    } else if (t.match(/^(\bwho\b|\bwhat\b) does/i)) {
      return this.whatDoes(t);
    } else if (t.match(/^(\bwho\b|\bwhat\b)/i)) {
      return this.whatRelationship(t);
    } else if (t.match(/^list (\ball\b|\binstances\b)/i)) {
      return this.listInstances(t);
    }
    return [false, null];
  }

  whereIs(t) {
    const thing = t.match(/^where (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '');// .replace(/(\bthe\b|\ba\b)/g, '').trim();
    const instance = this.node.getInstanceByName(thing);
    let message;
    if (!instance) {
      message = `I don't know what ${thing} is.`;
      return [true, message];
    }
    const locatableInstances = this.node.getInstances('location', true);
    const locatableIds = [];
    const places = {};
    let placeFound = false;
    for (let i = 0; i < locatableInstances.length; i += 1) { locatableIds.push(locatableInstances[i].id); }

    for (let i = 0; i < instance.values.length; i += 1) {
      if (locatableIds.indexOf(instance.values[i].instance.id) > -1) {
        const place = `has ${instance.values[i].instance.name} as ${instance.values[i].label}`;
        if (!(place in places)) {
          places[place] = 0;
        }
        places[place] += 1;
        placeFound = true;
      }
    }
    for (let i = 0; i < instance.relationships.length; i += 1) {
      if (locatableIds.indexOf(instance.relationships[i].instance.id) > -1) {
        const place = `${instance.relationships[i].label} ${instance.relationships[i].instance.name}`;
        if (!(place in places)) {
          places[place] = 0;
        }
        places[place] += 1;
        placeFound = true;
      }
    }
    if (!placeFound) {
      message = `I don't know where ${instance.name} is.`;
      return [true, message];
    }
    message = instance.name;
    for (const place in places) {
      if (place) {
        message += ` ${place}`;
        if (places[place] > 1) {
          message += ` (${places[place]} times)`;
        }
        message += ' and';
      }
    }
    return [true, `${message.substring(0, message.length - 4)}.`];
  }

  whatIsIn(t) {
    const thing = t.match(/^(?:\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '').replace(/\bthe\b/g, '').replace(/'/g, '');
    let instance = null;
    const locatableInstances = this.node.getInstances('location', true);
    for (let i = 0; i < locatableInstances.length; i += 1) {
      if (thing.toLowerCase().indexOf(locatableInstances[i].name.toLowerCase()) > -1) {
        instance = locatableInstances[i]; break;
      }
    }
    if (!instance) {
      return [true, `${thing} is not an instance of type location.`];
    }
    const things = {};
    let thingFound = false;
    for (let i = 0; i < this.node.instances.length; i += 1) {
      const vals = this.node.instances[i].values;
      const rels = this.node.instances[i].relationships;
      if (vals) {
        for (let j = 0; j < vals.length; j += 1) {
          if (vals[j].instance.id === instance.id) {
            const thing2 = `the ${this.node.instances[i].type.name} ${this.node.instances[i].name} has the ${instance.type.name} ${instance.name} as ${vals[j].label}`;
            if (!(thing2 in things)) {
              things[thing2] = 0;
            }
            things[thing2] += 1;
            thingFound = true;
          }
        }
      }
      if (rels) {
        for (let j = 0; j < rels.length; j += 1) {
          if (rels[j].instance.id === instance.id) {
            const thing2 = `the ${this.node.instances[i].type.name} ${this.node.instances[i].name} ${rels[j].label} the ${instance.type.name} ${instance.name}`;
            if (!(thing2 in things)) {
              things[thing2] = 0;
            }
            things[thing2] += 1;
            thingFound = true;
          }
        }
      }
    }
    if (!thingFound) {
      return [true, `I don't know what is located in/on/at the ${instance.type.name} ${instance.name}.`];
    }

    let message = '';
    for (const thing2 of things) {
      message += ` ${thing2}`;
      if (things[thing] > 1) {
        message += ` (${things[thing2]} times)`;
      }
      message += ' and';
    }
    return [true, `${message.substring(0, message.length - 4)}.`];
  }

  whatIs(input) {
    const t = input.replace(/\?/g, '').replace(/'/g, '').replace(/\./g, '');

    // If we have an exact match (i.e. 'who is The Doctor?')
    let name = t.match(/^(\bwho\b|\bwhat\b) (?:is|are) ([a-zA-Z0-9_ ]*)/i);
    let instance;
    if (name) {
      instance = this.node.getInstanceByName(name[2]);
      if (instance) {
        return [true, instance.gist];
      }
    }

    // Otherwise, try and infer it
    name = t.match(/^(?:\bwho\b|\bwhat\b) (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9_ ]*)/i)[1].replace(/\?/g, '').replace(/'/g, '');
    instance = this.node.getInstanceByName(name);
    if (!instance) {
      const concept = this.node.getConceptByName(name);
      if (!concept) {
        const possibilities = [];
        for (let i = 0; i < this.node.concepts.length; i += 1) {
          for (let j = 0; j < this.node.concepts[i].values.length; j += 1) {
            const v = this.node.concepts[i].values[j];
            if (v.label.toLowerCase() === name.toLowerCase()) {
              if (v.type === 0) {
                possibilities.push(`is a possible value of a type of ${this.node.concepts[i].name} (e.g. "the ${this.node.concepts[i].name} '${this.node.concepts[i].name.toUpperCase()} NAME' has 'VALUE' as ${name}")`);
              } else {
                possibilities.push(`is a possible ${v.concept.name} type of a type of ${this.node.concepts[i].name} (e.g. "the ${this.node.concepts[i].name} '${this.node.concepts[i].name.toUpperCase()} NAME' has the ${v.concept.name} '${v.concept.name.toUpperCase()} NAME' as ${name}")`);
              }
            }
          }
          for (let j = 0; j < this.node.concepts[i].relationships.length; j += 1) {
            const r = this.node.concepts[i].relationships[j];
            if (r.label.toLowerCase() === name.toLowerCase()) {
              possibilities.push(`describes the relationship between a type of ${this.node.concepts[i].name} and a type of ${r.concept.name} (e.g. "the ${this.node.concepts[i].name} '${this.node.concepts[i].name.toUpperCase()} NAME' ${name} the ${r.concept.name} '${r.concept.name.toUpperCase()} NAME'")`);
            }
          }
        }
        if (possibilities.length > 0) {
          return [true, `'${name}' ${possibilities.join(' and ')}.`];
        }
        return [true, "I don't know who or what that is."];
      }
      return [true, concept.gist];
    }
    return [true, instance.gist];
  }

  whatDoes(t) {
    try {
      const data = t.match(/^(\bwho\b|\bwhat\b) does ([a-zA-Z0-9_ ]*)/i);
      const body = data[2].replace(/\ban\b/gi, '').replace(/\bthe\b/gi, '').replace(/\ba\b/gi, '');
      const tokens = body.split(' ');
      let instance;
      for (let i = 0; i < tokens.length; i += 1) {
        const testString = tokens.slice(0, i).join(' ').trim();
        if (!instance) {
          instance = this.node.getInstanceByName(testString);
        } else {
          break;
        }
      }
      if (instance) {
        const propertyName = tokens.splice(instance.name.split(' ').length, tokens.length - 1).join(' ').trim();
        let fixedPropertyName = propertyName;
        let property = instance.property(propertyName);
        if (!property) {
          fixedPropertyName = propertyName.replace(/s/ig, '');
          property = instance.property(fixedPropertyName);
        }
        if (!property) {
          const propTokens = propertyName.split(' ');
          propTokens[0] = `${propTokens[0]}s`;
          fixedPropertyName = propTokens.join(' ').trim();
          property = instance.property(fixedPropertyName);
        }
        if (property) {
          return [true, `${instance.name} ${fixedPropertyName} the ${property.type.name} ${property.name}.`];
        }
        return [true, `Sorry - I don't know that property about the ${instance.type.name} ${instance.name}.`];
      }
    } catch (err) {
      return [false, "Sorry - I can't work out what you're asking."];
    }
    return null;
  }

  whatRelationship(t) {
    try {
      const data = t.match(/^(\bwho\b|\bwhat\b) ([a-zA-Z0-9_ ]*)/i);
      const body = data[2].replace(/\ban\b/gi, '').replace(/\bthe\b/gi, '').replace(/\ba\b/gi, '');
      const tokens = body.split(' ');
      let instance;
      for (let i = 0; i < tokens.length; i += 1) {
        const testString = tokens.slice(tokens.length - (i + 1), tokens.length).join(' ').trim();
        if (!instance) {
          instance = this.node.getInstanceByName(testString);
        }
        if (!instance && testString[testString.length - 1].toLowerCase() === 's') {
          instance = this.node.getInstanceByName(testString.substring(0, testString.length - 1));
        }
        if (instance) {
          break;
        }
      }
      if (instance) {
        const propertyName = tokens.splice(0, tokens.length - instance.name.split(' ').length).join(' ').trim();
        for (let i = 0; i < this.node.instances.length; i += 1) {
          const subject = this.node.instances[i];
          let fixedPropertyName = propertyName;
          let property = subject.property(propertyName);
          if (!property) {
            const propTokens = propertyName.split(' ');
            if (propTokens[0][propTokens[0].length - 1].toLowerCase() === 's') {
              propTokens[0] = propTokens[0].substring(0, propTokens[0].length - 1);
            }
            fixedPropertyName = propTokens.join(' ').trim();
            property = subject.property(fixedPropertyName);
          }
          if (!property) {
            const propTokens = propertyName.split(' ');
            propTokens[0] = `${propTokens[0]}s`;
            fixedPropertyName = propTokens.join(' ').trim();
            property = subject.property(fixedPropertyName);
          }
          if (property && property.name === instance.name) {
            return [true, `${subject.name} ${fixedPropertyName} the ${property.type.name} ${property.name}.`];
          }
        }
        return [true, `Sorry - I don't know that property about the ${instance.type.name} ${instance.name}.`];
      }
    } catch (err) {
      return [false, "Sorry - I can't work out what you're asking."];
    }
    return null;
  }

  listInstances(t) {
    let ins = [];
    let s = '';
    if (t.toLowerCase().indexOf('list instances of type') === 0) {
      const con = t.toLowerCase().replace('list instances of type', '').trim();
      ins = this.node.getInstances(con);
      s = `Instances of type '${con}':`;
    } else if (t.toLowerCase().indexOf('list all instances of type') === 0) {
      const con = t.toLowerCase().replace('list all instances of type', '').trim();
      ins = this.node.getInstances(con, true);
      s = `All instances of type '${con}':`;
    } else if (t.toLowerCase() === 'list instances') {
      ins = this.node.instances;
      s = 'All instances:';
    }
    if (ins.length === 0) {
      return [true, 'I could not find any instances matching your query.'];
    }
    const names = [];
    for (let i = 0; i < ins.length; i += 1) {
      names.push(ins[i].name);
    }
    return [true, `${s} ${names.join(', ')}`];
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = QuestionParser;
