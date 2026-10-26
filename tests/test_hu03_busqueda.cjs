const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'workflows/03-abonos-distancia-busqueda.json');

function workflow(){return JSON.parse(fs.readFileSync(file,'utf8'));}
function node(w,name){return w.nodes.find(n=>n.name===name);}

test('GET uses the validated lookup URL and the API Tienda credential',()=>{
 const w=workflow();
 const request=node(w,'Buscar apartado');
 assert.equal(request.type,'n8n-nodes-base.httpRequest');
 assert.equal(request.parameters.method,'GET');
 assert.equal(request.parameters.url,'={{ $json.url_busqueda }}');
 assert.equal(request.parameters.authentication,'genericCredentialType');
 assert.equal(request.parameters.genericAuthType,'httpHeaderAuth');
 assert.equal(request.credentials.httpHeaderAuth.name,'API Tienda');
 assert.deepEqual(request.parameters.options.response.response,{fullResponse:true,neverError:true,responseFormat:'json'});
 assert.equal(request.onError,undefined);
});

test('lookup response reaches #36 without adding payment or email side effects',()=>{
 const w=workflow();
 assert.deepEqual(w.connections['Continuar con búsqueda (#35)'].main[0].map(x=>x.node),['Buscar apartado']);
 assert.deepEqual(w.connections['Buscar apartado'].main[0].map(x=>x.node),['Resultados de búsqueda (#36)']);
 assert(node(w,'Resultados de búsqueda (#36)'));
 assert.equal(w.active,false);
 const requests=w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest');
 assert.equal(requests.length,2); // Groq extraction + this GET
 assert.equal(requests.filter(n=>n.parameters.method==='POST').length,1);
 assert(!w.nodes.some(n=>n.type==='n8n-nodes-base.emailSend'));
 assert.equal(w.settings.errorWorkflow,JSON.parse(fs.readFileSync(path.join(root,'workflows/08-error-workflow.json'),'utf8')).id);
});
