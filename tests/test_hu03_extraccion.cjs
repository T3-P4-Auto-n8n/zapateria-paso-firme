const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const exported=path.join(root,'workflows/03-abonos-distancia-extraccion.json');
function workflow(){return JSON.parse(fs.readFileSync(exported,'utf8'));}
function run(name,input,prior={}){
 const code=workflow().nodes.find(n=>n.name===name).parameters.jsCode;
 return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+code+'\n})()',{
  $json:input,$:name=>({item:{json:prior[name]}})
 }).json));
}
const cases=[
 ['01_bizum_carmen','CARMEN RUIZ GARCIA',10,'zuecos'],
 ['02_bizum_jorge','JORGE M.',20,'apartado 2 bota'],
 ['03_transferencia_lucia','LUCIA GOMEZ PEREZ',12,'Liquidar mocasines'],
 ['04_bizum_laura','LAURA O.',15,'deportivas'],
 ['05_bizum_romero','ROMERO D',10,''],
 ['06_bizum_paula','PAULA RAMOS LEON',20,'zapatillas running perdón por el retraso'],
 ['07_transferencia_desconocido','ANTONIO FERNANDEZ SOTO',25,'botas'],
 ['09_bizum_silvia','SILVIA CORTES',5,'abono sandalias']
];
function input(file){
 const raw=fs.readFileSync(path.join(root,'data/correos',file+'.eml'),'utf8');
 const [headers,...body]=raw.split('\n\n');
 return {referencia:file,asunto:headers.match(/^Subject: (.*)$/m)[1],cuerpo:body.join('\n\n')};
}
function prepared(file){
 const normalized=run('Normalizar entrada de correo',input(file));
 const filtered=run('Filtrar aviso bancario',normalized);
 return run('Preparar correo',filtered);
}
const response=data=>({statusCode:200,body:{choices:[{message:{content:JSON.stringify(data)}}]}});

test('eight payment fixtures preserve exact payer, amount and concept through exported extraction validation',()=>{
 for(const [file,ordenante,importe,concepto] of cases){
  const p=prepared(file);
  assert.equal(p.ruta,'extraer',file);
  assert.deepEqual(JSON.parse(p.texto_ia),{ordenante,importe:importe.toFixed(2).replace('.',',')+' EUR',concepto});
  const result=run('Validar extracción',response({ordenante,importe,concepto}),{'Preparar correo':p});
  assert.equal(result.ruta,'buscar',file);
  assert.equal(result.ordenante,ordenante);
  assert.equal(result.importe,importe);
  assert.equal(result.concepto,concepto);
  assert(!p.texto_ia.includes('4821'));
  assert(!p.texto_ia.includes('@'));
 }
});
test('hallucinations, invalid schemas, negative amounts and truncated JSON require review',()=>{
 const p=prepared('01_bizum_carmen');
 for(const data of [null,[],{}, {ordenante:'CARMEN RUIZ GARCIA',importe:99,concepto:'zuecos'},
  {ordenante:'CARMEN RUIZ GARCIA',importe:'10',concepto:'zuecos'},
  {ordenante:'CARMEN RUIZ GARCIA',importe:-10,concepto:'zuecos'},
  {ordenante:'CARMEN RUIZ GARCIA',importe:10,concepto:'zuecos',decision:'registrar'}]){
  assert.equal(run('Validar extracción',response(data),{'Preparar correo':p}).ruta,'revisar');
 }
 assert.equal(run('Validar extracción',{statusCode:200,body:{choices:[{message:{content:'{"ordenante":'}}]}},{'Preparar correo':p}).ruta,'revisar');
});
test('advertisement stops at the filter while provider outages fail the extraction stage',()=>{
 const normalized=run('Normalizar entrada de correo',input('08_publicidad_banco'));
 assert.equal(run('Filtrar aviso bancario',normalized).ruta,'ignorar');
 const prior={'Preparar correo':prepared('01_bizum_carmen')};
 assert.throws(()=>run('Validar extracción',{statusCode:429,body:{}},prior),/Error técnico/);
});
test('partial extraction export cannot register a payment or send a duplicate receipt',()=>{
 const w=workflow();
 const handler=JSON.parse(fs.readFileSync(path.join(root,'workflows/08-error-workflow.json'),'utf8'));
 assert.equal(w.settings.errorWorkflow,handler.id);
 assert.equal(w.active,false);
 assert(w.nodes.find(n=>n.type.endsWith('.emailReadImap')).disabled);
 const requests=w.nodes.filter(n=>n.type.endsWith('.httpRequest'));
 assert.equal(requests.length,1);
 assert.equal(requests[0].parameters.url,'https://api.groq.com/openai/v1/chat/completions');
 assert.equal(requests[0].credentials.groqApi.name,'Groq');
 assert(!w.nodes.some(n=>n.type.endsWith('.emailSend')));
 assert.equal(w.connections['¿Es un pago?'].main[0][0].node,'Preparar correo');
 assert.equal(w.connections['¿Extracción válida?'].main[0][0].node,'Continuar con búsqueda (#35)');
 assert.equal(w.connections['¿Extracción válida?'].main[1][0].node,'Revisar extracción (#38)');
 const promptBody=requests[0].parameters.jsonBody;
 const evaluated=vm.runInNewContext(promptBody.slice(3,-3),{$json:prepared('01_bizum_carmen')});
 const request=JSON.parse(evaluated);
 assert.equal(request.response_format.type,'json_object');
 assert.equal(request.temperature,0);
 assert.deepEqual(Object.keys(JSON.parse(request.messages[1].content)).sort(),['concepto','importe','ordenante']);
});
