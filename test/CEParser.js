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
  });

});


