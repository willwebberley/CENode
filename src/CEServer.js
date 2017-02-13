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

const http = require('http');
const CENode = require('./CENode.js');
const CEModels = require('../models/index.js');

class CEServer {

  constructor(name, port, models) {
    this.port = port;
    this.node = new CENode();
    if (models) {
      for (const model of models) {
        this.node.loadModel(CEModels[model]);
      }
    }
    this.node.attachAgent();
    this.node.agent.setName(name);
    this.handlers = {
      GET: {
        '/cards': (request, response) => {
          const agentRegex = decodeURIComponent(request.url).match(/agent=(.*)/);
          const agentStr = agentRegex ? agentRegex[1] : null;
          const agents = (agentStr && agentStr.toLowerCase().split(',')) || [];
          let s = '';
          for (const card of this.node.getInstances('card', true)) {
            for (const to of card.is_tos) {
              for (const agent of agents) {
                if (to.name.toLowerCase() === agent) {
                  s += `${card.ce}\n`;
                  break;
                }
              }
            }
          }
          response.writeHead(200, { 'Content-Type': 'text/ce' });
          response.end(s);
        },
        '/concepts': (request, response) => {
          const concepts = [];
          for (const concept of this.node.concepts) {
            concepts.push({
              name: concept.name,
              id: concept.id,
            });
          }
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(concepts));
        },
        '/concept': (request, response) => {
          const idRegex = decodeURIComponent(request.url).match(/id=(.*)/);
          const id = idRegex ? idRegex[1] : null;
          const concept = this.node.getConceptById(id);
          if (concept) {
            const body = { name: concept.name, ce: concept.ce, parents: [], children: [], instances: [], values: [], relationships: [] };
            for (const parent of concept.parents) {
              body.parents.push({
                name: parent.name,
                id: parent.id,
              });
            }
            for (const child of concept.children) {
              body.children.push({
                name: child.name,
                id: child.id,
              });
            }
            for (const instance of concept.instances) {
              body.instances.push({
                name: instance.name,
                id: instance.id,
              });
            }
            for (const value of concept.values) {
              const valueName = value.concept && value.concept.name;
              const valueId = value.concept && value.concept.id;
              body.values.push({ label: value.label, targetName: valueName, targetId: valueId });
            }
            for (const relationship of concept.relationships) {
              body.relationships.push({ label: relationship.label, targetName: relationship.concept.name, targetId: relationship.concept.id });
            }
            response.writeHead(200, { 'Content-Type': 'application/json' });
            return response.end(JSON.stringify(body));
          }
          response.writeHead(404);
          return response.end('Concept not found');
        },
        '/instances': (request, response) => {
          const instances = [];
          for (const instance of this.node.instances) {
            instances.push({
              name: instance.name,
              id: instance.id,
              conceptName: instance.concept.name,
              conceptId: instance.concept.id,
            });
          }
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(instances));
        },
        '/instance': (request, response) => {
          const idRegex = decodeURIComponent(request.url).match(/id=(.*)/);
          const id = idRegex ? idRegex[1] : null;
          const instance = this.node.getInstanceById(id);
          if (instance) {
            const body = {
              name: instance.name,
              conceptName: instance.concept.name,
              conceptId: instance.concept.id,
              ce: instance.ce,
              synonyms: instance.synonyms,
              subConcepts: [],
              values: [],
              relationships: [],
            };
            for (const concept of instance.subConcepts) {
              body.subConcepts.push({ name: concept.name, id: concept.id });
            }
            for (const value of instance.values) {
              const valueName = value.instance.name || value.instance;
              const valueId = value.instance.id;
              const conceptName = value.instance.concept && value.instance.concept.name;
              const conceptId = value.instance.concept && value.instance.concept.id;
              body.values.push({ label: value.label, targetName: valueName, targetId: valueId, targetConceptName: conceptName, targetConceptId: conceptId });
            }
            for (const relationship of instance.relationships) {
              body.relationships.push({ label: relationship.label, targetName: relationship.instance.name, targetId: relationship.instance.id, targetConceptName: relationship.instance.concept.name, targetConceptId: relationship.instance.concept.id });
            }
            response.writeHead(200, { 'Content-Type': 'application/json' });
            return response.end(JSON.stringify(body));
          }
          response.writeHead(404);
          return response.end('Concept not found');
        },
        '/info': (request, response) => {
          const body = { recentInstances: [], recentConcepts: [], instanceCount: this.node.instances.length, conceptCount: this.node.concepts.length };
          const recentInstances = this.node.instances.slice(this.node.instances.length >= 10 ? this.node.instances.length - 10 : 0);
          for (const instance of recentInstances) {
            body.recentInstances.push({
              name: instance.name,
              id: instance.id,
              conceptName: instance.concept.name,
              conceptId: instance.concept.id,
            });
          }
          for (const concept of this.node.concepts) {
            body.recentConcepts.push({
              name: concept.name,
              id: concept.id,
            });
          }
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(body));
        },
        '/model': (request, response) => {
          let body = '';
          for (const concept of this.node.concepts) { body += `${concept.creationCE}\n`; }
          for (const concept of this.node.concepts) { body += `${concept.getCE(true)}\n`; }
          for (const instance of this.node.instances) { body += `${instance.creationCE}\n`; }
          for (const instance of this.node.instances) { body += `${instance.getCE(true)}\n`; }
          response.writeHead(200, { 'Content-Type': 'text/ce', 'Content-Disposition': `attachment; filename="${this.node.agent.name}.ce"` });
          response.end(body);
        },
      },
      POST: {
        '/cards': (request, response) => {
          let body = '';
          request.on('data', (chunk) => { body += chunk; });
          request.on('end', () => {
            const ignores = body.split(/\\n|\n/);
            const agentRegex = decodeURIComponent(request.url).match(/agent=(.*)/);
            const agentStr = agentRegex ? agentRegex[1] : null;
            const agents = (agentStr && agentStr.toLowerCase().split(',')) || [];
            let s = '';
            for (const card of this.node.getInstances('card', true)) {
              if (ignores.indexOf(card.name) === -1) {
                if (agents.length === 0) {
                  s += `${card.ce}\n`;
                } else {
                  for (const to of card.is_tos) {
                    for (const agent of agents) {
                      if (to.name.toLowerCase() === agent) {
                        s += `${card.ce}\n`;
                        break;
                      }
                    }
                  }
                }
              }
            }
            response.writeHead(200, { 'Content-Type': 'text/ce' });
            response.end(s);
          });
        },
        '/sentences': (request, response) => {
          let body = '';
          request.on('data', (chunk) => { body += chunk; });
          request.on('end', () => {
            body = decodeURIComponent(body.replace('sentence=', '').replace(/\+/g, ' '));
            const sentences = body.split(/\\n|\n/);
            const responses = this.node.addSentences(sentences);
            response.writeHead(200, { 'Content-Type': 'text/ce' });
            response.end(responses.map(resp => resp.data).join('\n'));
          });
        },
      },
      PUT: {
        '/reset': (request, response) => {
          this.node.resetAll();
          response.writeHead(204);
          response.end();
        },
        '/agent/name': (request, response) => {
          let body = '';
          request.on('data', (chunk) => { body += chunk; });
          request.on('end', () => {
            body = decodeURIComponent(body.replace('name=', '').replace(/\+/g, ' '));
            this.node.agent.setName(body);
            response.writeHead(302, { Location: '/' });
            response.end();
          });
        },
      },
    };
  }

  start() {
    this.server = http.createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*');
      if (request.method in this.handlers) {
        const path = request.url.indexOf('?') > 1 ? request.url.slice(0, request.url.indexOf('?')) : request.url;
        if (path in this.handlers[request.method]) {
          this.handlers[request.method][path](request, response);
        } else {
          response.writeHead(404);
          response.end(`404: Resource not found for method ${request.method}.`);
        }
      } else if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        response.writeHead(200);
        response.end();
      } else {
        response.writeHead(405);
        response.end('405: Method not allowed on this server.');
      }
    });
    this.server.listen(this.port);
    this.server.on('error', () => { this.node = undefined; });
  }

  stop() {
    if (this.server) {
      delete this.node;
      this.server.close();
    }
  }
}

if (require.main === module) {
  const name = process.argv.length > 2 ? process.argv[2] : 'Moira';
  const port = process.argv.length > 3 ? process.argv[3] : 5555;
  const models = process.argv.slice(4);
  new CEServer(name, port, models).start();
}

module.exports = CEServer;
