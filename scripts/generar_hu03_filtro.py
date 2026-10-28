"""Exportar solo #32 + #33; sin IA, escrituras de API ni notificaciones."""
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]

def build():
    workflow = json.loads((ROOT / 'workflows/03-abonos-distancia-entrada.json').read_text())
    workflow['name'] = '03 · Abonos a distancia (filtro)'
    form = next(n for n in workflow['nodes'] if n['type'].endswith('.formTrigger'))
    form['parameters']['options']['path'] = 'hu03-filtro'
    form['webhookId'] = str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/filtro/form'))
    form['parameters']['formDescription'] = 'HU-03 · Prueba de entrada y filtro. Solo datos ficticios; esta etapa no registra pagos ni envía recibos.'
    note = next(n for n in workflow['nodes'] if n['type'].endswith('.stickyNote'))
    note['parameters']['content'] = '## HU-03 · Filtro (#33)\nExportación parcial e inactiva.\nFormulario: Test URL, referencia/asunto/cuerpo. IMAP deshabilitado hasta seleccionar credencial de pruebas.\nEl Switch separa extraer, ignorar y revisar. Las salidas terminan en nodos sin acciones: #34 añadirá IA y #38 el aviso de revisión.\nVer docs/hu03-filtro.md. No publicar sin revisión.'
    def node(name, kind, params, x, y, version=1):
        return {'name':name,'id':str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/filtro/'+name)),
                'type':'n8n-nodes-base.'+kind,'typeVersion':version,'position':[x,y],'parameters':params}
    workflow['nodes'].append(node('Filtrar aviso bancario','code',{'mode':'runOnceForEachItem',
        'jsCode':(ROOT/'scripts/hu03/filtro.js').read_text()},560,100,2))
    rules=[]
    for route in ['extraer','ignorar','revisar']:
        rules.append({'conditions':{'options':{'caseSensitive':True,'leftValue':'','typeValidation':'strict','version':2},
                      'conditions':[{'leftValue':'={{ $json.ruta }}','rightValue':route,'operator':{'type':'string','operation':'equals'}}],
                      'combinator':'and'},'renameOutput':True,'outputKey':route})
    workflow['nodes'].append(node('¿Es un pago?','switch',{'rules':{'values':rules},'options':{'fallbackOutput':'extra'}},800,100,3.2))
    targets=['Continuar con extracción (#34)','Ignorar publicidad','Revisar entrada inválida']
    for i,target in enumerate(targets):workflow['nodes'].append(node(target,'noOp',{},1050,-40+i*140))
    def link(source, destinations):
        workflow['connections'][source]={'main':[[{'node':target,'type':'main','index':0}] for target in destinations]}
    link('Normalizar entrada de correo',['Filtrar aviso bancario'])
    link('Filtrar aviso bancario',['¿Es un pago?'])
    link('¿Es un pago?',targets+[targets[-1]])
    return workflow

if __name__ == '__main__':
    output=ROOT/'workflows/03-abonos-distancia-filtro.json'
    output.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
