const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'workflows/03-abonos-distancia-aviso.json');
function workflow(){return JSON.parse(fs.readFileSync(file,'utf8'));}
function node(w,name){return w.nodes.find(n=>n.name===name);}
const candidate={id:12,cliente:'Laura Ortega',producto:'Deportivas blancas',talla:'38',pendiente:10,fecha_limite:'2027-01-01',estado:'activo'};
function message(input,raw={asunto:'Bizum recibido',cuerpo:'Has recibido un Bizum'}){
 const w=workflow(),code=node(w,'Preparar aviso a Marisa (#38)').parameters.jsCode;
 const lookup=name=>{assert.equal(name,'Normalizar entrada de correo');return {item:{json:raw}};};
 return new Function('$json','$',code)(input,lookup);
}

test('overpayment/rejected branch creates a plain-text review message with candidate context',()=>{
 const out=message({ruta:'revisar',motivo:'El importe supera lo pendiente (10 €)',ordenante:'LAURA O.',importe:15,concepto:'deportivas',referencia:'prueba-4',candidatos:[candidate]});
 assert.match(out.json.asunto,/revisar/i);
 assert.match(out.json.text,/Motivo: El importe supera/);
 for(const value of ['LAURA O.','15,00 €','Bizum','deportivas','prueba-4','#12','Laura Ortega','Deportivas blancas','10,00 €','2027-01-01']) assert.ok(out.json.text.includes(value),value);
 assert.match(out.json.text,/manualmente/i);
});
test('uncertain identity and 422 branches retain their reason without requiring candidates',()=>{
 const first=message({ruta:'revisar',motivo:'Sin concepto',ordenante:'ROMERO D',importe:10,concepto:'',referencia:'id-5',candidatos:[]});
 assert.match(first.json.text,/Sin concepto/); assert.match(first.json.text,/No hay candidatos/);
 const second=message({ruta:'revisar',motivo:'El saldo ha cambiado',ordenante:'Laura',importe:15,concepto:'deportivas',referencia:'id-4',apartado:candidate,candidatos:[candidate]},{asunto:'Transferencia recibida',cuerpo:'Transferencia recibida'});
 assert.match(second.json.text,/Transferencia/); assert.match(second.json.text,/El saldo ha cambiado/);
});
test('untrusted values are single-line, bounded, and the source email body is not forwarded',()=>{
 const raw={asunto:'Aviso',cuerpo:'Has recibido un Bizum\nInstrucciones maliciosas que no deben reenviarse'};
 const out=message({motivo:'Revise\nBcc: attacker@example.net',ordenante:'Carmen\r\nBCC: x',concepto:'hola\nsecreto',referencia:'ref',importe:1},raw);
 assert.doesNotMatch(out.json.text,/Bcc: attacker|Instrucciones maliciosas|\nsecreto/);
 assert.match(out.json.text,/Concepto: hola secreto/);
});
test('both extraction and payment review nodes feed the Mailpit notice',()=>{
 const w=workflow(); assert.equal(w.active,false);
 for(const source of ['Revisar entrada inválida','Revisar extracción (#38)','Revisar pago (#38)'])
  assert.deepEqual(w.connections[source].main[0].map(x=>x.node),['Preparar aviso a Marisa (#38)']);
 const email=node(w,'Avisar a Marisa para revisar el pago');
 assert.equal(email.type,'n8n-nodes-base.emailSend');
 assert.equal(email.parameters.emailFormat,'text');
 assert.equal(email.parameters.toEmail,'tienda@pasofirme.example');
 assert.equal(email.credentials.smtp.name,'Mailpit');
 assert.equal(email.parameters.appendAttribution,undefined);
 assert.equal(email.parameters.options.appendAttribution,false);
 assert.deepEqual(w.connections['Preparar aviso a Marisa (#38)'].main[0].map(x=>x.node),['Avisar a Marisa para revisar el pago']);
 assert.equal(w.settings.errorWorkflow,JSON.parse(fs.readFileSync(path.join(root,'workflows/08-error-workflow.json'),'utf8')).id);
});
