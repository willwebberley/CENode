const CEConcept = require('./CEConcept.js');
const CEInstance = require('./CEInstance.js');

class CEParser {

  /*
   * Submit CE to be processed by node.
   * This may result in
   *  - new concepts or instances being created
   *  - modifications to existing concepts or instances
   *  - no action (i.e. invalid or dryRun true)
   *
   *  The dryRun argument is optional. If set to 'true', the method will behave
   *  as normal, but will not actually modify the node's model.
   *
   *  Source is an optional identifier to tag stored information with an input source.
   *
   * Returns: [bool, str] (bool = success, str = error or parsed string)
   */
  parse(input, dryRun, source){
    const t = input.replace(/\s+/g, ' ').replace(/\.+$/, '').trim(); // Whitespace -> single space
    if (t.match(/^conceptualise an?/i)) {
      return this.newConcept(t, dryRun, source);
    } else if (t.match(/^conceptualise the/i)) {
      return this.modifyConcept(t, dryRun, source);
    } else if (t.match(/^there is an? ([a-zA-Z0-9 ]*) named/i)){
      return this.newInstance(t, dryRun, source);
    } else if (t.match(/^the ([a-zA-Z0-9 ]*)/i)) {
      return this.modifyInstance(t, dryRun, source);
    }
    return [false, null];
  }

  newConcept(t, dryRun, source) {
    const conceptName = t.match(/^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~/i)[1];
    const storedConcept = this.node.getConceptByName(conceptName);
    let concept = null;
    if (storedConcept) { // if exists, simply modify existing concept
      return [false, 'This concept already exists.'];
    }
    // otherwise create a new one and add it to list
    concept = new CEConcept(this.node, conceptName, source);

    // Writepoint
    if (!dryRun) {
      this.node.concepts.push(concept);
      this.node.conceptDict[concept.id] = concept;
    }

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

        // Writepoint
        if (!dryRun) {
          concept.addValue(factsInfo[3], valueType, source);
        }
      }

      // "is a parentConcept"
      if (fact.match(/^an? ([a-zA-Z0-9 ]*)/)) {
        const parentName = fact.match(/^an? ([a-zA-Z0-9 ]*)/)[1];
        const parentConcept = this.node.getConceptByName(parentName);
        if (!parentConcept) {
          return [false, `Parent concept is unknown: ${parentName}`];
        }
        // Writepoint
        if (!dryRun) {
          concept.addParent(parentConcept);
        }
      }
    }
    return [true, t, concept];
  }

  modifyConcept(t, dryRun, source) {
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
        if (!dryRun) {
          concept.addSynonym(factsInfo[1]);
        }
      }

      // "concept C ~ label ~ the target T"  (e.g. the teacher T ~ teaches ~ the student S)
      if (fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)) {
        const factsInfo = fact.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
        const target = this.node.getConceptByName(factsInfo[4]);
        if (!target) {
          return [false, `The target of one of your input relationships is of an unknown type: ${factsInfo[4]}`];
        }

        // Writepoint
        if (!dryRun) {
          concept.addRelationship(factsInfo[3], target, source);
        }
      }

      // "~ label ~ the target T" (e.g. and ~ loves ~ the person P)
      if (fact.match(/^~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/)) {
        const factsInfo = fact.match(/~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/);
        const target = this.node.getConceptByName(factsInfo[2]);
        if (!target) {
          return [false, `The target of one of your input relationships is of an unknown type: ${factsInfo[2]}`];
        }

        // Writepoint
        if (!dryRun) {
          concept.addRelationship(factsInfo[1], target, source);
        }
      }

      // "has the type X as ~ label ~" (e.g. and has the room R as ~ location ~)
      if (fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/)) {
        const factsInfo = fact.match(/^the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ ([a-zA-Z0-9 ]*) ~/);
        let type = this.node.getConceptByName(factsInfo[1]);
        if (factsInfo[1] === 'value') { type = 0; } else if (!type) {
          return [false, `There is an invalid value in your sentence: ${factsInfo[1]}`];
        }

        // Writepoint
        if (!dryRun) {
          concept.addValue(factsInfo[3], type, source);
        }
      } else if (fact.match(/^an? ([a-zA-Z0-9 ]*)/)) { // "is a parentConcept" (e.g. and is a entity)
        const parentInfo = fact.match(/^an? ([a-zA-Z0-9 ]*)/);

        // Writepoint
        if (!dryRun) {
          concept.addParent(this.node.getConceptByName(parentInfo[1]));
        }
      }
    }
    return [true, t, concept];
  }

  newInstance(t, dryRun, source) {
    let instance;
    let concept;
    let names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named '([^'\\]*(?:\\.[^'\\]*)*)'/i);
    if (!names) {
      names = t.match(/^there is an? ([a-zA-Z0-9 ]*) named ([a-zA-Z0-9]*)/i);
      if (!names) { return [false, 'Unable to determine name of instance.']; }
    }
    const conceptName = names[1];
    const instanceName = names[2].replace(/\\/g, '');
    concept = this.node.getConceptByName(conceptName);
    const currentInstance = this.node.getInstanceByName(instanceName);
    if (!concept) {
      return [false, `Instance type unknown: ${conceptName}`];
    }
    if (currentInstance && currentInstance.type.id === concept.id) {
      return [true, 'There is already an instance of this type with this name.', currentInstance];
    }

    instance = new CEInstance(this.node, concept, instanceName, source);
    instance.sentences.push(t);

    // Writepoint
    if (!dryRun) {
      this.node.instances.push(instance);
      this.node.instanceDict[instance.id] = instance;
    }

    const conceptFactsMultiword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
    const conceptFactsSingleword = t.match(/(?:\bthat\b|\band\b) has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/g);
    const valueFacts = t.match(/(?:\bthat\b|\band\b) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
    const relationshipFactsMultiword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/g);
    const relationshipFactsSingleword = t.match(/(?:\bthat\b|\band\b) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/g);
    const synonymFacts = t.match(/is expressed by '([^'\\]*(?:\\.[^'\\]*)*)'/g);

    let conceptFacts = [];
  if (!conceptFactsMultiword) { conceptFacts = conceptFactsSingleword; } else { conceptFacts = conceptFactsMultiword.concat(conceptFactsSingleword); }
  let relationshipFacts = [];
  if (!relationshipFactsMultiword) { relationshipFacts = relationshipFactsSingleword; } else { relationshipFacts = relationshipFactsMultiword.concat(relationshipFactsSingleword); }

  this.parseInstanceFacts(instance, conceptFacts, valueFacts, relationshipFacts, synonymFacts, dryRun, source);
  return [true, t, instance];
  }
  
  modifyInstance(t, dryRun, source) {
    let concept;
    let instance;
    if (t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i)){
      const names = t.match(/^the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/i);
      if (names) {
        concept = this.node.getConceptByName(names[1]);
        instance = this.node.getInstanceByName(names[2].replace(/\\/g, ''));
      }
    } else if (t.match(/^the ([a-zA-Z0-9 ]*)/i)){
      const names = t.match(/^the ([a-zA-Z0-9 ]*)/i);
      const nameTokens = names[1].split(' ');
      for (let i = 0; i < this.node.concepts.length; i += 1) {
        if (names[1].toLowerCase().indexOf(this.node.concepts[i].name.toLowerCase()) === 0) {
          concept = this.node.concepts[i];
          instance = this.node.getInstanceByName(nameTokens[concept.name.split(' ').length]);
          break;
        }
      }
    }

    if (!concept || !instance) {
      return [false, `Unknown concept/instance combination in: ${t}`];
    }

    // Writepoint
    if (!dryRun) {
      instance.sentences.push(t);
    }

    const conceptFactsMultiword = t.match(/(?:\bthat\b|\band\b|) has the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
    const conceptFactsSingleword = t.match(/(?:\bthat\b|\band\b|) has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/g);
    const valueFacts = t.match(/(?:\bthat\b|\band\b|) has '([^'\\]*(?:\\.[^'\\]*)*)' as ((.(?!\band\b))*)/g);
    const relationshipFactsMultiword = t.match(/(?:\bthat\b|\band\b|) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/g);
    const relationshipFactsSingleword = t.match(/(?:\bthat\b|\band\b|) (?!\bhas\b)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/g);
    const synonymFacts = t.match(/is expressed by '([^'\\]*(?:\\.[^'\\]*)*)'/g);

    let conceptFacts = [];
    if (!conceptFactsMultiword) { conceptFacts = conceptFactsSingleword; } else { conceptFacts = conceptFactsMultiword.concat(conceptFactsSingleword); }
    let relationshipFacts = [];
    if (!relationshipFactsMultiword) { relationshipFacts = relationshipFactsSingleword; } else { relationshipFacts = relationshipFactsMultiword.concat(relationshipFactsSingleword); }

    this.parseInstanceFacts(instance, conceptFacts, valueFacts, relationshipFacts, synonymFacts, dryRun, source);
    return [true, t, instance];
  }

  parseInstanceFacts (instance, conceptFacts, valueFacts, relationshipFacts, synonymFacts, dryRun, source) {
    if (conceptFacts) {
      for (let i = 0; i < conceptFacts.length; i += 1) {
        if (conceptFacts[i]) {
          const fact = conceptFacts[i].trim();
          let valueType;
          let valueInstanceName;
          let valueLabel;
          let factsInfo = fact.match(/the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
          if (factsInfo) {
            valueType = factsInfo[1];
            valueInstanceName = factsInfo[2].replace(/\\/g, '');
            valueLabel = factsInfo[3];
          } else {
            factsInfo = fact.match(/(?:\bthat\b|\band\b) ?has the ([a-zA-Z0-9 ]*) as ((.(?!\band\b))*)/);
            const typeNameTokens = factsInfo[1].split(' ');
            for (let j = 0; j < typeNameTokens.length - 1; j += 1) { valueType += `${typeNameTokens[j]} `; }
            valueType = valueType.trim();
            valueInstanceName = typeNameTokens[typeNameTokens.length - 1].trim();
            valueLabel = factsInfo[2];
          }
          if (valueLabel !== '' && valueType !== '' && valueInstanceName !== '') {
            let valueInstance = this.node.getInstanceByName(valueInstanceName);
            if (!valueInstance) {
              valueInstance = new CEInstance(this.node, this.node.getConcpetByName(valueType), valueInstanceName, source);
            // Writepoint
              if (!dryRun) {
                valueInstance.sentences.push(t);
                this.node.instances.push(valueInstance);
                this.node.instanceDict[valueInstance.id] = valueInstance;
              }
            }

          // Writepoint
            if (!dryRun) {
              instance.addValue(valueLabel, valueInstance, true, source);
            }
          }
        }
      }
    }

    if (valueFacts) {
      for (let i = 0; i < valueFacts.length; i += 1) {
        if (valueFacts[i]) {
          const fact = valueFacts[i].trim();
          const factsInfo = fact.match(/has '([^'\\]*(?:\\.[^'\\]*)*)' as ([a-zA-Z0-9 ]*)/);
          const valueValue = factsInfo[1].replace(/\\/g, '');
          const valueLabel = factsInfo[2];

        // Writepoint
          if (!dryRun) {
            instance.addValue(valueLabel, valueValue, true, source);
          }
        }
      }
    }

    if (relationshipFacts) {
      for (let i = 0; i < relationshipFacts.length; i += 1) {
        if (relationshipFacts[i]) {
          const fact = relationshipFacts[i].trim();
          let relationshipLabel;
          let relationshipTypeName;
          let relationshipInstanceName;
          let factsInfo = fact.match(/(?:\bthat\b|\band\b|) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) '([^'\\]*(?:\\.[^'\\]*)*)'/);
          if (factsInfo) {
            relationshipLabel = factsInfo[1];
            relationshipTypeName = factsInfo[2];
            relationshipInstanceName = factsInfo[3].replace(/\\/g, '');
          } else {
            factsInfo = fact.match(/(?:\bthat\b|\band\b|) ?([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*)/);
            const typeInstanceTokens = factsInfo[2].split(' ');
            relationshipTypeName = '';
            for (let j = 0; j < typeInstanceTokens.length - 1; j += 1) { relationshipTypeName += `${typeInstanceTokens[j]} `; }
            relationshipLabel = factsInfo[1];
            relationshipTypeName = relationshipTypeName.trim();
            relationshipInstanceName = typeInstanceTokens[typeInstanceTokens.length - 1].trim();
          }
          if (relationshipLabel !== '' && relationshipTypeName !== '' && relationshipInstanceName !== '') {
            const relationshipType = this.node.getConceptByName(relationshipTypeName);
            let relationshipInstance = this.node.getInstanceByName(relationshipInstanceName);
            if (!relationshipType) {
              return [false, `Unknown relationship type: ${relationshipTypeName}`];
            }
            if (!relationshipInstance) {
              relationshipInstance = new CEInstance(this.node, this.node.getConceptByName(relationshipTypeName), relationshipInstanceName, source);

            // Writepoint
              if (!dryRun) {
                relationshipInstance.sentences.push(t);
                this.node.instances.push(relationshipInstance);
                this.node.instanceDict[relationshipInstance.id] = relationshipInstance;
              }
            }

          // Writepoint
            if (!dryRun) {
              instance.addRelationship(relationshipLabel, relationshipInstance, true, source);
            }
          }
        }
      }
    }

    if (synonymFacts) {
      for (let i = 0; i < synonymFacts.length; i += 1) {
        if (synonymFacts[i]) {
          const fact = synonymFacts[i].trim();
          const factsInfo = fact.match(/is expressed by ('([^'\\]*(?:\\.[^'\\]*)*)')/);
          if (!dryRun) {
            instance.addSynonym(factsInfo[2]);
          }
        }
      }
    }
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = CEParser;
