const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'workflows/03-abonos-distancia.json');
function workflow(){return JSON.parse(fs.readFileSync(file,'utf8'));}
function node(w,name){return w.nodes.find(n=>n.name===name);}
const FixedDate=class extends Date { constructor(...args){super(...(args.length?args:['2026-10-26T12:00:00+01:00']));} };
function decide(extraction,body,statusCode=200){
 const w=workflow();
 const code=node(w,'Decidir apartado (#36)').parameters.jsCode;
 const getNode=name=>{assert.equal(name,'Validar extracción');return {item:{json:extraction}};};
 return new Function('$json','$','Date',code)({statusCode,body},getNode,FixedDate);
}
const apart=(id,cliente,producto,rest={})=>({id,cliente,producto,talla:'38',precio:50,abonado:20,pendiente:30,
 fecha_limite:'2027-01-01',estado:'activo',...rest});
const base={referencia:'fixture.eml',asunto:'Bizum recibido',ordenante:'CARMEN RUIZ GARCIA',importe:10,concepto:'zuecos',apartado_id:null};

test('one uniquely matching payer and product within deadline is handed to #37',()=>{
 const out=decide(base,[apart(1,'Carmen Ruiz','Zuecos')]);
 assert.equal(out.json.decision,'registrar'); assert.equal(out.json.apartado.id,1);
 assert.equal(out.json.candidatos.length,1);
});
test('empty concept, zero/multiple/contradictory candidates require review',()=>{
 assert.equal(decide({...base,concepto:''},[apart(1,'Carmen Ruiz','Zuecos')]).json.decision,'revisar');
 assert.equal(decide(base,[]).json.decision,'revisar');
 assert.equal(decide(base,[apart(1,'Carmen Ruiz','Zuecos'),apart(2,'Carmen Ruiz','Zuecos')]).json.decision,'revisar');
 assert.equal(decide(base,[apart(1,'Lucia Gomez','Zuecos')]).json.decision,'revisar');
});
test('payer initials and accents can match; a product keyword must also match',()=>{
 const out=decide({...base,ordenante:'SILVIA C.' ,concepto:'abono sandalias'},[apart(24,'Silvia Cortés','Sandalia')]);
 assert.equal(out.json.decision,'registrar');
 assert.equal(decide({...base,concepto:'mocasines'},[apart(1,'Carmen Ruiz','Zuecos')]).json.decision,'revisar');
 assert.equal(decide({...base,concepto:'bot'},[apart(1,'Carmen Ruiz','Botas')]).json.decision,'revisar');
});
test('expired, inactive, and over-balance candidates require review',()=>{
 assert.equal(decide(base,[apart(1,'Carmen Ruiz','Zuecos',{fecha_limite:'2026-10-25'})]).json.decision,'revisar');
 assert.equal(decide(base,[apart(1,'Carmen Ruiz','Zuecos',{estado:'liquidado'})]).json.decision,'revisar');
 assert.equal(decide({...base,importe:31},[apart(1,'Carmen Ruiz','Zuecos',{pendiente:30})]).json.decision,'revisar');
});
test('explicit-id 404 goes to review without substituting another candidate',()=>{
 const out=decide({...base,apartado_id:1}, {detail:'Not found'},404);
 assert.equal(out.json.decision,'revisar'); assert.deepEqual(out.json.candidatos,[]);
});
test('authorization and server errors remain technical failures for workflow 08',()=>{
 assert.throws(()=>decide(base,[],401),/HTTP 401/);
 assert.throws(()=>decide(base,[],503),/HTTP 503/);
});
test('workflow sends only registrar to the guarded #37 POST and review to the store email',()=>{
 const w=workflow();
 assert.equal(w.active,false);
 assert.deepEqual(w.connections['Buscar apartado'].main[0].map(x=>x.node),['Resultados de búsqueda']);
 assert.deepEqual(w.connections['Resultados de búsqueda'].main[0].map(x=>x.node),['Decidir apartado (#36)']);
 assert.deepEqual(w.connections['¿Se puede registrar? (#36)'].main.map(xs=>xs.map(x=>x.node)),[
  ['Continuar con registro (#37)'],['Revisar pago (#38)']
 ]);
 const groq=node(w,'Extraer datos con Groq'),payment=node(w,'Registrar abono');
 assert.equal(groq.parameters.method,'POST');
 assert.equal(payment.parameters.method,'POST');
 assert.deepEqual(w.connections['¿Solicitud de abono válida? (#37)'].main.map(xs=>xs.map(x=>x.node)),[
  ['Registrar abono'],['Revisar pago (#38)']
 ]);
 assert.deepEqual(w.connections['Revisar pago (#38)'].main[0].map(x=>x.node),['Preparar aviso de revisión (#38)']);
 assert(w.nodes.some(n=>n.type==='n8n-nodes-base.emailSend'));
});
