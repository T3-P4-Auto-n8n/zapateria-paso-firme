const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=name=>fs.existsSync(path.join(root,`scripts/hu04/${name}.js`))?fs.readFileSync(path.join(root,`scripts/hu04/${name}.js`),'utf8'):'return [];';
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'payloads/hu04/mixto.json')));
function day(input={},now='2026-10-26T23:05:00Z'){
 return new Function('$input','$now',code('calcular-dia'))({first:()=>({json:input})},{toISO:()=>now});
}
function report(ventas=fixture.ventas,abonos=fixture.abonos,fecha=fixture.fecha){
 const entries={'Calcular día':[{json:{fecha}}],'Leer ventas del día':ventas.map(json=>({json})),'Leer abonos del día':abonos.map(json=>({json}))};
 return new Function('$',code('preparar-cierre'))(name=>({first:()=>entries[name][0],all:()=>entries[name]}));
}
test('mixed sales and initial/subsequent abonos reconcile per method without double counting',()=>{
 const result=report();assert.equal(result.length,1);const r=result[0].json;
 assert.deepEqual(r.fila,{fecha:'2026-10-26',ventas_efectivo:10.1,ventas_tarjeta:20.2,ventas_bizum:30.3,ventas_total:60.6,ventas_operaciones:3,abonos_efectivo:5,abonos_tarjeta:2.25,abonos_bizum:1.15,abonos_total:8.4,abonos_operaciones:3,total_efectivo:15.1,total_tarjeta:22.45,total_bizum:31.45,total:69,operaciones:6,sin_movimientos:false});
 assert.equal(r.asunto,'Cierre de 2026-10-26: 69.00 € recaudados');
 for(const label of ['Ventas directas','Abonos','Efectivo','Tarjeta','Bizum','69.00'])assert.ok(r.html.includes(label));
});
test('both empty API lists and Always Output Data placeholders produce a deliverable zero close',()=>{
 for(const [v,a] of [[[],[]],[[{}],[{}]]]){
  const r=report(v,a)[0]?.json;assert.ok(r);assert.equal(r.fila.total,0);assert.equal(r.fila.operaciones,0);assert.equal(r.fila.sin_movimientos,true);assert.match(r.html,/No hubo movimientos el 2026-10-26/);
 }
});
test('one empty source does not suppress the other source and decimal cents sum exactly',()=>{
 const sales=[{id:1,fecha:fixture.fecha,importe:0.1,forma_pago:'efectivo'},{id:2,fecha:fixture.fecha,importe:0.2,forma_pago:'efectivo'}];
 assert.equal(report(sales,[])[0]?.json.fila.total,0.3);
 assert.equal(report([],fixture.abonos)[0]?.json.fila.total,8.4);
});
test('bad payment data cannot become a plausible understated closing',()=>{
 const valid=fixture.ventas[0];
 for(const patch of [{importe:-1},{importe:null},{importe:'10'},{importe:1.001},{importe:Infinity},{forma_pago:'transferencia'},{fecha:'2026-10-25'},{id:null}])assert.throws(()=>report([{...valid,...patch}],[]),/inválid|fecha|pago/i);
 assert.throws(()=>report([valid,valid],[]),/duplicad/i);
 assert.throws(()=>report([{error:'fallo'}],[]),/inválid/i);
});
test('scheduled date uses yesterday in Madrid across year and daylight saving boundaries',()=>{
 for(const [now,want] of [['2025-12-31T23:05:00Z','2025-12-31'],['2026-03-29T22:05:00Z','2026-03-29'],['2026-10-25T23:05:00Z','2026-10-25']])assert.deepEqual(day({},now),[{json:{fecha:want,desde:want,hasta:want}}]);
});
test('manual date is preserved and invalid form input never silently runs a different day',()=>{
 assert.deepEqual(day({fecha:'2024-02-29'}),[{json:{fecha:'2024-02-29',desde:'2024-02-29',hasta:'2024-02-29'}}]);
 for(const fecha of ['','2026-02-29','2026-13-01','27/10/2026',null,'<script>'])assert.throws(()=>day({fecha}),/fecha/i);
});
test('export keeps both GETs on the same full day and persists before sending the original report',()=>{
 const file=path.join(root,'workflows/05-cierre-diario.json');assert.ok(fs.existsSync(file),'workflow export missing');
 const w=JSON.parse(fs.readFileSync(file));const n=name=>w.nodes.find(x=>x.name===name);
 assert.equal(w.active,false);assert.equal(w.settings.timezone,'Europe/Madrid');
 for(const name of ['Leer ventas del día','Leer abonos del día']){
  const http=n(name);assert.equal(http.parameters.method,'GET');assert.equal(http.executeOnce,true);assert.equal(http.alwaysOutputData,true);
  assert.deepEqual(http.parameters.queryParameters.parameters.map(x=>x.name),['desde','hasta']);assert.equal(http.onError,undefined);
 }
 assert.equal(n('Guardar cierre en Sheets').parameters.operation,'appendOrUpdate');
 assert.deepEqual(n('Guardar cierre en Sheets').parameters.columns.matchingColumns,['fecha']);
 assert.deepEqual(w.connections['Preparar cierre'].main[0].map(x=>x.node),['Guardar cierre en Sheets']);
 assert.deepEqual(w.connections['Guardar cierre en Sheets'].main[0].map(x=>x.node),['Enviar cierre diario']);
 assert.match(n('Enviar cierre diario').parameters.html,/Preparar cierre/);
 for(const [name,source] of [['Calcular día','calcular-dia'],['Preparar cierre','preparar-cierre']])assert.equal(n(name).parameters.jsCode,code(source));
});
test('live API snapshots reconcile with independent Decimal controls',()=>{
 for(const file of ['api-2026-10-26.json','api-sin-movimientos.json']){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'payloads/hu04',file)));
  const r=report(data.ventas,data.abonos,data.fecha)[0].json;
  assert.equal(r.total,data.reference.total);
  for(const kind of ['ventas','abonos'])for(const key of ['efectivo','tarjeta','bizum','total','operaciones'])assert.equal(r.fila[`${kind}_${key}`],data.reference[kind][key]);
 }
});
