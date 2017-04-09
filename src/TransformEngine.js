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

  evalInContext(func) {
    return eval(func);        //# .logs `{ a: 1, b: 2, c: 3 }` inside example()
  }

  enactTransforms(instance, label, targetInstance, source) {
    let doTransform = false;
    let transform;
    if (targetInstance.concept && targetInstance.concept.name === 'transform'){
      transform = targetInstance;
    }
    else {
      for (const rel of instance.relationships){
        if (rel.instance.concept && rel.instance.concept.name === 'transform'){
          if (rel.instance.input === label || rel.instance.input === 'name'){
            transform = rel.instance;
          }
        }
      }
    }

    if (transform) {
      const e = this.evalInContext.call(instance, transform.transform_function);
      instance.addValue(transform.output, e.toString(), true, source);
    }
  }

  constructor(node) {
    this.node = node;
  }
}
module.exports = TransformEngine;
