// Code: Run Once for All Items. Solo agrega cobros; no recalcula saldos.
const fecha = $('Calcular día').first().json.fecha;
if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Fecha de cierre inválida');
const medios = ['efectivo', 'tarjeta', 'bizum'];
function sumar(nombre) {
  const result = {efectivo: 0, tarjeta: 0, bizum: 0, total: 0, operaciones: 0};
  const ids = new Set();
  for (const item of $(nombre).all()) {
    const row = item.json;
    if (row && !Array.isArray(row) && Object.keys(row).length === 0) continue;
    if (!row || !Number.isInteger(row.id) || row.id <= 0 ||
        typeof row.importe !== 'number' || !Number.isFinite(row.importe) || row.importe <= 0 ||
        !medios.includes(row.forma_pago)) throw new Error(`${nombre}: cobro inválido (id, importe o forma de pago)`);
    if (ids.has(row.id)) throw new Error(`${nombre}: id duplicado ${row.id}`);
    ids.add(row.id);
    if (row.fecha !== fecha) throw new Error(`${nombre}: fecha distinta del cierre`);
    const cents = Math.round(row.importe * 100);
    if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - row.importe) > 1e-9) throw new Error(`${nombre}: importe inválido`);
    result[row.forma_pago] += cents;
    result.total += cents;
    if (!Number.isSafeInteger(result.total)) throw new Error(`${nombre}: importe inválido, desbordamiento`);
    result.operaciones++;
  }
  return result;
}
const ventas = sumar('Leer ventas del día');
const abonos = sumar('Leer abonos del día');
const total = {operaciones: ventas.operaciones + abonos.operaciones};
for (const key of [...medios, 'total']) {
  total[key] = ventas[key] + abonos[key];
  if (!Number.isSafeInteger(total[key])) throw new Error('Total inválido, desbordamiento');
}
const fila = {fecha};
for (const [prefix, values] of [['ventas', ventas], ['abonos', abonos]]) {
  for (const key of [...medios, 'total']) fila[`${prefix}_${key}`] = values[key] / 100;
  fila[`${prefix}_operaciones`] = values.operaciones;
}
for (const key of medios) fila[`total_${key}`] = total[key] / 100;
fila.total = total.total / 100;
fila.operaciones = total.operaciones;
fila.sin_movimientos = total.operaciones === 0;
const amount = cents => (cents / 100).toFixed(2);
const cell = 'border:1px solid #d5dce2;padding:9px;text-align:right;white-space:nowrap';
const tableRows = [['Ventas directas', ventas], ['Abonos', abonos], ['Total', total]].map(([label, values]) =>
  `<tr><th style="${cell};text-align:left" scope="row">${label}</th>${[...medios, 'total'].map(key => `<td style="${cell}">${amount(values[key])} €</td>`).join('')}<td style="${cell}">${values.operaciones}</td></tr>`).join('');
const asunto = `Cierre de ${fecha}: ${amount(total.total)} € recaudados`;
const html = `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#203344;margin:24px"><h1 style="font-size:22px">Cierre diario · ${fecha}</h1><p>Hola, equipo de la tienda:</p>${fila.sin_movimientos ? `<p><strong>No hubo movimientos el ${fecha}.</strong></p>` : '<p>Estos son los cobros registrados en la app para el día completo.</p>'}<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:14px"><caption style="text-align:left;margin-bottom:10px">Importes en euros. Incluye los abonos iniciales.</caption><thead><tr>${['Concepto','Efectivo','Tarjeta','Bizum','Total','Nº'].map(label => `<th scope="col" style="${cell};background:#e8f0f6">${label}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></div><p>Ventas directas y abonos se cuentan por separado. Histórico guardado con la fecha del cierre.</p></body></html>`;
return [{json: {...fila, fila, asunto, html}}];
