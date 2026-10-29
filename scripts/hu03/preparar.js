// Code node, run once for each item. Only labelled payment fields leave for Groq.
const asunto = String($json.asunto ?? $json.subject ?? '').trim();
const cuerpo = String($json.cuerpo ?? $json.textPlain ?? $json.text ?? '').trim();
const referencia = String($json.referencia ?? $json.messageId ?? $json.metadata?.['message-id'] ?? '').trim();
const base = {referencia, asunto};
const revisar = motivo => ({json:{...base,ruta:'revisar',motivo}});
if (!cuerpo || cuerpo.length > 20000 || referencia.length > 300) return revisar('Correo vacío, demasiado largo o referencia inválida');
const text = asunto + '\n' + cuerpo;
if (!/(?:has recibido un bizum|transferencia (?:recibida|en su cuenta)|se ha abonado una transferencia)/i.test(text))
  return {json:{...base,ruta:'ignorar',motivo:'No es un aviso de pago reconocido'}};
if (!referencia) return revisar('Falta referencia única del correo; no registrar sin trazabilidad');
function field(label) {
  const matches = [...cuerpo.matchAll(new RegExp('^' + label + '[ \\t]*(?::|\\.{2,})[ \\t]*([^\\r\\n]*)','gmi'))];
  return matches.length === 1 ? matches[0][1].trim() : null;
}
const ordenante = field('Ordenante'), importeTexto = field('Importe'), concepto = field('Concepto');
if (!ordenante || importeTexto === null || concepto === null) return revisar('Faltan campos bancarios o hay campos duplicados');
const amount = importeTexto.match(/^(\d+(?:[.,]\d{1,2})?)\s*(EUR|€)$/i);
if (!amount || !Number.isFinite(Number(amount[1].replace(',','.'))) || Number(amount[1].replace(',','.')) <= 0)
  return revisar('Importe inválido o moneda distinta de EUR');
if (ordenante.length > 150 || concepto.length > 300) return revisar('Campos bancarios demasiado largos');
return {json:{...base,ruta:'extraer',fuente:{ordenante,importe:Number(amount[1].replace(',','.')),concepto},
  texto_ia:JSON.stringify({ordenante,importe:importeTexto,concepto})}};
