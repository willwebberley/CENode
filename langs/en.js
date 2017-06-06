module.exports = {
  concept: {
    create: {
      stub: '^conceptualise an? ~ ([a-zA-Z0-9 ]*) ~ ([A-Z0-9]+)(?: that)?'
    },
    edit: {
      stub: '^conceptualise the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) (?:has|is|~)',
    },
    parseValue: 'has the ([a-zA-Z0-9 ]*) ([A-Z0-9]+) as ~ ([a-zA-Z0-9 ]*) ~',
    parseParent: '^is an? ([a-zA-Z0-9 ]*)',
    parseRel: '~ ([a-zA-Z0-9 ]*) ~ the ([a-zA-Z0-9 ]*) ([A-Z0-9]+)',
    parseSyn: '~ is expressed by ~ ([a-zA-Z0-9 ]*)'
  },
  instance: {
    createStub: '^there is an? ([a-zA-Z0-9 ]*) named',
    editStub: '^the ([a-zA-Z0-9 ]*)'
  },
  and: 'and',
  value: 'value'
};
