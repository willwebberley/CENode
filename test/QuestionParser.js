const CENode = require('../src/CENode.js');
const CEModels = require('../models/index.js');
const expect = require('expect.js');
const myName = 'User'
const PLANETS_MODEL = [
  "there is a rule named 'r1' that has 'if the planet C ~ orbits ~ the star D then the star D ~ is orbited by ~ the planet C' as instruction.",
  "there is a rule named 'r2' that has 'if the planet C ~ is orbited by ~ the moon D then the moon D ~ orbits ~ the planet C' as instruction.",
  "conceptualise a ~ celestial body ~ C.",
  "conceptualise the celestial body C ~ orbits ~ the celestial body D and ~ is orbited by ~ the celestial body E.",
  "conceptualise a ~ planet ~ P that is a celestial body and is an imageable thing.",
  "conceptualise a ~ star ~ S that is a celestial body.",
  "there is a star named sun.",
  "there is a planet named Venus that orbits the star 'sun' and has 'media/Venus.jpg' as image.",
  "there is a planet named Mercury that orbits the star 'sun' and has 'media/Mercury.jpg' as image."
]

let node;
describe('CEQuestionParser', function() {
  describe('What relation questions', function () {
    this.timeout(2050);
    before(function() {
      node = new CENode(CEModels.core, PLANETS_MODEL);
      node.attachAgent();
      node.agent.setName('agent1');
    });
    it('returns the correct number of responses', (done) => {
      const message = 'what orbits the sun?';
      const askCard = "there is a nl card named '{uid}' that is to the agent 'agent1' and is from the individual '" + myName + "' and has the timestamp '{now}' as timestamp and has '" + message.replace(/'/g, "\\'")+"' as content.";
      
      node.addSentence(askCard);
      
      setTimeout(function() {
        const cards = node.concepts.card.allInstances;
        const card = cards[cards.length - 1];
        expect(card.content).to.equal('Venus orbits the star sun. Mercury orbits the star sun.');
        done();
      }, 2000);
    });
  });
});
