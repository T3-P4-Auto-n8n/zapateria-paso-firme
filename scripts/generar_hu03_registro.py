"""Genera la etapa segura de registro de abono HU-03 (#37)."""
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]


def node(name, kind, params, position, version=1, **extra):
    return {'name':name,'id':str(uuid5(NAMESPACE_URL,'pasofirme/hu03/registro/'+name)),
            'type':'n8n-nodes-base.'+kind,'typeVersion':version,'position':position,
            'parameters':params,**extra}


PREPARE_CODE = r'''// #37: repetir las comprobaciones críticas antes de construir el POST.
const e = $json;
const revisar = motivo => ({json:{...e,ruta:'revisar',motivo_decision:motivo}});
if (e.decision !== 'registrar') return revisar('La decisión previa no autorizó el registro');
if (!e.apartado || !Number.isSafeInteger(Number(e.apartado.id)) || Number(e.apartado.id) <= 0)
  return revisar('Falta un ID de apartado válido');
if (e.apartado.estado !== 'activo') return revisar('El apartado ya no está activo');
const limite = typeof e.apartado.fecha_limite === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.apartado.fecha_limite) ? e.apartado.fecha_limite : '';
const hoy = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date());
if (!limite || hoy > limite) return revisar('El apartado está fuera de plazo o carece de fecha límite válida');
const importe = Number(e.importe), pendiente = Number(e.apartado.pendiente);
if (!Number.isFinite(importe) || importe <= 0 || !Number.isFinite(pendiente) || pendiente < 0 || Math.round(importe*100) > Math.round(pendiente*100))
  return revisar('El importe ya no cabe en el pendiente actual');
return {json:{...e,ruta:'enviar',apartado_id:Number(e.apartado.id),body:{importe,forma_pago:'bizum'}}};
'''

RESPONSE_CODE = r'''// Un 422 es una regla de negocio; fallos técnicos deben alcanzar el Error Workflow 08.
const p = $('Preparar solicitud de abono (#37)').item.json;
if ($json.error || !Number.isInteger(Number($json.statusCode)))
  throw new Error('Error técnico de red al registrar el abono; no repetir automáticamente');
const status = Number($json.statusCode), body = $json.body;
if (status === 201) {
  if (!body || typeof body !== 'object' || Number(body.id) !== p.apartado_id)
    throw new Error('Respuesta 201 inesperada al registrar el abono; conciliar antes de reintentar');
  return {json:{...p,resultado_pago:'registrado',apartado_actualizado:body}};
}
if (status === 422) {
  const detail = typeof body?.detail === 'string' ? body.detail : 'La API rechazó el abono por una regla de negocio';
  return {json:{...p,ruta:'revisar',resultado_pago:'rechazado',motivo:detail}};
}
if (status === 404) return {json:{...p,ruta:'revisar',resultado_pago:'rechazado',motivo:'La API ya no encuentra el apartado; revisar antes de actuar'}};
throw new Error('Error técnico al registrar el abono (HTTP ' + status + '); no reintentar automáticamente');
'''


def build():
    workflow = json.loads((ROOT/'workflows/03-abonos-distancia-decision.json').read_text())
    workflow['name'] = '03 · Abonos a distancia (registro)'
    form = next(n for n in workflow['nodes'] if n['type'].endswith('.formTrigger'))
    form['parameters']['options']['path'] = 'hu03-registro'
    form['webhookId'] = str(uuid5(NAMESPACE_URL,'pasofirme/hu03/registro/form'))
    form['parameters']['formDescription'] = 'HU-03 · Prueba de registro simulada. El workflow está inactivo; no enviar pagos reales.'
    note = next(n for n in workflow['nodes'] if n['type'].endswith('.stickyNote'))
    note['name'] = 'Notas de registro HU-03'
    note['parameters']['content'] = ('## HU-03 · Registro (#37)\nBorrador parcial e inactivo. Asignar Groq y API Tienda y elegir el 08 local. '
        'Solo la salida aprobada de #36 puede llegar al POST. El 422 va a revisión (#38); 201 deja que el webhook de la tienda '
        'active el recibo HU-02. No hay reintentos ni correo duplicado. No ejecutar pruebas que escriban en la base real.')
    workflow['nodes'].extend([
        node('Preparar solicitud de abono (#37)','code',{'mode':'runOnceForEachItem','jsCode':PREPARE_CODE},[3800,-150],2),
        node('¿Solicitud de abono válida? (#37)','switch',{
            'rules':{'values':[{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},
                'conditions':[{'leftValue':'={{ $json.ruta }}','rightValue':'enviar','operator':{'type':'string','operation':'equals'}}],
                'combinator':'and'},'renameOutput':True,'outputKey':'enviar'}]},'options':{'fallbackOutput':'extra'}
        },[4050,-150],3.2),
        node('Registrar abono','httpRequest',{
            'method':'POST','url':"={{ 'http://tienda:8000/api/apartados/' + $json.apartado_id + '/abonos' }}",
            'authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth','sendBody':True,'specifyBody':'json',
            'jsonBody':'={{ JSON.stringify($json.body) }}',
            'options':{'timeout':30000,'response':{'response':{'fullResponse':True,'neverError':True,'responseFormat':'json'}}},
        },[4300,-150],4.5,credentials={'httpHeaderAuth':{'id':None,'name':'API Tienda'}},
            onError='continueRegularOutput',retryOnFail=False),
        node('Validar respuesta del abono (#37)','code',{'mode':'runOnceForEachItem','jsCode':RESPONSE_CODE},[4550,-150],2),
        node('¿Registrado? (#37)','switch',{
            'rules':{'values':[{'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},
                'conditions':[{'leftValue':'={{ $json.resultado_pago }}','rightValue':'registrado','operator':{'type':'string','operation':'equals'}}],
                'combinator':'and'},'renameOutput':True,'outputKey':'registrado'}]},'options':{'fallbackOutput':'extra'}
        },[4800,-150],3.2),
        node('Fin tras éxito HU-02 (#37)','noOp',{},[5050,-150]),
    ])
    workflow['connections']['Continuar con registro (#37)']={'main':[[{'node':'Preparar solicitud de abono (#37)','type':'main','index':0}]]}
    workflow['connections']['Preparar solicitud de abono (#37)']={'main':[[{'node':'¿Solicitud de abono válida? (#37)','type':'main','index':0}]]}
    workflow['connections']['¿Solicitud de abono válida? (#37)']={'main':[
        [{'node':'Registrar abono','type':'main','index':0}],
        [{'node':'Revisar pago (#38)','type':'main','index':0}],
    ]}
    workflow['connections']['Registrar abono']={'main':[[{'node':'Validar respuesta del abono (#37)','type':'main','index':0}]]}
    workflow['connections']['Validar respuesta del abono (#37)']={'main':[[{'node':'¿Registrado? (#37)','type':'main','index':0}]]}
    workflow['connections']['¿Registrado? (#37)']={'main':[
        [{'node':'Fin tras éxito HU-02 (#37)','type':'main','index':0}],
        [{'node':'Revisar pago (#38)','type':'main','index':0}],
    ]}
    return workflow


if __name__ == '__main__':
    output=ROOT/'workflows/03-abonos-distancia-registro.json'
    output.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
