module.exports = {
  concept: {
    create: '^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~ ([A-Z0-9]+)(?: that)?',
    edit: '^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) (?:has|is|~)',
    parseValue: 'has the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) as ~ ([a-zA-Z0-9 ]*) ~',
    parseParent: '^is an? ([a-zA-Z0-9 ]*)',
    parseRel: '~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z0-9]+)',
    parseSyn: '~ is expressed by ~ ([a-zA-Z0-9 ]*)'
  },
  instance: {
    create: '^there is an? ([a-zA-Z0-9 ]*) named ([a-zA-Z0-9_]+|\'[a-zA-Z0-9_ ]+\')(?: that)?',
    edit: 'the ([a-zA-Z0-9_ ]+) ([a-zA-Z0-9_]+|\'[a-zA-Z0-9_ ]+\')',
    parseRel: '(?!has)([a-zA-Z0-9 ]*) the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_\' ]*)',
    parseRawVal: '^has ([a-zA-Z0-9]*|\'[^\'\]*(?:\\.[^\'\]*)*\') as ([a-zA-Z0-9 ]*)',
    parseInstanceVal: 'has the ([a-zA-Z0-9 ]*) ([a-zA-Z0-9_]*|\'[a-zA-Z0-9_ ]*\') as ([a-zzA-Z0-9 ]*)',
    parseInstanceSubConcept: '(?:is| )?an? ([a-zA-Z0-9 ]*)',
    parseInstanceSynonym: 'is expressed by (\'[a-zA-Z0-9 ]*\'|[a-zA-Z0-9]*)'
  },
  and: 'and',
  value: 'value'
};
