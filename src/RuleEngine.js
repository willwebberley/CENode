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

class RuleEngine {

  static parseRule(instruction) {
    if (!instruction) { return null; }
    const rule = {};
    let thenString = null;
    const relFacts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z]) then the (.*)/i);
    const valFacts = instruction.match(/^if the ([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~ then the (.*)/i);
    if (relFacts) {
      rule.if = {};
      rule.if.concept = relFacts[1];
      rule.if.relationship = {};
      rule.if.relationship.type = relFacts[4];
      rule.if.relationship.label = relFacts[3];
      thenString = relFacts[6];
    } else if (valFacts) {
      rule.if = {};
      rule.if.concept = valFacts[1];
      rule.if.value = {};
      rule.if.value.type = valFacts[3];
      rule.if.value.label = valFacts[5];
      thenString = valFacts[6];
    }

    if (thenString) {
      const thenRelFacts = thenString.match(/^([a-zA-Z0-9 ]*) ([A-Z]) ~ (.*) ~ the ([a-zA-Z0-9 ]*) ([A-Z])/i);
      const thenValFacts = thenString.match(/^([a-zA-Z0-9 ]*) ([A-Z]) has the ([a-zA-Z0-9 ]*) ([A-Z]) as ~ (.*) ~/i);
      if (thenRelFacts) {
        rule.then = {};
        rule.then.concept = thenRelFacts[1];
        rule.then.relationship = {};
        rule.then.relationship.type = thenRelFacts[4];
        rule.then.relationship.label = thenRelFacts[3];
      } else if (thenValFacts) {
        rule.then = {};
        rule.then.concept = thenValFacts[1];
        rule.then.value = {};
        rule.then.value.type = thenValFacts[3];
        rule.then.value.label = thenValFacts[5];
      }
    }
    return rule;
  }

  enactRules(subjectInstance, propertyType, objectInstance, source) {
    if (typeof objectInstance === 'string') {
      return;
    }
    const rules = this.node.getInstances('rule');
    for (let i = 0; i < rules.length; i += 1) {
      const rule = RuleEngine.parseRule(rules[i].instruction);
      if (!rule) { return; }
      if (rule.if.concept === subjectInstance.type.name) {
        if ((propertyType === 'relationship' && rule.if.relationship) || (propertyType === 'value' && rule.if.value)) {
          const ancestorConcepts = objectInstance.type.ancestors;
          ancestorConcepts.push(objectInstance.type);
          for (let j = 0; j < ancestorConcepts.length; j += 1) {
            if (ancestorConcepts[j].name.toLowerCase() === rule.if[propertyType].type.toLowerCase()) {
              if (rule.then.relationship && rule.then.relationship.type === subjectInstance.type.name) {
                objectInstance.addRelationship(rule.then.relationship.label, subjectInstance, false, source);
              } else if (rule.then.value && rule.then.value.type === subjectInstance.type.name) {
                objectInstance.addValue(rule.then.value.label, subjectInstance, false, source);
              }
            }
          }
        }
      }
    }
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = RuleEngine;
