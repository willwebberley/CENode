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

class TransformEngine {

  evaluate (instance, func) {
    if (func.indexOf('require') > -1){
      return 'Invalid function';
    }

    try {
      const sandbox = {
        name: instance.name,
        type: instance.concept.name
      };
      for (const attr of instance.values.concat(instance.relationships)) {
        const value = attr.instance.name ? attr.instance.name : attr.instance;
        sandbox[attr.label.toLowerCase().replace(/ /g, '_').replace(/'/g, '')] = value;
      }
      if (typeof window !== 'undefined' && window.document) {
        return function () {
          return eval(func);
        }.call(sandbox);
      } 
      else {
        const vm = require('vm');
        const util = require('util')
        const script = new vm.Script(func);
        const context = new vm.createContext(sandbox);
        return script.runInContext(context, {timeout: 30});
      }
    }
    catch (err){
      return err;
    }
  }

  enactTransforms(instance, label, targetInstance, source) {
    let doTransform = false;
    let transforms = [];
    if (targetInstance.concept && targetInstance.concept.name === 'transform'){
      transforms = [targetInstance];
    }
    else {
      const newLabel = 'this.' + label.toLowerCase().replace(/ /g, '_').replace(/'/g, '');
      for (const rel of instance.relationships){
        if (rel.instance.concept && rel.instance.concept.name === 'transform' && rel.instance.transform_function && rel.instance.transform_function.indexOf(newLabel) > -1){
          transforms.push(rel.instance);
        }
      }
    }

    for (const transform of transforms) {
      const e = this.evaluate(instance, transform.transform_function);
      if (e){
        instance.addValue(transform.output, e.toString(), true, source);
      }
    }
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = TransformEngine;
