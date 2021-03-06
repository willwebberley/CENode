const CENode = require('../src/CENode.js');
const CEModels = require('../models/index.js');
const expect = require('expect.js');

let node;

describe('CEParser', function() {

  describe('Conceptualisation', function (){
    before(function() {
      node = new CENode();
    });
    it('allow new concepts to be created', () => {
      node.addCE('conceptualise a ~ plant ~ P');
      expect(node.concepts.plant.name).to.be('plant');
    });
    it('allow for hierarchy of concepts', () => {
      node.addCE('conceptualise a ~ flower ~ F that is a plant');
      expect(node.concepts.flower.parents.length).to.be(1);
      expect(node.concepts.flower.parents[0].name).to.be('plant');
    });
    it('allow concepts to have multiple parents', () => {
      node.addCE('conceptualise a ~ dandilion ~ D that is a plant and is a flower');
      expect(node.concepts.dandilion.parents.length).to.be(2);
    });
    it('allow for multi-character variable names', () => {
      node.addCE('conceptualise a ~ seed ~ S1 that ~ grows into ~ the flower S2');
      expect(node.concepts.seed).to.not.be(undefined);
      expect(node.concepts.seed.relationships.length).to.be(1);
      expect(node.concepts.seed.relationships[0].label).to.be('grows into');
    });
    it('allow concepts to be instantiated with values', () => {
      node.addCE('conceptualise a ~ tree ~ T that has the value H as ~ height ~');
      expect(node.concepts.tree.values.length).to.be(1);
      expect(node.concepts.tree.values[0].label).to.be('height');
    });
    it('allow concepts to be modified with values', () => {
      node.addCE('conceptualise the tree T has the value A as ~ age ~');
      expect(node.concepts.tree.values.length).to.be(2);
      expect(node.concepts.tree.values[1].label).to.be('age');
    });
    it('allow concepts to be modified with relationships', () => {
      node.addCE('conceptualise the plant P ~ grows into ~ the tree T');
      expect(node.concepts.plant.relationships.length).to.be(1);
      expect(node.concepts.plant.relationships[0].label).to.be('grows into');
    });
    it('prevent multi-conceptualisation', () => {
      node.addCE('conceptualise a ~ river ~ R');
      node.addCE('conceptualise a ~ river ~ R');
      let counter = 0;
      for (const concept of node.concepts) {
        if (concept.name === 'river'){
          counter += 1;
        }
      }
      expect(counter).to.equal(1);
    });
    it('ensure concepts can be addressed by synonyms', () => {
      node.addCE('conceptualise a ~ seat ~ that ~ is expressed by ~ chair and has the value V as ~ height ~');
      node.addCE('there is a chair named chair1 that has 43cm as height');
      expect(node.instances.chair1.height).to.equal('43cm');
    });
  });   
  
  
  describe('Instantiation', function() {
    before(function() {
      node = new CENode(CEModels.core, CEModels.test);
    });
    it('allow instances of known types to be created', function() {
      node.addCE('there is a person named Fred');
      expect(node.instances.fred.name).to.be('Fred');
    });
    it('prevent instances of unknown types from be created', function() {
      node.addCE('there is a man named Gerald');
      expect(node.instances.gerald).to.be(undefined);
    });
    it('allow instances to have relationships with other instances of the same type', () => {
      node.addCE('there is a person named Jane');
      node.addCE('the person Fred is married to the person Jane');
      expect(node.instances.fred.is_married_to.name).to.be('Jane');
    });
    it('allow instances to have relationships with other instances of different type', () => {
      node.addCE('there is a company named IBM');
      node.addCE('the person Fred works for the company IBM');
      expect(node.instances.fred.works_for.name).to.be('IBM');
    });
    it('allow complex modification sentences with quoted values', () => {
      node.addCE('the person \'Jane\' is married to the person \'Fred\' and works for the company \'IBM\' and has \'53\' as age');
      expect(node.instances.jane.is_married_to.name).to.be('Fred');
      expect(node.instances.jane.works_for.name).to.be('IBM');
      expect(node.instances.jane.age).to.be('53');
    });
    it('allow complex modification sentences with unquoted single-word values', () => {
      node.addCE('there is a person named Harry');
      node.addCE('there is a person named Harriet');
      node.addCE('there is a company named NatWest');
      node.addCE('the person Harry is married to the person Harriet and works for the company NatWest and has 53 as age');
      expect(node.instances.harry.is_married_to.name).to.be('Harriet');
      expect(node.instances.harry.works_for.name).to.be('NatWest');
      expect(node.instances.harry.age).to.be('53');
    });
    it('allow multiple concept types', () => {
      node.addCE('the person Jane is a barrister and a londoner');
      expect(node.instances.jane.subConcepts.length).to.be(2);
      expect(node.instances.jane.subConcepts[0].name).to.be('barrister');
      expect(node.instances.jane.subConcepts[1].name).to.be('londoner');
    });
    
    it('prevent multi-instantiation', () => {
      node.addCE('there is a person named Francesca');
      node.addCE('there is a person named Francesca');
      let counter = 0;
      for (const instance of node.instances) {
        if (instance.name === 'Francesca'){
          counter += 1;
        }
      }
      expect(counter).to.equal(1);
    });
    it('ensure instance CE is correct', () => {
      node.addCE('there is an entity named Hagrid');
      const hagrid = node.instances.hagrid;
      expect(hagrid.ce).to.equal('there is a entity named \'Hagrid\'.');
      node.addCE('the entity Hagrid is a person');
      expect(hagrid.ce).to.equal('there is a entity named \'Hagrid\' that is a person.');
    });
    
    it('ensure instances can be addressed by synonyms', () => {
      node.addCE('conceptualise an ~ engineer ~ E');
      node.addCE('there is a person named William that is expressed by Will');
      node.addCE('the person Will is an engineer');
      expect(node.instances.william.subConcepts[0].name).to.be('engineer');
    });
    it('ensure instances inherit properties from subConcepts', () => {
      node.addCE('conceptualise a ~ borough ~ B');
      node.addCE('conceptualise the londoner L ~ lives in ~ the borough B');
      node.addCE('conceptualise the barrister B has the value V as ~ speciality ~');
      node.addCE('there is a person named Amy that is a londoner and is a barrister');
      node.addCE('the person Amy lives in the borough Chelsea and has \'family law\' as speciality');
      expect(node.instances.amy.lives_in.name).to.be('Chelsea');
      expect(node.instances.amy.speciality).to.be('family law');
    });
    it('ensure strings with a mix of quoted and unquoted names/values are parsed', () => {
      node.addCE('there is a londoner named Ella that lives in the borough \'Kensington and Chelsea\'');
      node.addCE('there is a londoner named \'Betty Hughes\' that lives in the borough Camden');
      node.addCE('there is a londoner named Sally');
      node.addCE('the londoner Sally lives in the borough \'Kensington and Chelsea\'');
      expect(node.instances.ella.lives_in.name).to.be('Kensington and Chelsea');
      expect(node.instances.betty_hughes.lives_in.name).to.be('Camden');
      expect(node.instances.sally.lives_in.name).to.be('Kensington and Chelsea');
    });
  });

  describe('Specific Examples', function() {
    beforeEach(function() {
      node = new CENode();
    });

    it('there is a person named Fred.', function() {
      node.addCE('conceptualise a ~ person ~ P');
      node.addCE('there is a person named Fred');
      expect(node.instances.fred.name).to.be('Fred');
    });

    it('the person Fred is married to the person Jane.', function() {
      node.addCE('conceptualise a ~ person ~ P that ~ is married to ~ the person Q');
      node.addCE('there is a person named Fred');
      node.addCE('the person Fred is married to the person Jane.');
      expect(node.instances.fred.is_married_to.name).to.be('Jane');
    });

    it('the person Fred works for the company IBM.', function() {
      node.addCE('conceptualise a ~ company ~ C');
      node.addCE('conceptualise a ~ person ~ P that ~ works for ~ the company C');
      node.addCE('there is a person named Fred');
      node.addCE('the person Fred works for the company IBM.');
      expect(node.instances.fred.works_for.name).to.be('IBM');
    });

    it('the person Fred works for the company IBM and is married to the person Jane and has 53 as age and has the city Cardiff as address.', function() {
      node.addCE('conceptualise a ~ company ~ C');
      node.addCE('conceptualise a ~ city ~ C');
      node.addCE('conceptualise a ~ person ~ P that ~ works for ~ the company C and ~ is married to ~ the person Q and has the value V as ~ age ~ and has the city C as ~ address ~');
      node.addCE('there is a person named Fred');
      node.addCE('the person Fred works for the company IBM and is married to the person Jane and has 53 as age and has the city Cardiff as address.');
      expect(node.instances.fred.works_for.name).to.be('IBM');
      expect(node.instances.fred.is_married_to.name).to.be('Jane');
      expect(node.instances.fred.age).to.be('53');
    });

    it('the person Jane is a barrister and a londoner.', function() {
      node.addCE('conceptualise a ~ barrister ~ B');
      node.addCE('conceptualise a ~ londoner ~ L');
      node.addCE('conceptualise a ~ person ~ P');
      node.addCE('there is a person named Jane');
      node.addCE('the person Jane is a barrister and a londoner.');
      expect(node.instances.jane.subConcepts.length).to.be(2);
      expect(node.instances.jane.subConcepts[0].name).to.be('barrister');
      expect(node.instances.jane.subConcepts[1].name).to.be('londoner');
    });

    it('conceptualise a ~ person ~ P.', function() {
      node.addCE('conceptualise a ~ person ~ P.');
      expect(node.concepts.person.name).to.be('person');
    });

    it('conceptualise a ~ person ~ P1 that ~ is married to ~ the person P2.', function() {
      node.addCE('conceptualise a ~ person ~ P1 that ~ is married to ~ the person P2.');
      expect(node.concepts.person.is_married_to.name).to.be('person');
    });

    it('conceptualise a ~ farmer ~ F that is a person and is a land owner.', function() {
      node.addCE('conceptualise a ~ person ~ p');
      node.addCE('conceptualise a ~ land owner ~ L');
      node.addCE('conceptualise a ~ farmer ~ F that is a person and is a land owner.');
      expect(node.concepts.farmer.parents.length).to.be(2);
      expect(node.concepts.farmer.parents[0].name).to.be('person');
      expect(node.concepts.farmer.parents[1].name).to.be('land owner');
    });
  });
});

