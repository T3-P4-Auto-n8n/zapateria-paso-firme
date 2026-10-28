// Run once for each item. Never replace or recompute any original financial detail.
const base = $('Preparar redacción del recordatorio').item.json;
const { prompt_ia, ...original } = base;
const fallback = () => ({ json: { ...original, redaccion_ia: 'plantilla' } });
const response = $json;
if (response.statusCode !== 200 || response.error) return fallback();
let content;
try {
  const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  content = JSON.parse(body.choices[0].message.content);
} catch { return fallback(); }
if (!content || typeof content !== 'object' || Array.isArray(content) || Object.keys(content).sort().join(',') !== 'despedida,introduccion') return fallback();
const forbidden = /\b(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieci\w*|veint\w*|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien\w*|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil\w*|billon\w*|cero|medio|media|mitad|doble|triple|primero|ultimo|importe|saldo|pendiente|plazo\w*|fecha\w*|vence\w*|vencim\w*|paga\w*|pago\w*|abono\w*|descuent\w*|gratis|gratuit\w*|cost\w*|euro\w*|centim\w*|dia\w*|manana|semana\w*|mes\w*|ano\w*|hoy|ayer|hora\w*|minuto\w*|dinero|porcentaje\w*)\b/iu;
const safe = value => {
  if (typeof value !== 'string' || value.length < 10 || value.length > 180 || /[^\p{L}\p{M} ,.!¡¿?;:()\-]/u.test(value)) return false;
  const normalized = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return !forbidden.test(normalized);
};
if (!safe(content.introduccion) || !safe(content.despedida)) return fallback();
return { json: { ...original, texto: `${content.introduccion}\n\n${original.texto}\n\n${content.despedida}`, redaccion_ia: 'aceptada' } };
