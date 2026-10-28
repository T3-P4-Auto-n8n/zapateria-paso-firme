"""Genera la etapa determinista de decisión de HU-03 (#36)."""
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]


def node(name, kind, params, position, version=1):
    return {'name': name, 'id': str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/decision/' + name)),
            'type': 'n8n-nodes-base.' + kind, 'typeVersion': version,
            'position': position, 'parameters': params}


DECISION_CODE = r'''// #36: comparar identidad, concepto y reglas de negocio; no registrar.
const e = $('Validar extracción').item.json;
const revisar = (motivo, candidatos = []) => ({json:{...e,decision:'revisar',motivo_decision:motivo,candidatos}});
const status = Number($json.statusCode);
if (status === 401 || status >= 500) throw new Error('Error técnico en GET de apartados (HTTP ' + status + ')');
if (status === 404 && e.apartado_id !== null) return revisar('El apartado indicado en el concepto no existe; no se buscará otro automáticamente');
if (status !== 200) throw new Error('Error técnico en GET de apartados (HTTP ' + status + ')');
if (typeof e.concepto !== 'string' || !e.concepto.trim()) return revisar('El aviso no incluye concepto suficiente para identificar el apartado');
const body = $json.body;
const candidatos = Array.isArray(body) ? body : (body && typeof body === 'object' && !Array.isArray(body) ? [body] : []);
if (!candidatos.length) return revisar('La API no devolvió apartados candidatos');
if (e.apartado_id !== null && candidatos.some(a => Number(a.id) !== Number(e.apartado_id)))
  return revisar('La respuesta de API no coincide con el ID explícito del concepto', candidatos);
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const nameTokens = value => norm(value).split(/\s+/).filter(Boolean);
const payer = nameTokens(e.ordenante);
const matchesIdentity = a => {
  const customer = nameTokens(a.cliente);
  return customer.length > 0 && payer.length > 0 && customer.every(token => payer.some(p => p === token || (p.length === 1 && token.startsWith(p))));
};
const ignored = new Set(['abono','abonos','pago','pagos','bizum','transferencia','transferencias','apartado','apartados','numero','num','n','de','del','la','las','el','los','por','para','favor','mi','liquidar','liquida','pedido']);
const stem = token => token.length > 5 && token.endsWith('es') ? token.slice(0,-2) : (token.length > 4 && token.endsWith('s') ? token.slice(0,-1) : token);
const concept = nameTokens(e.concepto).filter(t => !ignored.has(t)).map(stem);
if (!concept.length) return revisar('El concepto no identifica ningún producto o referencia', candidatos);
const plausible = candidatos.filter(a => {
  if (e.apartado_id !== null && Number(a.id) !== Number(e.apartado_id)) return false;
  if (!matchesIdentity(a)) return false;
  const product = nameTokens(a.producto).map(stem);
  return concept.some(token => product.includes(token));
});
if (!plausible.length) return revisar('No hay un apartado que coincida claramente con ordenante y concepto', candidatos);
if (plausible.length !== 1) return revisar('Hay varios apartados posibles; se requiere revisión manual', plausible);
const apartado = plausible[0];
if (apartado.estado !== 'activo') return revisar('El apartado no está activo (' + String(apartado.estado ?? 'estado desconocido') + ')', plausible);
const limite = typeof apartado.fecha_limite === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(apartado.fecha_limite) ? apartado.fecha_limite : '';
const hoy = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date());
if (!limite) return revisar('La fecha límite del apartado no es válida', plausible);
if (hoy > limite) return revisar('El apartado está fuera de plazo desde ' + limite, plausible);
const importe = Number(e.importe), pendiente = Number(apartado.pendiente);
if (!Number.isFinite(importe) || importe <= 0 || !Number.isFinite(pendiente) || pendiente < 0)
  return revisar('El importe o el pendiente recibido de la API no es válido', plausible);
if (Math.round(importe * 100) > Math.round(pendiente * 100))
  return revisar('El importe supera lo pendiente (' + pendiente + ' €)', plausible);
return {json:{...e,decision:'registrar',motivo_decision:'Coincidencia única; apartado activo, en plazo y con saldo suficiente',apartado,candidatos:plausible}};
'''


def build():
    workflow = json.loads((ROOT / 'workflows/03-abonos-distancia-busqueda.json').read_text())
    workflow['name'] = '03 · Abonos a distancia (decisión)'
    form = next(n for n in workflow['nodes'] if n['type'].endswith('.formTrigger'))
    form['parameters']['options']['path'] = 'hu03-decision'
    form['webhookId'] = str(uuid5(NAMESPACE_URL, 'pasofirme/hu03/decision/form'))
    form['parameters']['formDescription'] = 'HU-03 · Prueba local de decisión. No registra abonos ni envía avisos.'
    note = next(n for n in workflow['nodes'] if n['type'].endswith('.stickyNote'))
    note['name'] = 'Notas de decisión HU-03'
    note['parameters']['content'] = ('## HU-03 · Decisión (#36)\nBorrador parcial e inactivo. Asignar credenciales Groq y API Tienda; '
        'seleccionar el 08 local en Settings. IMAP sigue deshabilitado. Esta etapa solo compara candidatos y reglas; '
        'no registra pagos ni envía email. Revisar docs/hu03-decision.md.')
    handoff = next(n for n in workflow['nodes'] if n['name'] == 'Resultados de búsqueda (#36)')
    handoff['name'] = 'Resultados de búsqueda'
    for connection in workflow['connections'].values():
        for outputs in connection.get('main', []):
            for target in outputs:
                if target['node'] == 'Resultados de búsqueda (#36)':
                    target['node'] = 'Resultados de búsqueda'
    workflow['nodes'].extend([
        node('Decidir apartado (#36)', 'code', {'mode':'runOnceForEachItem','jsCode':DECISION_CODE}, [3050,-150], 2),
        node('¿Se puede registrar? (#36)', 'switch', {
            'rules': {'values': [{'conditions': {'options': {'caseSensitive': True,'leftValue':'','typeValidation':'strict','version':2},
                'conditions': [{'leftValue':'={{ $json.decision }}','rightValue':'registrar','operator':{'type':'string','operation':'equals'}}],
                'combinator':'and'},'renameOutput':True,'outputKey':'registrar'}]},
            'options': {'fallbackOutput':'extra'}
        }, [3300,-150], 3.2),
        node('Continuar con registro (#37)', 'noOp', {}, [3550,-150]),
        node('Revisar pago (#38)', 'noOp', {}, [3550,50]),
    ])
    workflow['connections'].pop('Resultados de búsqueda (#36)', None)
    workflow['connections']['Resultados de búsqueda'] = {'main': [[{'node':'Decidir apartado (#36)','type':'main','index':0}]]}
    workflow['connections']['Decidir apartado (#36)'] = {'main': [[{'node':'¿Se puede registrar? (#36)','type':'main','index':0}]]}
    workflow['connections']['¿Se puede registrar? (#36)'] = {'main': [
        [{'node':'Continuar con registro (#37)','type':'main','index':0}],
        [{'node':'Revisar pago (#38)','type':'main','index':0}],
    ]}
    return workflow


if __name__ == '__main__':
    output = ROOT / 'workflows/03-abonos-distancia-decision.json'
    output.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    print(output.relative_to(ROOT))
