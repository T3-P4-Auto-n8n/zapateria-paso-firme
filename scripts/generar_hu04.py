"""Genera el export inactivo HU-04 (solo biblioteca estándar).

Uso: python3 scripts/generar_hu04.py
La tabla local de n8n se llama `Cierres`; las credenciales API y SMTP se seleccionan en n8n.
"""
import argparse
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5
ROOT = Path(__file__).resolve().parents[1]
HEADERS = ['fecha', 'ventas_efectivo', 'ventas_tarjeta', 'ventas_bizum', 'ventas_total', 'ventas_operaciones', 'abonos_efectivo', 'abonos_tarjeta', 'abonos_bizum', 'abonos_total', 'abonos_operaciones', 'total_efectivo', 'total_tarjeta', 'total_bizum', 'total', 'operaciones', 'sin_movimientos']
def build():
    handler = json.loads((ROOT / 'workflows/08-error-workflow.json').read_text())
    nodes, connections = [], {}
    def node(name, kind, parameters, x, y, version=1, **extra):
        nodes.append(dict(name=name, type='n8n-nodes-base.'+kind, typeVersion=version,
            id=str(uuid5(NAMESPACE_URL, 'pasofirme/hu04/'+name)), position=[x,y], parameters=parameters, **extra))
    def link(a,b):
        connections[a]={'main':[[{'node':b,'type':'main','index':0}]]}
    node('Cada noche a las 00:05','scheduleTrigger',{'rule':{'interval':[{'field':'cronExpression','expression':'5 0 * * *'}]}},0,-120,1.4)
    node('Elegir día','formTrigger',{'formTitle':'Cierre diario','formDescription':'Elige la fecha del cierre (día completo). Guardará el histórico y enviará un correo de prueba a Mailpit.',
        'formFields':{'values':[{'fieldLabel':'fecha','fieldType':'date','requiredField':True}]},'options':{'path':'hu04-cierre-diario','appendAttribution':False}},0,120,2.2,
        webhookId=str(uuid5(NAMESPACE_URL,'pasofirme/hu04/form')))
    node('Calcular día','code',{'mode':'runOnceForAllItems','jsCode':(ROOT/'scripts/hu04/calcular-dia.js').read_text()},240,0,2)
    for i,(name,endpoint) in enumerate([('Leer ventas del día','ventas'),('Leer abonos del día','abonos')]):
        node(name,'httpRequest',{'method':'GET','url':'http://tienda:8000/api/'+endpoint,'authentication':'genericCredentialType','genericAuthType':'httpHeaderAuth',
            'sendQuery':True,'queryParameters':{'parameters':[{'name':key,'value':"={{ $('Calcular día').first().json."+key+" }}"} for key in ['desde','hasta']]},
            'options':{'timeout':30000}},480+i*240,0,4.2,executeOnce=True,alwaysOutputData=True,credentials={'httpHeaderAuth':{'id':None,'name':'API Tienda'}})
    node('Preparar cierre','code',{'mode':'runOnceForAllItems','jsCode':(ROOT/'scripts/hu04/preparar-cierre.js').read_text()},960,0,2)
    schema=[{'id':key,'displayName':key,'required':False,'defaultMatch':False,'display':True,'type':'string' if key=='fecha' else ('boolean' if key=='sin_movimientos' else 'number'),'readOnly':False,'removed':False} for key in HEADERS]
    node('Guardar cierre en Cierres','dataTable',{'resource':'row','operation':'upsert',
        'dataTableId':{'__rl':True,'mode':'name','value':'Cierres'},
        'matchType':'allConditions','filters':{'conditions':[{'keyName':'fecha','keyValue':'={{ $json.fila.fecha }}'}]},
        'columns':{'mappingMode':'defineBelow','value':{key:'={{ $json.fila.'+key+' }}' for key in HEADERS},'matchingColumns':[], 'schema':schema,'attemptToConvertTypes':False,'convertFieldsToString':False},
        'options':{}},1200,0,1.1,retryOnFail=False)
    node('Enviar cierre diario','emailSend',{'fromEmail':'tienda@pasofirme.example','toEmail':'tienda@pasofirme.example','emailFormat':'html',
        'subject':"={{ $('Preparar cierre').first().json.asunto }}",'html':"={{ $('Preparar cierre').first().json.html }}",'options':{'appendAttribution':False}},1440,0,2.1,
        credentials={'smtp':{'id':None,'name':'Mailpit'}},retryOnFail=False)
    link('Cada noche a las 00:05','Calcular día');link('Elegir día','Calcular día')
    chain=['Calcular día','Leer ventas del día','Leer abonos del día','Preparar cierre','Guardar cierre en Cierres','Enviar cierre diario']
    for a,b in zip(chain,chain[1:]):link(a,b)
    return {'name':'05 · Cierre diario','nodes':nodes,'connections':connections,'settings':{'executionOrder':'v1','timezone':'Europe/Madrid','errorWorkflow':handler['id'],'saveManualExecutions':True,'saveDataSuccessExecution':'all','saveDataErrorExecution':'all'},'active':False,'tags':[]}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.parse_args()
    target=ROOT/'workflows/05-cierre-diario.json'
    target.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print(target.relative_to(ROOT))
