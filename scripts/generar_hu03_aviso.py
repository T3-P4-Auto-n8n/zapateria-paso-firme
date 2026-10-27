"""Genera el aviso de revisión manual HU-03 (#38)."""
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT=Path(__file__).resolve().parents[1]


def node(name,kind,params,position,version=1,**extra):
    return {'name':name,'id':str(uuid5(NAMESPACE_URL,'pasofirme/hu03/aviso/'+name)),
            'type':'n8n-nodes-base.'+kind,'typeVersion':version,'position':position,
            'parameters':params,**extra}


MESSAGE_CODE=r'''// #38: avisar al equipo de la tienda con lo necesario para revisar; no reenviar el correo bancario.
const e = $json;
const safe = (value, limit = 300) => String(value ?? '').replace(/[\x00-\x1f\x7f]+/g,' ').replace(/\b(?:bcc|cc|to|from)\s*:\s*[^\s]+/gi,'[contenido omitido]').replace(/\s+/g,' ').trim().slice(0,limit);
let source = {};
try { source = $('Normalizar entrada de correo').item.json || {}; } catch { /* datos de entrada no disponibles */ }
const original = safe(source.asunto,1000) + ' ' + safe(source.cuerpo,20000);
const normalized = original.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const medio = safe(e.medio) || (normalized.includes('bizum') ? 'Bizum' : (normalized.includes('transferencia') ? 'Transferencia' : 'No identificado'));
const motivo = safe(e.motivo || e.motivo_decision || 'El pago requiere revisión manual');
const ordenante = safe(e.ordenante || 'No identificado');
const concepto = safe(e.concepto || 'No indicado');
const referencia = safe(e.referencia || 'No disponible',300);
const importe = Number(e.importe);
const importeTexto = Number.isFinite(importe) ? new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(importe) + ' €' : 'No identificado';
const candidates = Array.isArray(e.candidatos) ? e.candidatos : (e.apartado && typeof e.apartado === 'object' ? [e.apartado] : []);
const shown = candidates.slice(0,20);
const lines = shown.map(a => `- #${safe(a.id,20)} · ${safe(a.cliente || 'Cliente desconocido')} · ${safe(a.producto || 'Producto desconocido')}${a.talla ? ' · talla ' + safe(a.talla,30) : ''} · pendiente ${Number.isFinite(Number(a.pendiente)) ? new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(a.pendiente)) + ' €' : 'desconocido'} · límite ${safe(a.fecha_limite || 'desconocido',30)} · estado ${safe(a.estado || 'desconocido',30)}`).join('\n');
const candidatosTexto = lines || 'No hay candidatos disponibles.';
const adicionales = candidates.length > shown.length ? `\nHay ${candidates.length - shown.length} candidatos más; revisar la ejecución.` : '';
const text = `Hola, equipo de la tienda:\n\nHa llegado un pago que no he registrado. Revísalo y, si procede, regístralo manualmente en la app.\n\nMotivo: ${motivo}\nOrdenante: ${ordenante}\nImporte: ${importeTexto}\nMétodo indicado: ${medio}\nConcepto: ${concepto}\nReferencia: ${referencia}\n\nApartados candidatos:\n${candidatosTexto}${adicionales}\n\nNo vuelvas a registrar el pago hasta confirmar que no se haya aplicado ya.`;
return {json:{...e,asunto:'Pago recibido para revisar',text}};
'''


def build():
    workflow=json.loads((ROOT/'workflows/03-abonos-distancia-registro.json').read_text())
    workflow['name']='03 · Abonos a distancia (aviso de revisión)'
    form=next(n for n in workflow['nodes'] if n['type'].endswith('.formTrigger'))
    form['parameters']['options']['path']='hu03-aviso-revision'
    form['webhookId']=str(uuid5(NAMESPACE_URL,'pasofirme/hu03/aviso/form'))
    form['parameters']['formDescription']='HU-03 · Borrador de prueba inactivo; el correo solo se envía al buzón Mailpit local.'
    note=next(n for n in workflow['nodes'] if n['type'].endswith('.stickyNote'))
    note['name']='Notas de aviso HU-03'
    note['parameters']['content']=('## HU-03 · Aviso de revisión (#38)\nBorrador parcial e inactivo. Asignar Groq, API Tienda y Mailpit; '
        'seleccionar el 08 local en Settings. Solo las ramas de revisión envían un correo de texto a Mailpit; no se reenvía el '
        'mensaje bancario ni se registra un abono desde esta etapa. Probar solo con los correos ficticios.')
    workflow['nodes'].extend([
        node('Preparar aviso de revisión (#38)','code',{'mode':'runOnceForEachItem','jsCode':MESSAGE_CODE},[5300,50],2),
        node('Avisar a la tienda para revisar el pago','emailSend',{
            'fromEmail':'tienda@pasofirme.example','toEmail':'tienda@pasofirme.example',
            'subject':'={{ $json.asunto }}','emailFormat':'text','text':'={{ $json.text }}',
            'options':{'appendAttribution':False},
        },[5550,50],2.1,credentials={'smtp':{'id':None,'name':'Mailpit'}}),
    ])
    for source in ('Revisar entrada inválida','Revisar extracción (#38)','Revisar pago (#38)'):
        workflow['connections'][source]={'main':[[{'node':'Preparar aviso de revisión (#38)','type':'main','index':0}]]}
    workflow['connections']['Preparar aviso de revisión (#38)']={'main':[[{'node':'Avisar a la tienda para revisar el pago','type':'main','index':0}]]}
    return workflow


if __name__=='__main__':
    output=ROOT/'workflows/03-abonos-distancia-aviso.json'
    output.write_text(json.dumps(build(),ensure_ascii=False,indent=2)+'\n')
    print(output.relative_to(ROOT))
