const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const workflow=JSON.parse(fs.readFileSync(path.join(root,'workflows/03-abonos-distancia-filtro.json'),'utf8'));
const run=(name,input)=>JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+workflow.nodes.find(n=>n.name===name).parameters.jsCode+'\n})()',{$json:input}).json));
const filter=input=>run('Filtrar aviso bancario',input);
const valid={origen:'formulario',referencia:'prueba-1',asunto:'Has recibido un Bizum',cuerpo:'Aviso recibido',entrada_valida:true,motivo:''};

test('eight bank-payment examples reach extraction and bank advertising is ignored',()=>{
 const files=fs.readdirSync(path.join(root,'data/correos')).filter(f=>f.endsWith('.eml')).sort();
 assert.equal(files.length,9);
 for(const file of files){
  const raw=fs.readFileSync(path.join(root,'data/correos',file),'utf8').replace(/\r\n/g,'\n');
  const [headers,...body]=raw.split('\n\n');
  const source={referencia:file,asunto:headers.match(/^Subject: (.*)$/m)[1],cuerpo:body.join('\n\n')};
  const normalized=run('Normalizar entrada de correo',source);
  const result=filter(normalized);
  assert.equal(result.ruta,file==='08_publicidad_banco.eml'?'ignorar':'extraer',file);
  assert.equal(result.cuerpo,source.cuerpo);
  assert.equal(result.referencia,file);
  assert(!('importe' in result));
 }
});
test('invalid input goes to review even when it contains a payment phrase',()=>{
 for(const flag of [false,undefined,'true']){
  const result=filter({...valid,entrada_valida:flag,motivo:'Falta referencia'});
  assert.equal(result.ruta,'revisar');
  assert.equal(result.es_pago,false);
  assert(result.motivo);
 }
});
test('outgoing payments, generic transfers and promotional amounts are not received payments',()=>{
 for(const text of ['Has enviado un Bizum de 10 EUR','Transferencia emitida por 20 EUR','Hasta 150 EUR por domiciliar tus cobros','Consulta nuestras tarifas de transferencia']){
  const result=filter({...valid,asunto:text,cuerpo:text});
  assert.equal(result.ruta,'ignorar');
  assert.equal(result.es_pago,false);
 }
});
test('a received-payment notice missing extraction fields still reaches the extraction stage',()=>{
 const result=filter({...valid,asunto:'AVISO DE TRANSFERENCIA RECIBIDA',cuerpo:'Datos pendientes de extraer'});
 assert.equal(result.ruta,'extraer');
 assert.equal(result.es_pago,true);
 assert(!('ordenante' in result));
});
test('both sources feed the filter and its named outputs have explicit destinations',()=>{
 const connections=workflow.connections;
 assert.equal(connections['Normalizar entrada de correo'].main[0][0].node,'Filtrar aviso bancario');
 assert.equal(connections['Filtrar aviso bancario'].main[0][0].node,'¿Es un pago?');
 const targets=connections['¿Es un pago?'].main.map(o=>o[0].node);
 assert.deepEqual(targets,['Continuar con extracción (#34)','Ignorar publicidad','Revisar entrada inválida','Revisar entrada inválida']);
 assert.equal(workflow.active,false);
 assert(!workflow.nodes.some(n=>['n8n-nodes-base.httpRequest','n8n-nodes-base.emailSend'].includes(n.type)));
});
