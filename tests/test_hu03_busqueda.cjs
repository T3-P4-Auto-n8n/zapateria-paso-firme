const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'workflows/03-abonos-distancia.json');

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

test('lookup continues into deterministic payment decision; writes remain on guarded downstream branches',()=>{
 const w=workflow();
 assert.deepEqual(w.connections['Continuar con búsqueda (#35)'].main[0].map(x=>x.node),['Buscar apartado']);
 assert.deepEqual(w.connections['Buscar apartado'].main[0].map(x=>x.node),['Resultados de búsqueda']);
 assert.deepEqual(w.connections['Resultados de búsqueda'].main[0].map(x=>x.node),['Decidir apartado (#36)']);
 assert(node(w,'Resultados de búsqueda'));
 assert.equal(w.active,false);
 const requests=w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest');
 assert.equal(requests.length,3); // Groq extraction, lookup GET, guarded payment POST
 const paymentPost=requests.find(n=>n.name==='Registrar abono');
 assert.equal(paymentPost.parameters.method,'POST');
 assert.deepEqual(w.connections['Continuar con registro (#37)'].main[0].map(x=>x.node),['Preparar solicitud de abono (#37)']);
 assert.deepEqual(w.connections['¿Solicitud de abono válida? (#37)'].main.map(xs=>xs.map(x=>x.node)),[
  ['Registrar abono'],['Revisar pago (#38)']
 ]);
 assert.deepEqual(w.connections['Preparar aviso de revisión (#38)'].main[0].map(x=>x.node),['Avisar a la tienda para revisar el pago']);
 assert.equal(w.settings.errorWorkflow,JSON.parse(fs.readFileSync(path.join(root,'workflows/08-error-workflow.json'),'utf8')).id);
});
