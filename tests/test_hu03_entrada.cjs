const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root,'workflows/03-abonos-distancia-entrada.json'),'utf8'));
const normalizer = workflow.nodes.find(n => n.type === 'n8n-nodes-base.code');
const normalize = input => JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+normalizer.parameters.jsCode+'\n})()',{$json:input}).json));

test('both inputs preserve all nine email subjects and bodies for the next task', () => {
 const files=fs.readdirSync(path.join(root,'data/correos')).filter(n=>n.endsWith('.eml')).sort();
 assert.equal(files.length,9);
 for (const [i,file] of files.entries()) {
  const raw=fs.readFileSync(path.join(root,'data/correos',file),'utf8').replace(/\r\n/g,'\n');
  const [headers,...body]=raw.split('\n\n');
  const subject=headers.match(/^Subject: (.*)$/m)[1];
  const text=body.join('\n\n');
  const form=normalize({referencia:file,asunto:subject,cuerpo:text,submittedAt:'2026-10-24T12:00:00Z'});
  const imap=normalize({subject,textPlain:text,textHtml:'<b>do not use</b>',metadata:{'message-id':'<correo-'+i+'@pasofirme.example>'},attributes:{uid:i+1},from:'Banco Ejemplo',to:'tienda@pasofirme.example'});
  assert.deepEqual(form,{origen:'formulario',referencia:file,asunto:subject,cuerpo:text,entrada_valida:true,motivo:''});
  assert.deepEqual(imap,{origen:'imap',referencia:'<correo-'+i+'@pasofirme.example>',asunto:subject,cuerpo:text,entrada_valida:true,motivo:''});
 }
});
test('resolved/plain email payload keeps its explicit Message-ID and line breaks', () => {
 const result=normalize({subject:'Bizum',text:'línea 1\r\nlínea 2',messageId:'<id@example.com>'});
 assert.equal(result.cuerpo,'línea 1\nlínea 2');
 assert.equal(result.referencia,'<id@example.com>');
 assert.equal(result.entrada_valida,true);
});
test('invalid and HTML-only input cannot be mistaken for a usable bank email', () => {
 for (const input of [
  {},{asunto:'Pago',cuerpo:'   ',referencia:'prueba'},
  {asunto:'Pago',cuerpo:{text:'not a string'},referencia:'prueba'},
  {asunto:'Pago',cuerpo:'cuerpo',referencia:''},
  {subject:'Pago',textPlain:'cuerpo'},
  {asunto:'x'.repeat(999),cuerpo:'cuerpo',referencia:'id'},
  {subject:'Pago',textHtml:'<p>solo HTML</p>',metadata:{'message-id':'id'}},
  {subject:'Pago',textPlain:'cuerpo',metadata:{'message-id':['id1','id2']}},
  {asunto:'Pago',cuerpo:'x'.repeat(20001),referencia:'id'},
  {asunto:'Pago',cuerpo:'cuerpo',referencia:'x'.repeat(301)},
 ]) {
  const result=normalize(input);
  assert.equal(result.entrada_valida,false);
  assert(result.motivo.length>0);
 }
});
test('exact size limits remain usable without dropping email content', () => {
 const result=normalize({asunto:'s'.repeat(998),cuerpo:'c'.repeat(20000),referencia:'r'.repeat(300)});
 assert.equal(result.entrada_valida,true);
 assert.equal(result.asunto.length,998);
 assert.equal(result.cuerpo.length,20000);
 assert.equal(result.referencia.length,300);
});
test('normalization does not filter advertising, extract a payment or pass through unrelated data', () => {
 const result=normalize({asunto:'Publicidad',cuerpo:'Oferta: hasta 150 EUR',referencia:'ad',binary:{secret:'attachment'},password:'never pass this',importe:150});
 assert.equal(result.entrada_valida,true);
 assert.equal(result.cuerpo,'Oferta: hasta 150 EUR');
 assert.deepEqual(Object.keys(result).sort(),['asunto','cuerpo','entrada_valida','motivo','origen','referencia']);
});
test('the exported boundary is inactive, both triggers reach the same normalizer, and there are no write-capable nodes', () => {
 assert.equal(workflow.active,false);
 for (const trigger of workflow.nodes.filter(n=>['n8n-nodes-base.formTrigger','n8n-nodes-base.emailReadImap'].includes(n.type))) {
  assert.equal(workflow.connections[trigger.name].main[0][0].node,normalizer.name);
 }
 const form=workflow.nodes.find(n=>n.type==='n8n-nodes-base.formTrigger');
 assert(form.parameters.formFields.values.some(f=>f.fieldLabel==='cuerpo' && f.fieldType==='textarea' && f.requiredField));
 assert(!('path' in form.parameters));
 assert(form.parameters.options.path);
 const imap=workflow.nodes.find(n=>n.type==='n8n-nodes-base.emailReadImap');
 assert.equal(imap.disabled,true);
 assert.equal(imap.parameters.downloadAttachments,false);
 assert.equal(imap.parameters.format,'simple');
 assert(workflow.nodes.every(n=>['formTrigger','emailReadImap','code','stickyNote'].some(t=>n.type==='n8n-nodes-base.'+t)));
});
