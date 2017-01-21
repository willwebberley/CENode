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

class NLParser {

  /*
   * Submit natural language to be processed by node.
   * This results in
   *  - string representing what the node THINKS the input is trying to say.
   *    (this could be returned as a confirm card
   * This method does not update the conceptual model.
   *
   * Returns: str
   */
  parse(input) {
    const t = input.replace(/'/g, '').replace(/\./g, '');
    const tokens = t.split(' ');
    const andFacts = t.split(/\band\b/);

    // Try to find any mentions of known instances and tie them together using
    // values and relationships.

    const commonWords = ['there', 'what', 'who', 'where', 'theres', 'is', 'as', 'and', 'has', 'that', 'the', 'a', 'an', 'named', 'called', 'name', 'with', 'conceptualise', 'on', 'at', 'in'];
    let focusInstance = null;
    let smallestIndex = 999999;
    for (let i = 0; i < this.node.instances.length; i += 1) {
      const possibleNames = this.node.instances[i].synonyms.concat(this.node.instances[i].name);
      for (let j = 0; j < possibleNames.length; j += 1) {
        if (t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) > -1) {
          if (t.toLowerCase().indexOf(possibleNames[j].toLowerCase()) < smallestIndex) {
            focusInstance = this.node.instances[i];
            smallestIndex = t.toLowerCase().indexOf(possibleNames[j].toLowerCase());
            break;
          }
        }
      }
    }
    if (focusInstance) {
      const focusConcept = focusInstance.type;
      const focusInstanceWords = focusInstance.name.toLowerCase().split(' ');
      const focusConceptWords = focusConcept.name.toLowerCase().split(' ');
      for (let i = 0; i < focusInstanceWords.length; i += 1) { commonWords.push(focusInstanceWords[i]); }
      for (let i = 0; i < focusConceptWords.length; i += 1) { commonWords.push(focusConceptWords[i]); }

      const ce = `the ${focusConcept.name} '${focusInstance.name}' `;
      const facts = [];

      const parents = focusConcept.ancestors;
      parents.push(focusConcept);

      let possibleRelationships = [];
      let possibleValues = [];
      for (let i = 0; i < parents.length; i += 1) {
        possibleRelationships = possibleRelationships.concat(parents[i].relationships);
        possibleValues = possibleValues.concat(parents[i].values);
      }

      for (let k = 0; k < andFacts.length; k += 1) {
        const f = andFacts[k].toLowerCase();
        const factTokens = f.split(' ');
        for (let i = 0; i < possibleValues.length; i += 1) {
          const valueWords = possibleValues[i].label.toLowerCase().split(' ');
          for (let j = 0; j < valueWords.length; j += 1) { commonWords.push(valueWords[j]); }

          if (possibleValues[i].concept) {
            const valueConcept = possibleValues[i].concept;
            const valueInstances = this.node.getInstances(valueConcept.name, true);
            for (let j = 0; j < valueInstances.length; j += 1) {
              const possibleNames = valueInstances[j].synonyms.concat(valueInstances[j].name);
              for (let l = 0; l < possibleNames.length; l += 1) {
                if (f.toLowerCase().indexOf(possibleNames[l].toLowerCase()) > -1) {
                  facts.push(`has the ${valueConcept.name} '${valueInstances[j].name}' as ${possibleValues[i].label}`);
                  break;
                }
              }
            }
          } else if (f.toLowerCase().indexOf(possibleValues[i].label.toLowerCase()) > -1) {
            let valueName = '';
            for (let j = 0; j < factTokens.length; j += 1) {
              if (commonWords.indexOf(factTokens[j].toLowerCase()) === -1) {
                valueName += `${factTokens[j]} `;
              }
            }
            if (valueName !== '') {
              facts.push(`has '${valueName.trim()}' as ${possibleValues[i].label}`);
            }
          }
        }

        const usedIndices = [];
        for (let i = 0; i < possibleRelationships.length; i += 1) {
          if (possibleRelationships[i].concept) {
            const relConcept = possibleRelationships[i].concept;
            const relInstances = this.node.getInstances(relConcept.name, true);
            for (let j = 0; j < relInstances.length; j += 1) {
              const possibleNames = relInstances[j].synonyms.concat(relInstances[j].name);
              for (let l = 0; l < possibleNames.length; l += 1) {
                const index = f.toLowerCase().indexOf(` ${possibleNames[l].toLowerCase()}`); // ensure object at least starts with the phrase (but not ends with, as might be plural)
                if (index > -1 && usedIndices.indexOf(index) === -1) {
                  facts.push(`${possibleRelationships[i].label} the ${relConcept.name} '${relInstances[j].name}'`);
                  usedIndices.push(index);
                  break;
                }
              }
            }
          }
        }
      }
      if (facts.length > 0) {
        return [true, ce + facts.join(' and ')];
      }
    }

    for (let i = 0; i < this.node.concepts.length; i += 1) {
      if (t.toLowerCase().indexOf(this.node.concepts[i].name.toLowerCase()) > -1) {
        const conceptWords = this.node.concepts[i].name.toLowerCase().split(' ');
        commonWords.push(this.node.concepts[i].name.toLowerCase());
        for (let j = 0; j < conceptWords; j += 1) {
          commonWords.push(conceptWords[j]);
        }
        let newInstanceName = '';
        for (let j = 0; j < tokens.length; j += 1) {
          if (commonWords.indexOf(tokens[j].toLowerCase()) === -1) {
            newInstanceName += `${tokens[j]} `;
          }
        }
        if (newInstanceName && newInstanceName.length) {
          return [true, `there is a ${this.node.concepts[i].name} named '${newInstanceName.trim()}'`];
        }
        return [true, `there is a ${this.node.concepts[i].name} named '${this.node.concepts[i].name} ${this.node.instances.length}${1}'`];
      }
    }
    return [false, `Un-parseable input: ${t}`];
  }

  /*
   * Return a string representing a guess at what the user is trying to say next.
   * Actually what is returned is the input string + the next word/phrase based on:
   *  - current state of conceptual model (i.e. names/relationships of concepts/instances)
   *  - key words/phrases (e.g. "conceptualise a ")
   *
   * Returns: str
   */
  guessNext(t) {
    const s = t.trim().toLowerCase();
    const tokens = t.split(' ');
    let numberOfTildes = 0;
    let indexOfFirstTilde = 0;
    for (let i = 0; i < tokens.length; i += 1) { if (tokens[i] === '~') { numberOfTildes += 1; if (numberOfTildes === 1) { indexOfFirstTilde = i; } } }
    const possibleWords = [];
    if (t === '') { return t; }
    if (numberOfTildes === 1) {
      try {
        return `${t} ~ ${tokens[indexOfFirstTilde + 1].charAt(0).toUpperCase()} `;
      } catch (err) { /* continue anyway */ }
    }
    if (s.match(/^conceptualise a ~ (.*) ~ [A-Z] /)) {
      return `${t} that `;
    }

    if (tokens.length < 2) {
      possibleWords.push('conceptualise a ~ ');
      possibleWords.push('there is a ');
      possibleWords.push('where is ');
      possibleWords.push('what is ');
      possibleWords.push('who is ');
    }
    if (tokens.length > 2) {
      possibleWords.push("named '");
      possibleWords.push('that ');
      possibleWords.push('is a ');
      possibleWords.push('and is ');
      possibleWords.push('and has the ');
      possibleWords.push('the ');
    }

    const mentionedInstances = [];

    if (s.indexOf('there is') === -1 || tokens.length === 1) {
      for (let i = 0; i < this.node.instances.length; i += 1) {
        possibleWords.push(this.node.instances[i].name);
        if (s.indexOf(this.node.instances[i].name.toLowerCase()) > -1) {
          mentionedInstances.push(this.node.instances[i]);
        }
      }
    }
    for (let i = 0; i < this.node.concepts.length; i += 1) {
      possibleWords.push(this.node.concepts[i].name);
      let conceptMentioned = false;
      for (let j = 0; j < mentionedInstances.length; j += 1) {
        if (mentionedInstances[j].conceptId === this.node.concepts[i].id) { conceptMentioned = true; break; }
      }
      if (s.indexOf(this.node.concepts[i].name.toLowerCase()) > -1 || conceptMentioned) {
        for (let j = 0; j < this.node.concepts[i].values.length; j += 1) { possibleWords.push(this.node.concepts[i].values[j].label); }
        for (let j = 0; j < this.node.concepts[i].relationships.length; j += 1) { possibleWords.push(this.node.concepts[i].relationships[j].label); }
      }
    }
    for (let i = 0; i < possibleWords.length; i += 1) {
      if (possibleWords[i].toLowerCase().indexOf(tokens[tokens.length - 1].toLowerCase()) === 0) {
        tokens[tokens.length - 1] = possibleWords[i];
        return tokens.join(' ');
      }
    }
    return t;
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = NLParser;
