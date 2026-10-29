const p = $('Preparar correo').item.json;
const revisar = motivo => ({json:{...p,ruta:'revisar',motivo}});
if ($json.error || $json.statusCode !== 200) throw new Error('Error técnico al extraer con Groq; revisar ejecución antes de continuar');
let data;
try {data=JSON.parse($json.body?.choices?.[0]?.message?.content);} catch {return revisar('La IA no devolvió un JSON válido');}
if (!data || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'concepto,importe,ordenante' ||
 typeof data.ordenante !== 'string' || typeof data.concepto !== 'string' || typeof data.importe !== 'number' ||
 !Number.isFinite(data.importe) || data.importe <= 0) return revisar('Extracción incompleta o esquema inválido');
// Source comparison prevents prompt injection or hallucinations changing the payment.
if (data.ordenante.trim() !== p.fuente.ordenante || data.concepto.trim() !== p.fuente.concepto || data.importe !== p.fuente.importe)
 return revisar('La extracción no coincide con los campos del aviso bancario');
const ids = [...data.concepto.matchAll(/\bapartado\s*(?:n[º°o.]?\s*)?#?\s*(\d+)\b/gi)];
if (ids.length > 1) return revisar('El concepto contiene varios números de apartado');
const apartado_id = ids.length ? Number(ids[0][1]) : null;
if (apartado_id !== null && (!Number.isSafeInteger(apartado_id) || apartado_id <= 0)) return revisar('Número de apartado inválido');
// Short ASCII prefix avoids the SQL LIKE accent mismatch (LUC matches Lucía).
const first = data.ordenante.split(/\s+/)[0];
const prefix = (first.match(/^[a-z]+/i)?.[0] || '').slice(0,2);
const url_busqueda = apartado_id !== null ? 'http://tienda:8000/api/apartados/'+apartado_id :
 'http://tienda:8000/api/apartados?estado=activo&q='+encodeURIComponent(prefix);
return {json:{referencia:p.referencia,asunto:p.asunto,...data,apartado_id,url_busqueda,ruta:'buscar'}};
