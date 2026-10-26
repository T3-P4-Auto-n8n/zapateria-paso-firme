const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'workflows/03-abonos-distancia-registro.json');
function workflow(){return JSON.parse(fs.readFileSync(file,'utf8'));}
function node(w,name){return w.nodes.find(n=>n.name===name);}
const approved={decision:'registrar',importe:10,apartado:{id:1,estado:'activo',pendiente:20,fecha_limite:'2027-01-01'},referencia:'test.eml'};
function prepare(input){const w=workflow();return new Function('$json',node(w,'Preparar solicitud de abono (#37)').parameters.jsCode)(input);}
function response(input,statusCode,body,error){
 const w=workflow();
 const code=node(w,'Validar respuesta del abono (#37)').parameters.jsCode;
 const lookup=name=>{assert.equal(name,'Preparar solicitud de abono (#37)');return {item:{json:input}};};
 return new Function('$json','$',code)({statusCode,body,error},lookup);
}

test('request preparation allows only an approved safe payment and forces bizum',()=>{
 const out=prepare(approved);
 assert.equal(out.json.apartado_id,1); assert.deepEqual(out.json.body,{importe:10,forma_pago:'bizum'});
 for(const bad of [
  {...approved,decision:'revisar'}, {...approved,apartado:{...approved.apartado,id:'x'}},
  {...approved,importe:0}, {...approved,importe:21}, {...approved,apartado:{...approved.apartado,estado:'liquidado'}},
  {...approved,apartado:{...approved.apartado,fecha_limite:'2026-10-25'}},
 ]) assert.equal(prepare(bad).json.ruta,'revisar');
});
test('POST uses the matched ID, API Tienda credential, 422-preserving response, and no retry',()=>{
 const w=workflow(),request=node(w,'Registrar abono');
 assert.equal(request.parameters.method,'POST');
 assert.equal(request.parameters.url,"={{ 'http://tienda:8000/api/apartados/' + $json.apartado_id + '/abonos' }}");
 assert.equal(request.parameters.authentication,'genericCredentialType');
 assert.equal(request.parameters.genericAuthType,'httpHeaderAuth');
 assert.equal(request.credentials.httpHeaderAuth.name,'API Tienda');
 assert.equal(request.parameters.jsonBody,"={{ JSON.stringify($json.body) }}");
 assert.equal(request.parameters.options.response.response.fullResponse,true);
 assert.equal(request.parameters.options.response.response.neverError,true);
 assert.equal(request.onError,'continueRegularOutput');
 assert.equal(request.retryOnFail,false);
});
test('HTTP 201 completes via HU-02 webhook without creating a duplicate receipt',()=>{
 const out=response(prepare(approved).json,201,{id:1,estado:'activo',pendiente:10});
 assert.equal(out.json.resultado_pago,'registrado'); assert.equal(out.json.apartado_actualizado.id,1);
});
test('HTTP 422 routes to review with the API business reason and no success state',()=>{
 const out=response(prepare(approved).json,422,{detail:'El importe supera lo pendiente (5 €)'});
 assert.equal(out.json.ruta,'revisar'); assert.match(out.json.motivo,/supera lo pendiente/);
 assert.notEqual(out.json.resultado_pago,'registrado');
});
test('HTTP 404 after decision routes to review rather than retrying or claiming success',()=>{
 const out=response(prepare(approved).json,404,{detail:'Not found'});
 assert.equal(out.json.ruta,'revisar'); assert.match(out.json.motivo,/no encuentra el apartado/);
});
test('HTTP auth/server and transport errors throw to workflow 08',()=>{
 for(const status of [401,500,503]) assert.throws(()=>response(approved,status,{detail:'failure'}),new RegExp(`HTTP ${status}`));
 assert.throws(()=>response(approved,undefined,undefined,{message:'socket timeout'}),/error técnico/i);
});
test('workflow wires only approved requests, success and 422 review; no email or automatic retry',()=>{
 const w=workflow(); assert.equal(w.active,false);
 assert.deepEqual(w.connections['Continuar con registro (#37)'].main[0].map(x=>x.node),['Preparar solicitud de abono (#37)']);
 assert.deepEqual(w.connections['¿Registrado? (#37)'].main.map(xs=>xs.map(x=>x.node)),[
  ['Fin tras éxito HU-02 (#37)'],['Revisar pago (#38)']
 ]);
 const posts=w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'&&n.parameters.method==='POST');
 assert.equal(posts.length,2); // Groq extraction plus payment registration
 assert(!w.nodes.some(n=>n.type==='n8n-nodes-base.emailSend'));
 assert.equal(w.settings.errorWorkflow,JSON.parse(fs.readFileSync(path.join(root,'workflows/08-error-workflow.json'),'utf8')).id);
});
