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

  constructor(name, port) {
    this.port = port;
    this.node = new CENode(CEModels.core, CEModels.server);
    this.node.attachAgent();
    this.node.agent.setName(name);
    this.handlers = {
      'GET': {
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
              id: concept.id
            });
          }
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(concepts));
        },
        '/instances': (request, response) => {
          const instances = [];
          for (const instance of this.node.instances) {
            instances.push({
              name: instance.name,
              id: instance.id,
              conceptName: instance.concept.name,
              conceptId: instance.concept.id
            });
          }
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(instances));
        },
      },
      'POST': {
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
        }
      },
      'PUT': {
        '/reset': () => {
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
        }
      }
    };
  }

  start() {
    this.server = http.createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*');
      if (request.method in this.handlers) {
        const path = request.url.indexOf('?') > 1 ? request.url.slice(0, request.url.indexOf('?')) : request.url;
        if (path in this.handlers[request.method]) {
          this.handlers[request.method][path](request, response);
        }
        else {
          response.writeHead(404);
          response.end(`404: Resource not found for method ${request.method}.`);
        }
      }
      else {
        response.writeHead(405);
        response.end('405: Method not allowed on this server.');
      }
    });
    this.server.listen(this.port);
    this.server.on('error', err => {/* Do nothing */});
  }

  stop (){
    if (this.server) {
      this.server.close();
    }
  }
}

if (require.main === module) {
  const name = process.argv.length > 2 ? process.argv[2] : 'Moira';
  const port = process.argv.length > 3 ? process.argv[3] : 5555;
  new CEServer(name, port).start();
}

module.exports = CEServer;
