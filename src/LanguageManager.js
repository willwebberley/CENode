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
const langs = require('../langs');

const placeholders = {
  conceptName: '([a-zA-Z0-9 ]*)',
  conceptVar: '([A-Z0-9]+)',
  instanceName: '([a-zA-Z0-9_]+|\'[a-zA-Z0-9_ ]+\')',
  relationshipLabel: '([a-zA-Z0-9 ]*)'
};

class LanguageManager {

	static getEntry(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');
    s = s.replace(/^\./, '');
    const a = s.split('.');
    for (let i = 0, n = a.length; i < n; ++i) {
			const k = a[i];
			if (k in o) {
				o = o[k];
			} else {
				return;
			}
    }
    return o;
	}

  getExpression(key) {
    let pattern = LanguageManager.getEntry(this.lang, key);
    const extractions = {};
    if (pattern){
      console.log(pattern)
      for (const placeholder in placeholders){
        if (pattern.indexOf(placeholder) > -1){
          const re = new RegExp('<' + placeholder + '>');
          pattern = pattern.replace(re, placeholders[placeholder]);
        }
      }
    }
    console.log(pattern) 
    return pattern;
  }

  is(key, string){
    const re = new RegExp(this.getExpression(key), 'i');
    return re.test(string);
  }

  parse(key, string){
    const re = new RegExp(this.getExpression(key), 'i');
    return re.exec(string);
  }

  extract(key, string){
    
  }

  addLanguage(key, language){
    langs[key] = language;
  }

  setLanguage(key) {
    if (key in langs){
      this.lang = langs[key];
    }
  }

  constructor(node) {
    this.node = node;
    this.lang = langs['en'];
  }
}
module.exports = LanguageManager;
