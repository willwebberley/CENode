const CEConcept = require('./CEConcept.js');
const CEInstance = require('./CEInstance.js');

const quotes = {
  escape(string) {
    return string.replace(/'/g, "\\'");
  },
  unescape(string) {
    return string.replace(/\\'/g, "'").replace(/^'/, '').replace(/'$/,'');
  }
};

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
    if (t.match(/^conceptualise an?/i)) {
      return this.newConcept(t, source);
    } else if (t.match(/^conceptualise the/i)) {
      return this.modifyConcept(t, source);
    } else if (t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i)) {
      return this.newInstance(t, source);
    } else if (t.match(/^the ([a-zA-Z0-9 ]*)/i)) {
      return this.modifyInstance(t, source);
    }
    return [false, null];
  }

  newConcept(t, source) {
    const conceptName = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/i)[1];
    const storedConcept = this.node.getConceptByName(conceptName);
    let concept = null;
    if (storedConcept) { // if exists, simply modify existing concept
      return [false, 'This concept already exists.'];
    }
    // otherwise create a new one and add it to list
    concept = new CEConcept(this.node, conceptName, source);

    const facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b)/g);
    for (let i = 0; i < facts.length; i += 1) {
      const fact = facts[i].trim();

      // "has the type X as ~ label ~"
      if (fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
        const factsInfo = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
        let valueType = this.node.getConceptByName(factsInfo[1]);

        if (factsInfo[1] === 'value') { valueType = 0; } else if (!valueType) {
          return [false, `A property type is unknown: ${factsInfo[1]}`];
        }

        concept.addValue(factsInfo[3], valueType, source);
      }

      // "is a parentConcept"
      if (fact.match(/^an? ([a-zA-Z0-9 ]*)/)) {
        const parentName = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
        const parentConcept = this.node.getConceptByName(parentName);
        if (!parentConcept) {
          return [false, `Parent concept is unknown: ${parentName}`];
        }
        concept.addParent(parentConcept);
      }
    }
    return [true, t, concept];
  }

  modifyConcept(t, source) {
    const conceptInfo = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z])/i);
    const concept = this.node.getConceptByName(conceptInfo[1]);
    if (!concept) {
      return [false, `Concept ${conceptInfo[1]} not known.`];
    }

    const facts = t.split(/(\bthat\b|\band\b) (\bhas\b|\bis\b|)/g);
    for (let i = 0; i < facts.length; i += 1) {
      const fact = facts[i].trim();

      if (fact.match(/~ is expressed by ~ '([a-zA-Z0-9 ]*)'/)) {
        const factsInfo = fact.match(/~ is expressed by ~ '([a-zA-Z0-9 ]*)'/);
        concept.addSynonym(factsInfo[1]);
      }

      // "concept C ~ label ~ the target T"  (e.g. the teacher T ~ teaches ~ the student S)
      if (fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)) {
        const factsInfo = fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
        const target = this.node.getConceptByName(factsInfo[4]);
        if (!target) {
          return [false, `The target of one of your input relationships is of an unknown type: ${factsInfo[4]}`];
        }

        concept.addRelationship(factsInfo[3], target, source);
      }

      // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
      if (fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)) {
        const factsInfo = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
        const target = this.node.getConceptByName(factsInfo[2]);
        if (!target) {
          return [false, `The target of one of your input relationships is of an unknown type: ${factsInfo[2]}`];
        }

        concept.addRelationship(factsInfo[1], target, source);
      }

      // "has the type X as ~ label ~" (e.g. and has the room R as ~ location ~)
      if (fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
        const factsInfo = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
        let type = this.node.getConceptByName(factsInfo[1]);
        if (factsInfo[1] === 'value') { type = 0; } else if (!type) {
          return [false, `There is an invalid value in your sentence: ${factsInfo[1]}`];
        }

        concept.addValue(factsInfo[3], type, source);
      } else if (fact.match(/^an? ([a-zA-Z0-9 ]*)/)) { // "is a parentConcept" (e.g. and is a entity)
        const parentInfo = fact.match(/^an? ([a-zA-Z0-9 ]*)/);

        concept.addParent(this.node.getConceptByName(parentInfo[1]));
      }
    }
    return [true, t, concept];
  }

  newInstance(t, source) {
    let names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([^'\\]*(?:\\.[^'\\]*)*)'/i);
    if (!names) {
      names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named ([a-zA-Z0-9]*)/i);
      if (!names) { return [false, 'Unable to determine name of instance.']; }
    }
    const conceptName = names[1];
    const instanceName = names[2].replace(/\\/g, '');
    const concept = this.node.getConceptByName(conceptName);
    const currentInstance = this.node.getInstanceByName(instanceName);
    const instance = new CEInstance(this.node, concept, instanceName, source);
    if (!concept) {
      return [false, `Instance type unknown: ${conceptName}`];
    }
    if (currentInstance && currentInstance.type.id === concept.id) {
      return [true, 'There is already an instance of this type with this name.', currentInstance];
    }
    instance.sentences.push(t);

    const test = t.replace(`'${instance.name}'`, instance.name).replace(`there is a ${concept.name} named ${instance.name} that`.trim(), '');
    const facts = test.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processFact(instance, fact, source); 
    }
    
    return [true, t, instance];
  }

  modifyInstance(t, source) {
    let concept;
    let instance;
    if (t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i)) {
      // the person 'fred' eats the fruit orange
      const names = t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i);
      if (names) {
        concept = this.node.getConceptByName(names[1]);
        instance = this.node.getInstanceByName(names[2].replace(/\\/g, ''));
      }
    } 
    if (!instance && t.match(/^the ([a-zA-Z0-9 ]*)/i)) {
      const names = t.match(/^the ([a-zA-Z0-9 ]*)/i);
      const nameTokens = names[1].split(' ');
      for (let i = 0; i < this.node.concepts.length; i += 1) {
        if (names[1].toLowerCase().indexOf(this.node.concepts[i].name.toLowerCase()) === 0) {
          concept = this.node.concepts[i];
          const instanceName = nameTokens[concept.name.split(' ').length].toLowerCase();
          instance = concept[instanceName];
          break;
        }
      }
    }
    if (!concept || !instance) {
      return [false, `Unknown concept/instance combination in: ${t}`];
    }
    instance.sentences.push(t);

    const test = t.replace(`'${instance.name}'`,instance.name).replace(`the ${concept.name} ${instance.name}`.trim(), '');
    const facts = test.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processFact(instance, fact, source); 
    } 

    return [true, t, instance];
  }

  processFact(instance, fact, source) {
    const input = fact.trim().replace(/\+/g, 'and');
    if (input.match(/(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9' ]*)/g)) {
      const re = /(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9' ]*)/g;
      const match = re.exec(input);
      const label = match[1];
      const relConceptName = match[2];
      const relInstanceName = match[3].replace(/'/g, '');
      const relConcept = this.node.getConceptByName(relConceptName);
      let relInstance = this.node.getInstanceByName(relInstanceName);
      if (!relInstance) {
        relInstance = new CEInstance(this.node, relConcept, relInstanceName, source);
      }
      instance.addRelationship(label, relInstance, true, source);
    }
    if (input.match(/has ([a-zA-Z0-9]*|'[^'\\]*(?:\\.[^'\\]*)*') as ([a-zA-Z0-9 ]*)/g)){
      const re = /has ([a-zA-Z0-9]*|'[^'\\]*(?:\\.[^'\\]*)*') as ([a-zA-Z0-9 ]*)/g;
      const match = re.exec(input);
      const value = quotes.unescape(match[1]);
      const label = match[2];
      instance.addValue(label, value, true, source);
    }
    if (input.match(/has the ([a-za-z0-9 ]*) ([a-za-z0-9]*|'[a-za-z0-9 ]*') as ([a-za-z0-9 ]*)/g)){
      const re = /has the ([a-za-z0-9 ]*) ([a-za-z0-9]*|'[a-za-z0-9 ]*') as ([a-za-z0-9 ]*)/g;
      const match = re.exec(input);
      const valConceptName = match[1];
      const valInstanceName = match[2].replace(/'/g, '');
      const label = match[3];
      const valConcept = this.node.getConceptByName(valConceptName);
      let valInstance = this.node.getInstanceByName(valInstanceName);
      if (!valInstance) {
        valInstance = new CEInstance(this.node, valConcept, valInstanceName, source);
      }
      instance.addValue(label, valInstance, true, source);
    }
    if (input.match(/(?:is| )?an? ([a-zA-Z0-9 ]*)/g)){
      const re = /(?:is| )?an? ([a-zA-Z0-9 ]*)/g;
      const match = re.exec(input);
      instance.addSubConcept(this.node.getConceptByName(match && match[1] && match[1].trim()));
    }
    if (input.match(/is expressed by ('[a-zA-Z0-9 ]*'|[a-zA-Z0-9]*)/)){
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
