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

const POST_SENTENCES_ENDPOINT = '/sentences';
const GET_CARDS_ENDPOINT = '/cards';
let server;

const handlers = {
  'GET': {
    '/sentences': (node, request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/ce' });
      const agentRegex = decodeURIComponent(request.url).match(/agent=(.*)/);
      const agentStr = agentRegex ? agentRegex[1] : null;
      const agents = (agentStr && agentStr.toLowerCase().split(',')) || [];
      let s = '';
      for (const card of node.getInstances('card', true)) {
        for (const to of card.is_tos) {
          for (const agent of agents) {
            if (to.name.toLowerCase() === agent) {
              s += `${card.ce}\n`;
              break;
            }
          }
        }
      }
      response.write(s);
      response.end();
    }
  },
  'POST': {
    '/cards': (node, request, response) => {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        response.writeHead(200, { 'Content-Type': 'text/ce' });
        const ignores = body.split(/\\n|\n/);
        const agentRegex = decodeURIComponent(request.url).match(/agent=(.*)/);
        const agentStr = agentRegex ? agentRegex[1] : null;
        const agents = (agentStr && agentStr.toLowerCase().split(',')) || [];
        let s = '';
        for (const card of node.getInstances('card', true)) {
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
        response.write(s);
        response.end();
      });
    },
    '/sentences': (node, request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/ce' });
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        body = decodeURIComponent(body.replace('sentence=', '').replace(/\+/g, ' '));
        const sentences = body.split(/\\n|\n/);
        const responses = node.addSentences(sentences);
        response.write(responses.map(resp => resp.data).join('\n'));
        response.end();
      });
    }
  },
  'PUT': {
    '/reset': (node) => {
      node.resetAll();
      response.writeHead(204);
      response.end();
    },
    '/agent/name': (node, request, response) => {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        body = decodeURIComponent(body.replace('name=', '').replace(/\+/g, ' '));
        node.agent.setName(body);
        response.writeHead(302, { Location: '/' });
        response.end();
      });
    }
  }
};

function startServer(name, port) {
  const node = new CENode(CEModels.core, CEModels.server);
  node.attachAgent();
  node.agent.setName(name);

  server = http.createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    if (request.method in handlers) {
      const path = request.url.indexOf('?') > 1 ? request.url.slice(0, request.url.indexOf('?')) : request.url;
      if (path in handlers[request.method]) {
        handlers[request.method][path](node, request, response);
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
  server.listen(port);
}

function stopServer (){
  if (server) {
    server.close();
  }
}

if (require.main === module) {
  const name = process.argv.length > 2 ? process.argv[2] : 'Moira';
  const port = process.argv.length > 3 ? process.argv[3] : 5555;
  startServer(name, port);
}

module.exports = {startServer, stopServer};
