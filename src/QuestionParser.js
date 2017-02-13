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
    const input = t.trim();
    if (t.match(/^where (is|are)/i)) {
      return this.whereIs(input);
    } else if (t.match(/^(\bwho\b|\bwhat\b) is(?: \bin?\b | \bon\b | \bat\b)/i)) {
      return this.whatIsIn(input);
    } else if (t.match(/^(\bwho\b|\bwhat\b) (?:is|are)/i)) {
      return this.whatIs(input);
    } else if (t.match(/^(\bwho\b|\bwhat\b) does/i)) {
      return this.whatDoes(input);
    } else if (t.match(/^(\bwho\b|\bwhat\b)/i)) {
      return this.whatRelationship(input);
    } else if (t.match(/^list (\ball\b|\binstances\b)/i)) {
      return this.listInstances(input);
    }
    return [false, null];
  }

  whereIs(t) {
    const thing = t.match(/^where (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9 ]*)/i)[1].replace(/\?/g, '');
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
    for (const locatableInstance of locatableInstances) { locatableIds.push(locatableInstance.id); }

    for (const value of instance.values) {
      if (locatableIds.indexOf(value.instance.id) > -1) {
        const place = `has ${value.instance.name} as ${value.label}`;
        if (!(place in places)) {
          places[place] = 0;
        }
        places[place] += 1;
        placeFound = true;
      }
    }
    for (const relationship of instance.relationships) {
      if (locatableIds.indexOf(relationship.instance.id) > -1) {
        const place = `${relationship.label} ${relationship.instance.name}`;
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
    for (const locatableInstance of locatableInstances) {
      if (thing.toLowerCase().indexOf(locatableInstance.name.toLowerCase()) > -1) {
        instance = locatableInstance; break;
      }
    }
    if (!instance) {
      return [true, `${thing} is not an instance of type location.`];
    }
    const things = {};
    let thingFound = false;
    for (const checkInstance of this.node.instances) {
      for (const value of checkInstance.values) {
        if (value.instance.id === instance.id) {
          const thing2 = `the ${checkInstance.type.name} ${checkInstance.name} has the ${instance.type.name} ${instance.name} as ${value.label}`;
          if (!(thing2 in things)) {
            things[thing2] = 0;
          }
          things[thing2] += 1;
          thingFound = true;
        }
      }
      for (const relationship of checkInstance.relationships) {
        if (relationship.instance.id === instance.id) {
          const thing2 = `the ${checkInstance.type.name} ${checkInstance.name} ${relationship.label} the ${instance.type.name} ${instance.name}`;
          if (!(thing2 in things)) {
            things[thing2] = 0;
          }
          things[thing2] += 1;
          thingFound = true;
        }
      }
    }
    if (!thingFound) {
      return [true, `I don't know what is located in/on/at the ${instance.type.name} ${instance.name}.`];
    }

    let message = '';
    for (const thing2 in things) {
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
        for (const checkConcept of this.node.concepts) {
          for (const checkValue of checkConcept.values) {
            const v = checkValue;
            if (v.label.toLowerCase() === name.toLowerCase()) {
              if (!v.concept) {
                possibilities.push(`is a possible value of a type of ${checkConcept.name} (e.g. "the ${checkConcept.name} '${checkConcept.name.toUpperCase()} NAME' has 'VALUE' as ${name}")`);
              } else {
                possibilities.push(`is a possible ${v.concept.name} type of a type of ${checkConcept.name} (e.g. "the ${checkConcept.name} '${checkConcept.name.toUpperCase()} NAME' has the ${v.concept.name} '${v.concept.name.toUpperCase()} NAME' as ${name}")`);
              }
            }
          }

          for (const checkRelationship of checkConcept.relationships) {
            const r = checkRelationship;
            if (r.label.toLowerCase() === name.toLowerCase()) {
              possibilities.push(`describes the relationship between a type of ${checkConcept.name} and a type of ${r.concept.name} (e.g. "the ${checkConcept.name} '${checkConcept.name.toUpperCase()} NAME' ${name} the ${r.concept.name} '${r.concept.name.toUpperCase()} NAME'")`);
            }
          }
        }
        if (possibilities.length > 0) {
          return [true, `'${name}' ${possibilities.join(' and ')}.`];
        }

        // If nothing found, do fuzzy search
        const searchReturn = this.fuzzySearch(t);
        let fuzzyGist = 'I know about ';
        let fuzzyFound = false;
        for (const key in searchReturn) {
          if (searchReturn[key].length > 1) {
            for (let i = 0; i < searchReturn[key].length; i += 1) {
              if (i === 0) {
                if (!fuzzyFound) {
                  fuzzyGist += `the ${key}s '${searchReturn[key][i]}'`;
                } else {
                  fuzzyGist += `The ${key}s '${searchReturn[key][i]}'`;
                }
              } else {
                fuzzyGist += `, '${searchReturn[key][i]}'`;
              }
              if (i === searchReturn[key].length - 1) {
                fuzzyGist += '. ';
              }
            }
          } else if (!fuzzyFound) {
            fuzzyGist += `the ${key} '${searchReturn[key][0]}'. `;
          } else {
            fuzzyGist += `The ${key} '${searchReturn[key][0]}'. `;
          }
          fuzzyFound = true;
        }
        if (fuzzyFound) {
          return [true, fuzzyGist];
        }
        return [true, 'I don\'t know who or what that is.'];
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
      return [false, 'Sorry - I can\'t work out what you\'re asking.'];
    }
    return null;
  }

  whatRelationship(t) {
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
      ins = this.node.getInstances();
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

  /*
   *
   * Search the knowledge base for an instance name similar to the one asked about.
   */
  fuzzySearch(sentence) {
    const searchFor = sentence.match(/^(?:\bwho\b|\bwhat\b) (?:is|are)(?: \ban?\b | \bthe\b | )([a-zA-Z0-9_ ]*)/i)[1].replace(/\?/g, '').replace(/'/g, '');
    const instances = this.node.getInstances();
    let multipleSearch;
    let instancesFiltered = [];

    if (searchFor.indexOf(' ')) {
      // if theres spaces then split
      multipleSearch = searchFor.split(' ');
    }

    if (multipleSearch) {
      // loop through to create return string
      for (let x = 0; x < multipleSearch.length; x += 1) {
        const instancesFilteredTemp = instances.filter((input) => {
          if (input.name.toUpperCase().includes(multipleSearch[x].toUpperCase())) {
            return input;
          }
          return null;
        });
        instancesFiltered = instancesFiltered.concat(instancesFilteredTemp);
      }
    } else {
      // single search term
      instancesFiltered = instances.filter((input) => {
        if (input.name.toUpperCase().includes(searchFor.toUpperCase())) {
          return input;
        }
        return null;
      });
    }

    const instancesSummary = instancesFiltered.reduce((previous, current) => {
      const prev = previous;
      if (!prev[current.type.name]) {
        prev[current.type.name] = [];
      }
      prev[current.type.name].push(current.name);
      return prev;
    }, {});

    return instancesSummary;
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = QuestionParser;
