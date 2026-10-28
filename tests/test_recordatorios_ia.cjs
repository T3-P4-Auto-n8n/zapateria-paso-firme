const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const base={id:25,apartado_id:25,dias:7,hoy:'2026-10-28',cliente:'Nora Prueba',para:'nora.prueba@example.com',pendiente:40,fecha_limite:'2026-11-04',asunto:'Tu apartado vence en 7 días',texto:'Hola Nora:\n\nPendiente: 40.00 €\nFecha límite: 04/11/2026\nApartado 25\nTalla: 39'};
function run(file,input,prior={}){
 const p=path.join(root,'scripts/hu06',file);assert(fs.existsSync(p),'Missing '+file);
 return JSON.parse(JSON.stringify(vm.runInNewContext('(function(){'+fs.readFileSync(p,'utf8')+'\n})()',{$json:input,$:()=>({item:{json:prior}})}).json));
}
const response=content=>({statusCode:200,body:{choices:[{message:{content:JSON.stringify(content)}}]}});
test('AI receives no customer, amount, date or email',()=>{
 const out=run('preparar-redaccion.js',base);assert(out.prompt_ia);for(const value of ['Nora','40','2026','example.com','25']) assert(!out.prompt_ia.includes(value));assert.equal(out.texto,base.texto);
});
test('AI prose wraps immutable financial details without changing recipients or subject',()=>{
 const out=run('validar-redaccion.js',response({introduccion:'Te escribimos con cariño para cuidar de tu apartado.',despedida:'Nos encantará verte por la tienda.'}),base);
 assert.equal(out.redaccion_ia,'aceptada');assert(out.texto.includes(base.texto));assert.equal(out.para,base.para);assert.equal(out.asunto,base.asunto);assert.equal(out.pendiente,40);assert.equal(out.fecha_limite,base.fecha_limite);
});
test('numeric, financial, time and markup claims fall back to original text',()=>{
 for(const intro of ['Paga 20 € mañana.','Quedan cuarenta euros.','Te quedan siete días.','vence mañana','<b>Hola</b>','Visita https://evil.example','Son veinte céntimos','Hola\u0000']){
  const out=run('validar-redaccion.js',response({introduccion:intro,despedida:'Gracias por confiar en nuestra tienda.'}),base);assert.equal(out.redaccion_ia,'plantilla',intro);assert.equal(out.texto,base.texto);
 }
});
test('provider failure, malformed response and extra keys keep original reminder',()=>{
 for(const value of [{statusCode:429,body:{}},{error:'timeout'},{statusCode:200,body:{choices:null}},response({introduccion:'Hola',despedida:'Gracias',importe:5}),response(null)]){
  const out=run('validar-redaccion.js',value,base);assert.equal(out.texto,base.texto);assert.equal(out.redaccion_ia,'plantilla');
 }
});
test('exported HTTP request sends generic instructions only',()=>{
 const w=JSON.parse(fs.readFileSync(path.join(root,'workflows/06-recordatorios-y-vencimientos.json'),'utf8'));
 const prepared=run('preparar-redaccion.js',base);
 const http=w.nodes.find(n=>n.name==='Redactar con Groq');
 const payload=JSON.parse(vm.runInNewContext(http.parameters.jsonBody.slice(3,-3),{$json:prepared}));
 const messages=JSON.stringify(payload.messages);
 for(const value of [base.cliente,base.para,String(base.pendiente),base.fecha_limite,base.texto]) assert(!messages.includes(value));
 assert.deepEqual(Object.keys(payload.messages[0]).sort(),['content','role']);
 assert.equal(payload.messages[0].content,prepared.prompt_ia);
 assert.equal(http.onError,'continueRegularOutput');
 for(const [name,file] of [['Preparar redacción del recordatorio','preparar-redaccion.js'],['Validar redacción del recordatorio','validar-redaccion.js']]){
  const node=w.nodes.find(n=>n.name===name); assert.equal(node.parameters.mode,'runOnceForEachItem');assert.equal(node.parameters.jsCode,fs.readFileSync(path.join(root,'scripts/hu06',file),'utf8'));
 }
});
