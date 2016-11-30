const POST_SENTENCES_ENDPOINT = "/sentences";
const GET_CARDS_ENDPOINT = "/cards";

class CEServer {

  constructor (name, port){
    this.node = new CENode(MODELS.CORE);
    this.node.addSentence("there is a forwardall policy named 'p1' that has 'true' as all agents and has the timestamp '0' as start time and has 'true' as enabled");
    if(name){
      node.agent.setName(process.argv[2]);
    }

    require('http').createServer((request, response) => {

      response.setHeader("Access-Control-Allow-Origin", "*");

      if(request.method == "GET"){

        if(request.url == "/"){
          const ins = node.getInstances();
          const con = node.getConcepts();
          let s = '<html><head><title>CENode Management</title></head><body><h1>CENode Server Admin Interface</h1>';
          s+='<div style="width:48%;float:left;"><h2>Conceptual model</h2><p>Load a bundled model to the node:</p><form action="/model" method="POST"><select name="model">';
          for(key in MODELS){s+='<option value="'+key+'">'+key+'</option>';}
          s +='</select><input type="submit"></form>';
          s+='<p>Add CE sentences to the node:</p><form action="/ui/sentences" enctype="application/x-www-form-urlencoded" method="POST"><textarea name="sentence" style="width:95%;height:100px;"></textarea><br /><br /><input type="submit" /></form></div>';
          s+='<div style="width:48%;float:left;"><h2>Node settings</h2><p>Update local agent name:</p><form method="POST" action="/agent-name"><input type="text" name="name" value="'+node.agent.getName()+'" /><input type="submit" /></form>';
          s+='<p>Other options:</p><button onclick="window.location=\'/reset\';">Empty model</button>';
          s+='<p>Available endpoints on this node server instance:</p><p style="font-family:\'monospace\';font-size:11px;">- POST '+POST_SENTENCES_ENDPOINT+' (body = newline-delimited set of sentences)<br />- GET '+GET_CARDS_ENDPOINT+'?agent=NAME (get all known cards sent to NAME)</p>';
          s+='</div><div style="clear:both;"></div>';
          s+='<div style="display:inline-block;width:45%;float:left;"><h2>Concepts</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(con, undefined, 2)+'</textarea></div>';
          s+='<div style="display:inline-block;width:45%;float:right;"><h2>Instances</h2><textarea style="width:100%;height:300px;" readonly>'+JSON.stringify(ins, undefined, 2)+'</textarea></div>';
          s+='</ul><body></html>';
          response.writeHead(200, {"Content-Type": "text/html"});
          response.end(s);
        }

        else if(request.url.indexOf(GET_CARDS_ENDPOINT) == 0){
          response.writeHead(200, {"Content-Type": "text/ce"});
          getCards(request, response);      
        }

        else if(request.url == "/reset"){
          node.resetAll();
          response.writeHead(302, { 'Location': '/'});
          response.end();
        }

        else{
          response.writeHead(404);
          response.end("404: Resource not found for method GET.");
        }
      }

      else if(request.method == "POST"){

        if(request.url.indexOf(GET_CARDS_ENDPOINT) == 0){
          let body = "";
          request.on('data', function(chunk){
            body+=chunk;
          });
          request.on('end', function(){
            const ignores = body.split(/\\n|\n/);
            response.writeHead(200, {"Content-Type": "text/ce"});
            getCards(request, response, ignores);
          });
        }

        else if(request.url == POST_SENTENCES_ENDPOINT){
          response.writeHead(200, {"Content-Type": "text/ce"});
          postSentences(request, response);      
        }

        else if(request.url == "/ui/sentences"){
          response.writeHead(302, {"Location": "/"});
          postSentences(request, response);      
        }

        else if(request.url == "/model"){
          let body = "";
          request.on('data', function(chunk){
            body+=chunk;
          });
          request.on('end', function(){
            const components = {};
            body.replace(
              new RegExp("([^?=&]+)(=([^&]*))?", "g"),
                function($0, $1, $2, $3) { components[$1] = $3; }
            );
            if(components.model in MODELS){
              const model = MODELS[components.model];
              node.addSentences(model);
            }
          });
          response.writeHead(302, { 'Location': '/'});
          response.end();
        }

        else if(request.url == "/agent-name"){
          let body = "";
          request.on('data', function(chunk){
            body+=chunk;
          });     
          request.on('end', function(){
            body = decodeURIComponent(body.replace("name=","").replace(/\+/g, ' '));
            node.agent.setName(body);
            console.log("Set local agent's name to '"+node.agent.getName()+"'.");
            response.writeHead(302, { 'Location': '/'});
            response.end();
          });
        }

        else{
          response.writeHead(404);
          response.end("404: Resource not found for method POST.");
        }    
      }

      else{
        response.writeHead(405);
        response.end("405: Method not allowed on this server.");
      }
    }).listen(port || 5555);
  }

  postSentences (request, response){
    let body = "";
    request.on('data', function(chunk){
      body+=chunk;
    });     
    request.on('end', function(){
      body = decodeURIComponent(body.replace("sentence=","").replace(/\+/g, ' '));
      const sentences = body.split(/\\n|\n/);
      const responses = node.addSentences(sentences);
      response.write(responses.map(function(resp){return resp.data;}).join("\n"));
      response.end();
    });
  }

  getCards (request, response, ignores){
    const url = decodeURIComponent(request.url);
    const agentRegex = url.match(/agent=(.*)/);
    let agentStr = null;
    let agents = [];
    ignores = ignores ? ignores : [];
    if(agentRegex != null){agentStr = agentRegex[1];}
    if(agentStr != null){
      agents = agentStr.toLowerCase().split(",");
    }
    const cards = node.getInstances("card", true);
    let s = "";
    for(let i = 0; i < cards.length; i++){
      if(ignores.indexOf(cards[i].name) == -1){
        if(agents == null || agents.length == 0){
          s += cards[i].ce+"\n";
        }
        else{
          const tos = cards[i].isTos;
          if(tos){
            for(let j = 0; j < tos.length; j++){
              for(let k = 0; k < agents.length; k++){
                if(tos[j].name.toLowerCase() == agents[k]){
                  s += cards[i].ce+"\n";
                  break;
                }
              }
            }
          }
        }
      }
    }
    response.write(s);
    response.end();
  }
}
