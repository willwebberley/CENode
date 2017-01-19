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
    const match = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~ ([A-Z0-9]+)/i);
    const conceptName = match[1];
    const conceptVariable = match[2];
    const storedConcept = this.node.getConceptByName(conceptName);
    let concept = null;
    if (storedConcept) { 
      return [false, 'This concept already exists.'];
    }
    concept = new CEConcept(this.node, conceptName, source);

    const remainder = t.replace(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~ ([A-Z0-9]+) that/, '');
    const facts = remainder.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processConceptFact(concept, fact, source); 
    }
    return [true, t, concept];
  }

  modifyConcept(t, source) {
    const conceptInfo = t.match(/^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) (?:has|is|~)/);
    const conceptName = conceptInfo[1];
    const conceptVar = conceptInfo[2];
    const concept = this.node.getConceptByName(conceptName);
    if (!concept) {
      return [false, `Concept ${conceptInfo[1]} not known.`];
    }

    const remainderRegex = new RegExp('^conceptualise the ' + conceptName + ' ' + conceptVar, 'i');
    const remainder = t.replace(remainderRegex, '');
    const facts = remainder.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processConceptFact(concept, fact, source); 
    }
    return [true, t, concept];
  }

  processConceptFact(concept, fact, source) {
    const input = fact.trim().replace(/\+/g, 'and');
    if (input.match(/has the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) as ~ ([a-zA-Z0-9 ]*) ~/g)) {
      const re = /has the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) as ~ ([a-zA-Z0-9 ]*) ~/g;
      const match = re.exec(input);
      const valConceptName = match[1];
      const valConceptVar = match[2];
      const label = match[3];
      const valConcept = valConceptName === 'value' ? 0 : this.node.getConceptByName(valConceptName);
      concept.addValue(label, valConcept, source);
    }
    if (input.match(/^is an? ([a-zA-Z0-9 ]*)/)) {
      const re = /^is an? ([a-zA-Z0-9 ]*)/;
      const match = re.exec(input);
      const parentConceptName = match[1];
      const parentConcept = this.node.getConceptByName(parentConceptName);
      if (parentConcept) {
        concept.addParent(parentConcept);
      }
    }
    if (input.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z0-9]+)/)){
      const re = /~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z0-9]+)/;
      const match = re.exec(input);
      const label = match[1];
      const relConceptName = match[2];
      const relConcept = this.node.getConceptByName(relConceptName);
      if (relConcept) {
        concept.addRelationship(label, relConcept, source);
      }
    }
    if (input.match(/~ is expressed by ~ ([a-zA-Z0-9 ]*)/)) {
      const re = /~ is expressed by ~ ([a-zA-Z0-9 ]*)/;
      const match = re.exec(input);
      const synonym = match[1];
      concept.addSynonym(synonym);
    }
  }

  newInstance(t, source) {
    let names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([^'\\]*(?:\\.[^'\\]*)*)'/i);
    if (!names) {
      names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named ([a-zA-Z0-9_]*)/i);
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

    const remainder = t.replace(/^there is an? (?:[a-zA-Z0-9 ]*) named (?:[a-zA-Z0-9_]*|'[a-zA-Z0-9_ ]*') that/, '');
    const facts = remainder.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    console.log(facts);
    for (const fact of facts) {
      this.processInstanceFact(instance, fact, source); 
    }
    return [true, t, instance];
  }

  modifyInstance(t, source) {
    let concept;
    let instance;
    if (t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i)) {
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

    const remainder = t.replace(`'${instance.name}'`,instance.name).replace(`the ${concept.name} ${instance.name}`.trim(), '');
    const facts = remainder.replace(/\band\b/g, '+').match(/(?:'(?:\\.|[^'])*'|[^+])+/g);
    for (const fact of facts) {
      this.processInstanceFact(instance, fact, source); 
    } 
    return [true, t, instance];
  }

  processInstanceFact(instance, fact, source) {
    const input = fact.trim().replace(/\+/g, 'and');
    if (input.match(/(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_' ]*)/g)) {
      const re = /(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_' ]*)/g;
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
    if (input.match(/has the ([a-za-z0-9 ]*) ([a-za-z0-9_]*|'[a-za-z0-9_ ]*') as ([a-za-z0-9 ]*)/g)){
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
